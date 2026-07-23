// File: velocitystore/src-tauri/src/flatpak.rs
// Custom Rust INI parser to manage Flatpak application sandbox overrides.

use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FlatpakPermissions {
    pub app_id: String,
    pub filesystems: HashMap<String, bool>, // path -> allowed (true) or blocked (false)
    pub sockets: HashMap<String, bool>,     // socket -> allowed (true) or blocked (false)
    pub devices: HashMap<String, bool>,     // device -> allowed (true) or blocked (false)
}

fn get_override_path(app_id: &str, is_system: bool) -> PathBuf {
    if is_system {
        PathBuf::from(format!("/var/lib/flatpak/overrides/{}", app_id))
    } else {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
        PathBuf::from(format!("{}/.local/share/flatpak/overrides/{}", home, app_id))
    }
}

// 1. Read flatpak overrides INI file and parse permissions
#[tauri::command]
pub fn get_flatpak_permissions(app_id: String, is_system: bool) -> Result<FlatpakPermissions, String> {
    let path = get_override_path(&app_id, is_system);
    let mut perms = FlatpakPermissions {
        app_id,
        filesystems: HashMap::new(),
        sockets: HashMap::new(),
        devices: HashMap::new(),
    };

    if !path.exists() {
        return Ok(perms);
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read flatpak override file: {}", e))?;

    let mut current_section = String::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with(';') || trimmed.starts_with('#') {
            continue;
        }

        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            current_section = trimmed[1..trimmed.len() - 1].to_string();
            continue;
        }

        if current_section == "Context" {
            if let Some(pos) = trimmed.find('=') {
                let key = trimmed[..pos].trim();
                let val = trimmed[pos + 1..].trim();
                let items: Vec<&str> = val.split(';').filter(|s| !s.is_empty()).collect();

                match key {
                    "filesystems" => {
                        for item in items {
                            if item.starts_with('!') {
                                perms.filesystems.insert(item[1..].to_string(), false);
                            } else {
                                perms.filesystems.insert(item.to_string(), true);
                            }
                        }
                    }
                    "sockets" => {
                        for item in items {
                            if item.starts_with('!') {
                                perms.sockets.insert(item[1..].to_string(), false);
                            } else {
                                perms.sockets.insert(item.to_string(), true);
                            }
                        }
                    }
                    "devices" => {
                        for item in items {
                            if item.starts_with('!') {
                                perms.devices.insert(item[1..].to_string(), false);
                            } else {
                                perms.devices.insert(item.to_string(), true);
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(perms)
}

// 2. Write updated permissions back to the flatpak overrides INI file
#[tauri::command]
pub fn save_flatpak_permissions(perms: FlatpakPermissions, is_system: bool) -> Result<bool, String> {
    let path = get_override_path(&perms.app_id, is_system);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    let mut output = String::new();
    output.push_str("[Context]\n");

    // Write Filesystems overrides
    if !perms.filesystems.is_empty() {
        let mut fs_str = String::new();
        for (fs_path, allowed) in &perms.filesystems {
            if *allowed {
                fs_str.push_str(&format!("{};", fs_path));
            } else {
                fs_str.push_str(&format!("!{};", fs_path));
            }
        }
        output.push_str(&format!("filesystems={}\n", fs_str));
    }

    // Write Sockets overrides
    if !perms.sockets.is_empty() {
        let mut sock_str = String::new();
        for (sock, allowed) in &perms.sockets {
            if *allowed {
                sock_str.push_str(&format!("{};", sock));
            } else {
                sock_str.push_str(&format!("!{};", sock));
            }
        }
        output.push_str(&format!("sockets={}\n", sock_str));
    }

    // Write Devices overrides
    if !perms.devices.is_empty() {
        let mut dev_str = String::new();
        for (dev, allowed) in &perms.devices {
            if *allowed {
                dev_str.push_str(&format!("{};", dev));
            } else {
                dev_str.push_str(&format!("!{};", dev));
            }
        }
        output.push_str(&format!("devices={}\n", dev_str));
    }

    fs::write(&path, output)
        .map_err(|e| format!("Failed to write flatpak override file: {}", e))?;

    Ok(true)
}
