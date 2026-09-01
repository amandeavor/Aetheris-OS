// SPDX-License-Identifier: GPL-3.0-or-later
// File: velocityinstall/src-tauri/src/partition.rs
// Rust partition backend for Aetheris OS Installer using parted/cryptsetup and Btrfs layout.

use std::process::Command;
use std::fs;
use std::path::Path;
use std::io::Read;
use serde::{Serialize, Deserialize};
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DiskInfo {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub model: String,
    pub is_read_only: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PartitionLayoutResult {
    pub success: bool,
    pub error: Option<String>,
    pub root_device: String,
}

// 1. Detect BitLocker signature on a partition
#[tauri::command]
pub fn check_bitlocker(app_handle: AppHandle, device_path: String) -> Result<bool, String> {
    let mut file = fs::File::open(&device_path).map_err(|e| format!("Failed to open device: {}", e))?;
    let mut header = [0u8; 512];
    file.read_exact(&mut header).map_err(|e| format!("Failed to read partition header: {}", e))?;

    // BitLocker Signature at offset 3: 0xEB 0x52 0x90 0x2D 0x46 0x56 0x45 ("-FVE")
    let bitlocker_sig = [0xEB, 0x52, 0x90, 0x2D, 0x46, 0x56, 0x45];
    let is_bitlocker = header[3..10] == bitlocker_sig;
    if is_bitlocker {
        app_handle.emit("bitlocker-detected", true).ok();
    }
    Ok(is_bitlocker)
}

// 2. Perform NTFS volume resize using ntfsresize
#[tauri::command]
pub fn resize_ntfs_partition(device_path: String, new_size_bytes: u64) -> Result<bool, String> {
    println!("Resizing NTFS partition {} to {} bytes...", device_path, new_size_bytes);

    // 1. Dry run with --no-action to verify clean status
    let check_status = Command::new("ntfsresize")
        .args(&["--no-action", "--size", &format!("{}", new_size_bytes), &device_path])
        .status()
        .map_err(|e| format!("Failed to execute ntfsresize precheck: {}", e))?;

    if !check_status.success() {
        return Err("NTFS volume is dirty or cannot be resized. Run chkdsk in Windows first.".into());
    }

    // 2. Perform actual resize
    let resize_status = Command::new("ntfsresize")
        .args(&["--size", &format!("{}", new_size_bytes), &device_path])
        .status()
        .map_err(|e| format!("Failed to execute ntfsresize: {}", e))?;

    if !resize_status.success() {
        return Err("Failed to resize NTFS volume".into());
    }

    Ok(true)
}

// 3. List available storage disks
#[tauri::command]
pub fn get_disks() -> Result<Vec<DiskInfo>, String> {
    let mut disks = Vec::new();
    let sys_block = Path::new("/sys/block");

    if !sys_block.exists() {
        // Fallback or testing stub for non-Linux hosts
        return Ok(vec![DiskInfo {
            name: "sda".into(),
            path: "/dev/sda".into(),
            size_bytes: 1000204886016, // 1TB
            model: "Seagate Laptop Thin SSHD".into(),
            is_read_only: false,
        }]);
    }

    let entries = fs::read_dir(sys_block).map_err(|e| format!("Failed to read block devices: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Dir entry error: {}", e))?;
        let name = entry.file_name().to_string_lossy().into_owned();

        // Filter out loop devices, ram devices, and virtual/device-mapper blocks
        if name.starts_with("loop") || name.starts_with("ram") || name.starts_with("dm-") {
            continue;
        }

        let device_path = format!("/dev/{}", name);
        let sys_path = entry.path();

        // Read size in sectors (512 bytes per sector usually)
        let size_str = fs::read_to_string(sys_path.join("size")).unwrap_or_default();
        let size_sectors: u64 = size_str.trim().parse().unwrap_or(0);
        let size_bytes = size_sectors * 512;

        if size_bytes == 0 {
            continue;
        }

        // Read model
        let model = fs::read_to_string(sys_path.join("device/model"))
            .unwrap_or_else(|_| "Unknown Storage Device".to_string())
            .trim()
            .to_string();

        // Read read-only status
        let ro_str = fs::read_to_string(sys_path.join("ro")).unwrap_or_default();
        let is_read_only = ro_str.trim() == "1";

        disks.push(DiskInfo {
            name,
            path: device_path,
            size_bytes,
            model,
            is_read_only,
        });
    }

    Ok(disks)
}

