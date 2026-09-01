// SPDX-License-Identifier: GPL-3.0-or-later
// File: chwd_port/src/install_engine.rs
use std::ffi::CString;
use std::fs;
use std::os::raw::{c_char, c_int};

#[repr(C)]
pub struct XbpsHandle {
    pub rootdir: [c_char; 4096],
    pub metadir: [c_char; 4096],
    pub cachedir: [c_char; 4096],
}

#[link(name = "xbps")]
extern "C" {
    // Initialize the libxbps handle
    pub fn xbps_init(xh: *mut XbpsHandle) -> c_int;

    // Release libxbps handle and deallocate resources
    pub fn xbps_end(xh: *mut XbpsHandle);

    // Queue package installation inside transaction
    pub fn xbps_transaction_install_pkg(xh: *mut XbpsHandle, pkgname: *const c_char) -> c_int;

    // Commit current queued transaction package actions
    pub fn xbps_transaction_commit(xh: *mut XbpsHandle) -> c_int;
}

pub fn apply_profile(packages: &[String], services: &[String]) -> Result<(), String> {
    // 1. Execute package installations using native XBPS bindings via FFI
    unsafe {
        let mut xh: XbpsHandle = std::mem::zeroed();

        if xbps_init(&mut xh) != 0 {
            return Err("Failed to initialize libxbps handle".into());
        }

        for pkg in packages {
            let pkg_c = CString::new(pkg.clone())
                .map_err(|e| format!("Invalid package name structure: {}", e))?;

            if xbps_transaction_install_pkg(&mut xh, pkg_c.as_ptr()) != 0 {
                xbps_end(&mut xh);
                return Err(format!("Failed to queue package in transaction: {}", pkg));
            }
        }

        if xbps_transaction_commit(&mut xh) != 0 {
            xbps_end(&mut xh);
            return Err("Failed to commit package installation transaction".into());
        }

        xbps_end(&mut xh);
    }

    // 2. Configure target runit service linkages to enable drivers on boot
    for service in services {
        let sv_path = format!("/etc/sv/{}", service);
        let run_path = format!("/var/service/{}", service);

        if fs::metadata(&sv_path).is_ok() {
            #[cfg(unix)]
            {
                if let Err(e) = std::os::unix::fs::symlink(&sv_path, &run_path) {
                    if e.kind() != std::io::ErrorKind::AlreadyExists {
                        return Err(format!("Failed to activate runit system mapping: {}", e));
                    }
                }
            }
            #[cfg(not(unix))]
            {
                // Fallback stub for building on non-unix target operating systems
                let _ = &run_path;
                let _ = &sv_path;
            }
        }
    }
    Ok(())
}
