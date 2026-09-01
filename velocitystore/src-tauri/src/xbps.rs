// SPDX-License-Identifier: GPL-3.0-or-later
// File: velocitystore/src-tauri/src/xbps.rs
// Rust FFI bindings and progress tracking wrapper for Void Linux's libxbps C library.

use std::ffi::{CString, CStr};
use std::os::raw::{c_char, c_int, c_void};
use std::thread;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

// 1. Core libxbps C FFI declarations (Void Linux native headers)
#[repr(C)]
pub struct XbpsHandle {
    pub rootdir: [c_char; 4096],
    pub metadir: [c_char; 4096],
    pub cachedir: [c_char; 4096],
    // Remaining fields are internal to libxbps
}

#[link(name = "xbps")]
extern "C" {
    // Initialize the libxbps handle
    pub fn xbps_init(xh: *mut XbpsHandle) -> c_int;

    // Release libxbps handle and deallocate resources
    pub fn xbps_end(xh: *mut XbpsHandle);

    // Query package database and invoke callback for each package
    pub fn xbps_pkgdb_foreach_cb(
        xh: *mut XbpsHandle,
        cb: Option<extern "C" fn(pkg: *mut c_void, arg: *mut c_void) -> c_int>,
        arg: *mut c_void
    ) -> c_int;

    // Queue package installation inside transaction
    pub fn xbps_transaction_install_pkg(xh: *mut XbpsHandle, pkgname: *const c_char) -> c_int;

    // Queue package removal inside transaction
    pub fn xbps_transaction_remove_pkg(xh: *mut XbpsHandle, pkgname: *const c_char) -> c_int;

    // Commit current queued transaction package actions
    pub fn xbps_transaction_commit(xh: *mut XbpsHandle) -> c_int;

    // Fetch package dictionary version property
    pub fn xbps_dictionary_get_string(pkg: *mut c_void, key: *const c_char, val: *mut *const c_char) -> c_int;
}

#[derive(Serialize, Clone, Debug)]
pub struct ProgressPayload {
    pub package: String,
    pub action: String,
    pub percentage: i32,
}

#[derive(Serialize, Clone, Debug)]
pub struct InstalledPkgInfo {
    pub name: String,
    pub version: String,
}

// Callback invoked by xbps_pkgdb_foreach_cb for listing installed packages
extern "C" fn xbps_pkg_list_callback(pkg: *mut c_void, arg: *mut c_void) -> c_int {
    unsafe {
        let mut name_ptr: *const c_char = std::ptr::null();
        let mut version_ptr: *const c_char = std::ptr::null();

        let name_key = CString::new("pkgname").unwrap();
        let version_key = CString::new("version").unwrap();

        xbps_dictionary_get_string(pkg, name_key.as_ptr(), &mut name_ptr);
        xbps_dictionary_get_string(pkg, version_key.as_ptr(), &mut version_ptr);

        if !name_ptr.is_null() && !version_ptr.is_null() {
            let name = CStr::from_ptr(name_ptr).to_string_lossy().into_owned();
            let version = CStr::from_ptr(version_ptr).to_string_lossy().into_owned();

            let pkgs_list = &mut *(arg as *mut Vec<InstalledPkgInfo>);
            pkgs_list.push(InstalledPkgInfo { name, version });
        }
    }
    0
}

// 2. High-level package listing Tauri Command querying the system pkgdb
#[tauri::command]
pub fn list_installed_packages() -> Result<Vec<InstalledPkgInfo>, String> {
    unsafe {
        let mut xh: XbpsHandle = std::mem::zeroed();

        // Initialize libxbps handle
        if xbps_init(&mut xh) != 0 {
            return Err("Failed to initialize libxbps handle".into());
        }

        let mut pkgs_list: Vec<InstalledPkgInfo> = Vec::new();
        let list_ptr = &mut pkgs_list as *mut Vec<InstalledPkgInfo> as *mut c_void;

        // Traverse installed packages database
        xbps_pkgdb_foreach_cb(&mut xh, Some(xbps_pkg_list_callback), list_ptr);

        xbps_end(&mut xh);
        Ok(pkgs_list)
    }
}

// 3. High-level package installation Tauri Command calling transaction pipeline
#[tauri::command]
pub fn install_package(app_handle: AppHandle, pkg_name: String) -> Result<bool, String> {
    println!("XBPS FFI: Requesting installation of package: {}", pkg_name);

    thread::spawn(move || {
        unsafe {
            let mut xh: XbpsHandle = std::mem::zeroed();

            if xbps_init(&mut xh) != 0 {
                app_handle.emit("xbps-error", "Failed to initialize libxbps handle".to_string()).ok();
                return;
            }

            let pkg_c = CString::new(pkg_name.clone()).unwrap();

            // Queue package in transaction
            if xbps_transaction_install_pkg(&mut xh, pkg_c.as_ptr()) != 0 {
                app_handle.emit("xbps-error", format!("Failed to queue package: {}", pkg_name)).ok();
                xbps_end(&mut xh);
                return;
            }

            // Emit downloading progress state
            app_handle.emit("xbps-progress", ProgressPayload {
                package: pkg_name.clone(),
                action: "downloading".to_string(),
                percentage: 50,
            }).ok();

            // Commit transaction actions
            if xbps_transaction_commit(&mut xh) != 0 {
                app_handle.emit("xbps-error", format!("Failed to commit transaction: {}", pkg_name)).ok();
                xbps_end(&mut xh);
                return;
            }

            app_handle.emit("xbps-progress", ProgressPayload {
                package: pkg_name.clone(),
                action: "unpacking".to_string(),
                percentage: 90,
            }).ok();

            xbps_end(&mut xh);

            // Complete transaction state
            app_handle.emit("xbps-complete", pkg_name).ok();
        }
    });

    Ok(true)
}

// 4. High-level package removal Tauri Command
#[tauri::command]
pub fn remove_package(app_handle: AppHandle, pkg_name: String) -> Result<bool, String> {
    println!("XBPS FFI: Requesting removal of package: {}", pkg_name);

    thread::spawn(move || {
        unsafe {
            let mut xh: XbpsHandle = std::mem::zeroed();

            if xbps_init(&mut xh) != 0 {
                app_handle.emit("xbps-error", "Failed to initialize libxbps handle".to_string()).ok();
                return;
            }

            let pkg_c = CString::new(pkg_name.clone()).unwrap();

            // Queue package removal inside transaction
            if xbps_transaction_remove_pkg(&mut xh, pkg_c.as_ptr()) != 0 {
                app_handle.emit("xbps-error", format!("Failed to queue package for removal: {}", pkg_name)).ok();
                xbps_end(&mut xh);
                return;
            }

            // Emit removing progress state
            app_handle.emit("xbps-progress", ProgressPayload {
                package: pkg_name.clone(),
                action: "removing".to_string(),
                percentage: 50,
            }).ok();

            // Commit transaction actions
            if xbps_transaction_commit(&mut xh) != 0 {
                app_handle.emit("xbps-error", format!("Failed to commit removal transaction: {}", pkg_name)).ok();
                xbps_end(&mut xh);
                return;
            }

            app_handle.emit("xbps-progress", ProgressPayload {
                package: pkg_name.clone(),
                action: "configuring".to_string(),
                percentage: 90,
            }).ok();

            xbps_end(&mut xh);

            // Complete transaction state
            app_handle.emit("xbps-complete", pkg_name).ok();
        }
    });

    Ok(true)
}