// 2. Formats disk and sets up GPT, EFI, and Root partitions (optionally LUKS2 encrypted)
#[tauri::command]
pub fn create_partition_layout(disk_path: String, password: Option<String>) -> Result<PartitionLayoutResult, String> {
    println!("Creating partition layout on disk: {}", disk_path);

    // Initialize GPT label using parted
    let status = Command::new("parted")
        .args(&["-s", &disk_path, "mklabel", "gpt"])
        .status()
        .map_err(|e| format!("Failed to run parted mklabel: {}", e))?;

    if !status.success() {
        return Err("parted mklabel gpt failed".into());
    }

    // Create EFI Partition (512MB)
    let status = Command::new("parted")
        .args(&["-s", &disk_path, "mkpart", "primary", "fat32", "1MiB", "513MiB"])
        .status()
        .map_err(|e| format!("Failed to create EFI partition: {}", e))?;

    if !status.success() {
        return Err("Failed to allocate EFI partition".into());
    }

    // Set EFI boot/esp flags
    Command::new("parted")
        .args(&["-s", &disk_path, "set", "1", "esp", "on"])
        .status()
        .ok();

    // Create Root Partition (rest of disk)
    let status = Command::new("parted")
        .args(&["-s", &disk_path, "mkpart", "primary", "btrfs", "513MiB", "100%"])
        .status()
        .map_err(|e| format!("Failed to create root partition: {}", e))?;

    if !status.success() {
        return Err("Failed to allocate root partition".into());
    }

    // Identify partition devices (e.g. /dev/sda1, /dev/sda2 or /dev/nvme0n1p1, /dev/nvme0n1p2)
    let is_nvme = disk_path.contains("nvme") || disk_path.contains("mmcblk");
    let efi_part = if is_nvme { format!("{}p1", disk_path) } else { format!("{}1", disk_path) };
    let root_part = if is_nvme { format!("{}p2", disk_path) } else { format!("{}2", disk_path) };

    // Format EFI Partition as FAT32
    let status = Command::new("mkfs.vfat")
        .args(&["-F32", &efi_part])
        .status()
        .map_err(|e| format!("Failed to format EFI partition: {}", e))?;

    if !status.success() {
        return Err("mkfs.vfat failed".into());
    }

    let mut final_root = root_part.clone();

    // Setup LUKS2 Encryption if password is provided
    if let Some(pass) = password {
        println!("Encrypting root partition: {}", root_part);

        // Write password to temporary file or pipe to cryptsetup
        let mut crypt_cmd = Command::new("cryptsetup");
        crypt_cmd.args(&[
            "luksFormat",
            "--type", "luks2",
            "--pbkdf", "argon2id",
            &root_part
        ]);

        // Feed password into cryptsetup via stdin
        let mut child = crypt_cmd
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to launch cryptsetup: {}", e))?;

        {
            use std::io::Write;
            let stdin = child.stdin.as_mut().ok_or("Failed to open cryptsetup stdin")?;
            stdin.write_all(pass.as_bytes()).ok();
            stdin.write_all(b"\n").ok();
        }

        let crypt_status = child.wait().map_err(|e| format!("cryptsetup wait error: {}", e))?;
        if !crypt_status.success() {
            return Err("LUKS2 format failed".into());
        }

        // Open the encrypted device
        let mut open_cmd = Command::new("cryptsetup");
        open_cmd.args(&["open", &root_part, "aetheris_crypt"]);

        let mut open_child = open_cmd
            .stdin(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to open LUKS container: {}", e))?;

        {
            use std::io::Write;
            let stdin = open_child.stdin.as_mut().ok_or("Failed to open stdin for cryptsetup open")?;
            stdin.write_all(pass.as_bytes()).ok();
            stdin.write_all(b"\n").ok();
        }

        let open_status = open_child.wait().ok();
        if open_status.map_or(false, |s| s.success()) {
            final_root = "/dev/mapper/aetheris_crypt".to_string();

            // Try to bind the LUKS2 container key to TPM2 registers PCR 7 + 15
            // Using systemd-cryptenroll if available
            println!("Attempting TPM2 enrollment for automatic Secure Boot unlock...");
            Command::new("systemd-cryptenroll")
                .args(&["--tpm2-device=auto", "--tpm2-pcrs=7+15", &root_part])
                .status()
                .ok();
        } else {
            return Err("Failed to map encrypted volume".into());
        }
    }

    // Format final root target as Btrfs
    let status = Command::new("mkfs.btrfs")
        .args(&["-f", &final_root])
        .status()
        .map_err(|e| format!("Failed to format Btrfs root: {}", e))?;

    if !status.success() {
        return Err("mkfs.btrfs failed".into());
    }

    Ok(PartitionLayoutResult {
        success: true,
        error: None,
        root_device: final_root,
    })
}

// 3. Create Btrfs subvolumes for snap-backups, logs, home files
#[tauri::command]
pub fn create_btrfs_subvolumes(root_device: String, mount_target: String) -> Result<bool, String> {
    println!("Creating Btrfs subvolume layout on {} at {}", root_device, mount_target);

    let temp_mount = "/tmp/aetheris_btrfs_setup";
    fs::create_dir_all(temp_mount).ok();

    // Mount root Btrfs filesystem temporarily
    let status = Command::new("mount")
        .args(&[&root_device, temp_mount])
        .status()
        .map_err(|e| format!("Mount error: {}", e))?;

    if !status.success() {
        return Err("Failed to mount Btrfs device for subvolume creation".into());
    }

    // Define standard macOS-like subvolumes
    let subvolumes = vec!["@root", "@home", "@snapshots", "@log", "@cache"];
    for subvol in subvolumes {
        let subvol_path = format!("{}/{}", temp_mount, subvol);
        Command::new("btrfs")
            .args(&["subvolume", "create", &subvol_path])
            .status()
            .ok();
    }

    // Unmount temporary path
    Command::new("umount").arg(temp_mount).status().ok();
    fs::remove_dir(temp_mount).ok();

    Ok(true)
}
