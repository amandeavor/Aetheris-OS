// File: velocityinstall/src-tauri/src/main.rs
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod partition;

use std::fs;
use std::path::Path;
use serde::Deserialize;
use std::process::Command;
use landlock::{Ruleset, ABI, AccessFs, PathBeneath, PathFd};

fn restrict_filesystem() -> Result<(), Box<dyn std::error::Error>> {
    let abi = landlock::compatible_abi();
    let mut ruleset = Ruleset::new(abi)?;

    let read_access = AccessFs::ReadFile | AccessFs::ReadDir | AccessFs::Execute;
    let write_access = AccessFs::ReadFile | AccessFs::ReadDir | AccessFs::Execute | AccessFs::WriteFile | AccessFs::RemoveFile | AccessFs::RemoveDir;

    // ReadOnly directories
    let readonly_paths = ["/usr", "/lib", "/lib64", "/etc"];
    for path in readonly_paths {
        if let Ok(fd) = PathFd::new(path) {
            ruleset.add_rule(PathBeneath::new(fd, read_access))?;
        }
    }

    // ReadWrite directories
    let readwrite_paths = ["/tmp", "/run", "/var/log"];
    for path in readwrite_paths {
        if let Ok(fd) = PathFd::new(path) {
            ruleset.add_rule(PathBeneath::new(fd, write_access))?;
        }
    }

    let _status = ruleset.restrict_self()?;
    Ok(())
}

fn apply_landlock_sandbox() {
    if let Err(e) = restrict_filesystem() {
        eprintln!("Landlock sandbox check: {}", e);
    }
}

#[derive(Deserialize)]
struct AutoInstallConfig {
    install: InstallConfig,
    user: UserConfig,
}

#[derive(Deserialize)]
struct InstallConfig {
    target_disk: String,
    partition_strategy: String,
    encryption: bool,
    encryption_passphrase: Option<String>,
    wipe: bool,
    locale: String,
    timezone: String,
}

#[derive(Deserialize)]
struct UserConfig {
    username: String,
    password_hash: String,
}

fn check_and_run_autoinstall() {
    let autoinstall_path = Path::new("/boot/autoinstall.toml");
    if !autoinstall_path.exists() {
        return;
    }

    println!("OOBE: OEM autoinstall.toml found. Initiating silent installation...");

    // Write setup logs
    fs::create_dir_all("/var/log").ok();
    fs::write("/var/log/aetheris-install.log", "Starting silent installation...\n").ok();

    // Parse TOML
    if let Ok(content) = fs::read_to_string(autoinstall_path) {
        if let Ok(config) = toml::from_str::<AutoInstallConfig>(&content) {
            let log_msg = format!(
                "Target Disk: {}\nLocale: {}\nTimezone: {}\nWipe: {}\n",
                config.install.target_disk, config.install.locale, config.install.timezone, config.install.wipe
            );
            fs::write("/var/log/aetheris-install.log", log_msg).ok();

            // Execute partition layout
            let layout_res = partition::create_partition_layout(
                config.install.target_disk.clone(),
                if config.install.encryption { config.install.encryption_passphrase.clone() } else { None }
            );

            match layout_res {
                Ok(res) => {
                    fs::write("/var/log/aetheris-install.log", "Partitioning complete. Creating Btrfs subvolumes...\n").ok();
                    // Setup Btrfs subvolumes
                    if config.install.partition_strategy == "btrfs" {
                        partition::create_btrfs_subvolumes(res.root_device, "/mnt".to_string()).ok();
                    }

                    fs::write("/var/log/aetheris-install.log", "Installation complete. Rebooting...\n").ok();
                    // Trigger reboot on completion
                    Command::new("reboot").spawn().ok();
                    std::process::exit(0);
                }
                Err(e) => {
                    let err_msg = format!("Silent autoinstall failed: {}\n", e);
                    fs::write("/var/log/aetheris-install.log", err_msg).ok();
                    std::process::exit(1);
                }
            }
        }
    }
}

fn main() {
    // Apply Landlock filesystem restrictions
    apply_landlock_sandbox();

    // Check for OEM preseeded automated installation first
    check_and_run_autoinstall();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            partition::get_disks,
            partition::create_partition_layout,
            partition::create_btrfs_subvolumes,
            partition::check_bitlocker,
            partition::resize_ntfs_partition
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
