// File: chwd_port/src/main.rs
mod install_engine;
mod pci_profile;
mod pci_scan;

use pci_profile::{find_matching_profile, find_matching_usb_profile, DriverProfile};
use std::fs;
use std::process::Command;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum ChassisType {
    Notebook,
    Desktop,
}

fn detect_chassis_type() -> ChassisType {
    if let Ok(chassis_str) = fs::read_to_string("/sys/class/dmi/id/chassis_type") {
        if let Ok(val) = chassis_str.trim().parse::<i32>() {
            if val == 8 || val == 9 || val == 10 || val == 11 {
                return ChassisType::Notebook;
            }
        }
    }
    ChassisType::Desktop
}

fn get_device_name(address: &str) -> String {
    let path = format!("/sys/bus/pci/devices/{}/uevent", address);
    if let Ok(uevent) = fs::read_to_string(&path) {
        for line in uevent.lines() {
            if line.starts_with("PCI_ID=") {
                return line.replace("PCI_ID=", "");
            }
        }
    }
    String::new()
}

fn apply_profile_with_prime_logic(
    profile_name: &str,
    profile: &DriverProfile,
    is_notebook: bool,
    dev_vendor: &str,
    dev_device: &str,
) {
    // Execute pre_install hook
    if let Some(ref pre_cmd) = profile.pre_install {
        println!("  Executing pre-install hook for {}...", profile_name);
        let status = Command::new("sh").arg("-c").arg(pre_cmd).status();
        if let Err(e) = status {
            eprintln!("  Warning: Failed to execute pre-install hook: {}", e);
        }
    }

    // Parse packages and services lists
    let mut packages: Vec<String> = profile
        .packages
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    let mut services: Vec<String> = profile
        .services
        .as_ref()
        .map(|s| s.split_whitespace().map(|s| s.to_string()).collect())
        .unwrap_or_default();

    // If it's a notebook chassis and this is a graphics driver, make sure switcheroo-control is present
    if is_notebook
        && (profile.class_ids.as_ref().map_or(false, |c| {
            c.contains(&"0300".to_string()) || c.contains(&"0302".to_string())
        }))
    {
        if !packages.contains(&"switcheroo-control".to_string()) {
            packages.push("switcheroo-control".to_string());
        }
        if !services.contains(&"switcheroo-control".to_string()) {
            services.push("switcheroo-control".to_string());
        }

        // Write PRIME offload udev rule
        println!("  Notebook chassis: Deploying udev rule for PRIME offload...");
        fs::create_dir_all("/etc/udev/rules.d").ok();
        let rules_content = format!(
            "# Configure PRIME offload for discrete GPU\nACTION==\"add\", SUBSYSTEM==\"pci\", ATTR{{vendor}}==\"0x{}\", ATTR{{device}}==\"0x{}\", ATTR{{power/control}}=\"auto\"\n",
            dev_vendor.to_lowercase(), dev_device.to_lowercase()
        );
        if let Err(e) = fs::write("/etc/udev/rules.d/80-prime-offload.rules", rules_content) {
            eprintln!("  Warning: Failed to write udev rule: {}", e);
        }
    }

    println!("  Installing packages: {:?}", packages);
    if !services.is_empty() {
        println!("  Enabling runit services: {:?}", services);
    }

    match install_engine::apply_profile(&packages, &services) {
        Ok(_) => {
            println!("  Successfully applied driver profile {}.", profile_name);

            // Execute post_install hook
            if let Some(ref post_cmd) = profile.post_install {
                println!("  Executing post-install hook for {}...", profile_name);
                let status = Command::new("sh").arg("-c").arg(post_cmd).status();
                if let Err(e) = status {
                    eprintln!("  Warning: Failed to execute post-install hook: {}", e);
                }
            }
        }
        Err(e) => {
            eprintln!("  Error: Failed to apply driver profile: {}", e);
        }
    }
}

fn main() {
    println!("Aetheris OS Hardware Detection Module");

    let chassis = detect_chassis_type();
    let is_notebook = chassis == ChassisType::Notebook;
    println!("Detected Chassis Type: {:?}", chassis);

    // 1. Scan PCI devices
    let pci_devices = match pci_scan::scan_pci_bus() {
        Ok(devs) => devs,
        Err(e) => {
            eprintln!("Failed to scan PCI bus: {}", e);
            std::process::exit(1);
        }
    };

    // 2. Scan USB devices
    let usb_devices = pci_scan::scan_usb_bus().unwrap_or_default();

    println!(
        "Detected {} PCI devices and {} USB devices.",
        pci_devices.len(),
        usb_devices.len()
    );

    // 3. Load driver profiles
    let system_profile_dir = "/usr/share/chwd/profiles/pci";
    let local_profile_dir = "profiles";

    let profiles = match pci_profile::load_profiles(system_profile_dir) {
        Ok(p) => {
            if p.is_empty() {
                pci_profile::load_profiles(local_profile_dir).unwrap_or_default()
            } else {
                p
            }
        }
        Err(_) => pci_profile::load_profiles(local_profile_dir).unwrap_or_default(),
    };

    println!("Loaded {} driver profiles.", profiles.len());

    // 4. Resolve and apply PCI profiles
    for dev in &pci_devices {
        let device_name = get_device_name(&dev.address);
        let name_to_match = if device_name.is_empty() {
            &dev.device_id
        } else {
            &device_name
        };

        println!(
            "PCI Device {}: Vendor ID = {}, Device ID = {}, Class = {}",
            dev.address, dev.vendor_id, dev.device_id, dev.class_id
        );

        // Find standard match
        let matched_opt = find_matching_profile(dev, &profiles, name_to_match);
        if let Some((profile_name, profile)) = matched_opt {
            let mut selected_name = profile_name;
            let mut selected_profile = profile;

            // If on a notebook, try to prefer a .prime variant of the GPU driver profile
            if is_notebook
                && (selected_profile.class_ids.as_ref().map_or(false, |c| {
                    c.contains(&"0300".to_string()) || c.contains(&"0302".to_string())
                }))
            {
                let prime_name = format!("{}.prime", selected_name);
                if let Some((_, prime_prof)) = profiles.iter().find(|(name, _)| name == &prime_name)
                {
                    println!(
                        "  -> Notebook detected, switching to PRIME profile: {}",
                        prime_name
                    );
                    selected_name = prime_name;
                    selected_profile = prime_prof.clone();
                }
            }

            println!(
                "  -> Matched driver profile: {} ({})",
                selected_name, selected_profile.desc
            );
            apply_profile_with_prime_logic(
                &selected_name,
                &selected_profile,
                is_notebook,
                &dev.vendor_id,
                &dev.device_id,
            );
        } else {
            println!("  -> No specific driver profile matched. Device will use generic/fallback drivers.");
        }
    }

    // 5. Resolve and apply USB profiles
    for dev in &usb_devices {
        println!(
            "USB Device {}: Vendor ID = {}, Product ID = {}",
            dev.address, dev.vendor_id, dev.product_id
        );
        if let Some((profile_name, profile)) = find_matching_usb_profile(dev, &profiles) {
            println!(
                "  -> Matched USB driver profile: {} ({})",
                profile_name, profile.desc
            );
            apply_profile_with_prime_logic(
                &profile_name,
                &profile,
                is_notebook,
                &dev.vendor_id,
                &dev.product_id,
            );
        }
    }
}
