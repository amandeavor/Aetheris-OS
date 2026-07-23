// File: chwd_port/src/pci_profile.rs
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
pub use crate::pci_scan::PciDevice;
use regex::Regex;

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum DeviceIds {
    Wildcard(String),
    List(Vec<String>),
}

#[derive(Debug, Clone, Deserialize)]
pub struct DriverProfile {
    pub desc: String,
    pub priority: i32,
    pub class_ids: Option<Vec<String>>,
    pub vendor_ids: Option<Vec<String>>,
    pub device_ids: Option<DeviceIds>,
    pub usb_ids: Option<Vec<String>>, // Format: "vendor:product"
    pub packages: String,
    pub services: Option<String>,
    pub pre_install: Option<String>,
    pub post_install: Option<String>,
    pub device_name_pattern: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UsbDevice {
    pub address: String,
    pub vendor_id: String,
    pub product_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ProfileCollection {
    #[serde(flatten)]
    pub profiles: HashMap<String, DriverProfile>,
}

pub fn load_profiles<P: AsRef<Path>>(dir: P) -> Result<Vec<(String, DriverProfile)>, String> {
    let mut all_profiles = Vec::new();
    let path = dir.as_ref();
    if !path.exists() {
        return Ok(all_profiles);
    }

    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read profiles dir: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Dir entry error: {}", e))?;
        let file_path = entry.path();
        if file_path.extension().map_or(false, |ext| ext == "toml") {
            let content = fs::read_to_string(&file_path)
                .map_err(|e| format!("Failed to read profile {:?}: {}", file_path, e))?;
            let collection: ProfileCollection = toml::from_str(&content)
                .map_err(|e| format!("Failed to parse TOML {:?}: {}", file_path, e))?;
            for (name, profile) in collection.profiles {
                all_profiles.push((name, profile));
            }
        }
    }
    Ok(all_profiles)
}

pub fn find_matching_profile(
    device: &PciDevice,
    profiles: &[(String, DriverProfile)],
    device_name: &str,
) -> Option<(String, DriverProfile)> {
    let mut matched: Option<(String, DriverProfile)> = None;

    for (name, profile) in profiles {
        // Skip USB-only profiles for PCI matching
        if profile.class_ids.is_none() && profile.usb_ids.is_some() {
            continue;
        }

        // 1. Class ID Matching
        if let Some(ref class_ids) = profile.class_ids {
            if !class_ids.iter().any(|c| c == &device.class_id) {
                continue;
            }
        }

        // 2. Vendor ID Matching
        if let Some(ref vendor_ids) = profile.vendor_ids {
            if !vendor_ids.iter().any(|v| v == &device.vendor_id) {
                continue;
            }
        }

        // 3. Device ID Matching
        let mut device_matched = false;
        if let Some(ref device_ids) = profile.device_ids {
            match device_ids {
                DeviceIds::Wildcard(w) => {
                    if w == "*" {
                        device_matched = true;
                    }
                }
                DeviceIds::List(list) => {
                    if list.iter().any(|d| d == &device.device_id) {
                        device_matched = true;
                    }
                }
            }
        } else {
            // If device_ids not specified but vendor/class matched, default to true
            device_matched = true;
        }

        if !device_matched {
            continue;
        }

        // 4. Device Name Pattern (Regex) Matching
        if let Some(ref pattern) = profile.device_name_pattern {
            if let Ok(re) = Regex::new(pattern) {
                if !re.is_match(device_name) {
                    continue;
                }
            } else {
                continue;
            }
        }

        // Priority check
        if let Some((_, ref existing)) = matched {
            if profile.priority > existing.priority {
                matched = Some((name.clone(), profile.clone()));
            }
        } else {
            matched = Some((name.clone(), profile.clone()));
        }
    }

    matched
}

pub fn find_matching_usb_profile(
    device: &UsbDevice,
    profiles: &[(String, DriverProfile)],
) -> Option<(String, DriverProfile)> {
    let mut matched: Option<(String, DriverProfile)> = None;

    for (name, profile) in profiles {
        if let Some(ref usb_ids) = profile.usb_ids {
            let id = format!("{}:{}", device.vendor_id, device.product_id);
            if usb_ids.iter().any(|u| u == &id) {
                if let Some((_, ref existing)) = matched {
                    if profile.priority > existing.priority {
                        matched = Some((name.clone(), profile.clone()));
                    }
                } else {
                    matched = Some((name.clone(), profile.clone()));
                }
            }
        }
    }

    matched
}
