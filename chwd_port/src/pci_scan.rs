// SPDX-License-Identifier: GPL-3.0-or-later
// File: chwd_port/src/pci_scan.rs
use std::fs;
use std::path::Path;

#[derive(Debug)]
pub struct PciDevice {
    pub address: String,
    pub vendor_id: String,
    pub device_id: String,
    pub class_id: String,
}

pub fn scan_pci_bus() -> Result<Vec<PciDevice>, std::io::Error> {
    let mut devices = Vec::new();
    let sys_bus_pci = Path::new("/sys/bus/pci/devices");

    if sys_bus_pci.exists() {
        for entry in fs::read_dir(sys_bus_pci)? {
            let entry = entry?;
            let path = entry.path();
            let address = entry.file_name().to_string_lossy().into_owned();

            // Query vendor, device, and class registers from sysfs paths
            let vendor = fs::read_to_string(path.join("vendor"))?
                .trim()
                .replace("0x", "");
            let device = fs::read_to_string(path.join("device"))?
                .trim()
                .replace("0x", "");
            let class = fs::read_to_string(path.join("class"))?
                .trim()
                .replace("0x", "");

            // Extract the 4-digit base hardware class code
            let class_code = if class.len() >= 6 {
                class[2..6].to_string()
            } else {
                class.clone()
            };

            devices.push(PciDevice {
                address,
                vendor_id: vendor,
                device_id: device,
                class_id: class_code,
            });
        }
    }
    Ok(devices)
}

pub fn scan_usb_bus() -> Result<Vec<crate::pci_profile::UsbDevice>, std::io::Error> {
    let mut devices = Vec::new();
    let sys_bus_usb = Path::new("/sys/bus/usb/devices");

    if sys_bus_usb.exists() {
        for entry in fs::read_dir(sys_bus_usb)? {
            let entry = entry?;
            let path = entry.path();
            let address = entry.file_name().to_string_lossy().into_owned();

            let vendor_path = path.join("idVendor");
            let product_path = path.join("idProduct");

            if vendor_path.exists() && product_path.exists() {
                let vendor = fs::read_to_string(vendor_path)
                    .unwrap_or_default()
                    .trim()
                    .to_string();
                let product = fs::read_to_string(product_path)
                    .unwrap_or_default()
                    .trim()
                    .to_string();

                if !vendor.is_empty() && !product.is_empty() {
                    devices.push(crate::pci_profile::UsbDevice {
                        address,
                        vendor_id: vendor,
                        product_id: product,
                    });
                }
            }
        }
    }
    Ok(devices)
}
