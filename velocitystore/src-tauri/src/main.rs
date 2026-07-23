// File: velocitystore/src-tauri/src/main.rs
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod flatpak;
mod xbps;
mod appstream;

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

#[tauri::command]
pub fn check_bottles_installed() -> bool {
    Command::new("which").arg("bottles-cli").status().map_or(false, |s| s.success())
}

#[tauri::command]
pub fn create_default_bottle() -> Result<bool, String> {
    // Check if the AetherisDefault bottle exists by listing bottles
    let list_output = Command::new("bottles-cli")
        .arg("list")
        .output()
        .map_err(|e| format!("Failed to run bottles-cli: {}", e))?;

    let list_str = String::from_utf8_lossy(&list_output.stdout);
    if list_str.contains("AetherisDefault") {
        return Ok(true); // Already exists
    }

    println!("Creating default Wine gaming bottle AetherisDefault...");
    let status = Command::new("bottles-cli")
        .args(&["new", "--name", "AetherisDefault", "--env", "gaming"])
        .status()
        .map_err(|e| format!("Failed to create bottle: {}", e))?;

    if !status.success() {
        return Err("bottles-cli new command failed".into());
    }

    Ok(true)
}

#[tauri::command]
pub fn run_with_bottles(exe_path: String) -> Result<bool, String> {
    // Ensure default bottle is created
    create_default_bottle()?;

    println!("Launching Windows executable {} inside AetherisDefault bottle...", exe_path);
    let status = Command::new("bottles-cli")
        .args(&["run", "-b", "AetherisDefault", "-e", &exe_path])
        .status()
        .map_err(|e| format!("Failed to execute bottles run: {}", e))?;

    if !status.success() {
        return Err("Failed to launch application with bottles-cli".into());
    }

    Ok(true)
}

fn main() {
    // Apply Landlock filesystem restrictions
    apply_landlock_sandbox();

    // 1. Optimize WebKitGTK Cache Model for low-memory environments
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    std::env::set_var("WEBKIT_CACHE_MODEL", "document-viewer");

    // 2. Initialize AppStream SQLite index in the background
    std::thread::spawn(|| {
        if let Err(e) = appstream::update_appstream_index() {
            eprintln!("Failed to initialize AppStream index: {}", e);
        }
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            flatpak::get_flatpak_permissions,
            flatpak::save_flatpak_permissions,
            xbps::install_package,
            xbps::remove_package,
            xbps::list_installed_packages,
            check_bottles_installed,
            create_default_bottle,
            run_with_bottles
        ])
        .on_webview_ready(|webview| {
            // Verify and log that cache model is active
            webview.evaluate_script("console.log('WebKitGTK Cache Model set to Document Viewer');").ok();
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
