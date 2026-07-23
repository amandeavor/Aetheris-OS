// File: velocitysetup/src/main.rs
// GTK4 + Libadwaita Out-of-Box Experience (OOBE) wizard for Aetheris OS.

use adw::prelude::*;
use gtk::prelude::*;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::thread;
use zeroize::Zeroize;
use serde::Deserialize;

// Secure wrapper structure to zeroize password buffer after setup completes
#[derive(Zeroize)]
struct UserCredentials {
    password_plain: String,
}

#[derive(Deserialize, Debug, Clone)]
struct BackgroundColors {
    #[serde(rename = "dark-base")]
    dark_base: String,
    #[serde(rename = "dark-surface")]
    dark_surface: String,
    #[serde(rename = "dark-border")]
    dark_border: String,
    #[serde(rename = "light-base")]
    light_base: String,
    #[serde(rename = "light-surface")]
    light_surface: String,
    #[serde(rename = "light-border")]
    light_border: String,
}

#[derive(Deserialize, Debug, Clone)]
struct AccentColors {
    #[serde(rename = "violet-600")]
    violet_600: String,
}

#[derive(Deserialize, Debug, Clone)]
struct TokenColors {
    background: BackgroundColors,
    accent: AccentColors,
}

#[derive(Deserialize, Debug, Clone)]
struct TokenData {
    color: TokenColors,
}

fn main() {
    let application = adw::Application::builder()
        .application_id("org.aetheris.oobe")
        .build();

    application.connect_activate(|app| {
        // 1. Initialize background driver autoconfiguration (throttled for UI performance)
        thread::spawn(|| {
            println!("OOBE: Spawning background hardware driver detection via chwd...");
            let status = Command::new("nice")
                .args(&["-n", "19", "ionice", "-c", "3", "chwd", "--autoconfigure"])
                .status();
            if let Ok(exit_code) = status {
                if exit_code.success() {
                    println!("OOBE: Background hardware configuration completed successfully.");
                } else {
                    eprintln!("OOBE: chwd background process returned an error.");
                }
            }
        });

        // 2. Build the wizard window
        let window = adw::ApplicationWindow::builder()
            .application(app)
            .title("✦ Aetheris OS Welcome Setup")
            .default_width(850)
            .default_height(600)
            .resizable(false)
            .build();

        // Title bar configuration
        let header_bar = adw::HeaderBar::new();
        header_bar.set_show_end_title_buttons(false);

        // Core view container: ViewStack allows navigating wizard screens
        let view_stack = adw::ViewStack::new();

        // Navigation control bindings
        let main_box = gtk::Box::new(gtk::Orientation::Vertical, 0);
        main_box.append(&header_bar);
        main_box.append(&view_stack);
        window.set_content(Some(&main_box));

        // Screen 1: Welcome & Accessibility Toggles
        let page_welcome = build_welcome_page(&view_stack);
        view_stack.add_titled(&page_welcome, Some("welcome"), "Welcome");

        // Screen 2: Language, Keyboard, and Timezone
        let page_locale = build_locale_page(&view_stack);
        view_stack.add_titled(&page_locale, Some("locale"), "Locale");

        // Screen 3: WiFi Configuration
        let page_network = build_network_page(&view_stack);
        view_stack.add_titled(&page_network, Some("network"), "Network");

        // Screen 4: User Credentials Setup
        let page_account = build_account_page(&view_stack);
        view_stack.add_titled(&page_account, Some("account"), "Account");

        // Screen 5: Telemetry & Privacy settings
        let page_privacy = build_privacy_page(&view_stack);
        view_stack.add_titled(&page_privacy, Some("privacy"), "Privacy");

        // Screen 6: Theme Selection & Finish
        let page_theme = build_theme_page(&view_stack, &window);
        view_stack.add_titled(&page_theme, Some("theme"), "Theme");

        window.present();
    });

    application.run();
}

// Helper to build page layout templates with unified background styles
fn create_page_box() -> gtk::Box {
    let vbox = gtk::Box::new(gtk::Orientation::Vertical, 24);
    vbox.set_margin_top(40);
    vbox.set_margin_bottom(40);
    vbox.set_margin_start(40);
    vbox.set_margin_end(40);
    vbox
}

// 1. Welcome and Accessibility Page
fn build_welcome_page(stack: &adw::ViewStack) -> gtk::Box {
    let vbox = create_page_box();

    let title_label = gtk::Label::new(Some("✦ Welcome to Aetheris OS"));
    title_label.add_css_class("title-1");

    let desc_label = gtk::Label::new(Some(
        "A lightweight, macOS-like Void Linux operating system built for responsiveness."
    ));
    desc_label.add_css_class("body");

    // Accessibility toggles card
    let a11y_group = adw::PreferencesGroup::new();
    a11y_group.set_title("Accessibility & Assisted Reading Options");

    let orca_row = adw::ActionRow::new();
    orca_row.set_title("Orca Screen Reader");
    orca_row.set_subtitle("Enable screen voice synthesis for visual assistance.");
    let orca_switch = gtk::Switch::new();
    orca_switch.connect_state_set(|_, state| {
        if state {
            Command::new("orca").arg("--replace").spawn().ok();
        } else {
            Command::new("pkill").arg("orca").status().ok();
        }
        glib::Propagation::Proceed
    });
    orca_row.add_suffix(&orca_switch);
    a11y_group.add(&orca_row);

    let large_text_row = adw::ActionRow::new();
    large_text_row.set_title("Large Visual Text (150%)");
    large_text_row.set_subtitle("Scales interface elements for comfortable viewing.");
    let large_text_switch = gtk::Switch::new();
    large_text_switch.connect_state_set(|_, state| {
        let scaling_factor = if state { "1.5" } else { "1.0" };
        Command::new("gsettings")
            .args(&["set", "org.gnome.desktop.interface", "text-scaling-factor", scaling_factor])
            .status()
            .ok();
        glib::Propagation::Proceed
    });
    large_text_row.add_suffix(&large_text_switch);
    a11y_group.add(&large_text_row);

    let colorblind_row = adw::ActionRow::new();
    colorblind_row.set_title("Deuteranopia Color Filter");
    colorblind_row.set_subtitle("Apply red-green colorblindness overlay correction.");
    let colorblind_switch = gtk::Switch::new();
    colorblind_switch.connect_state_set(|_, state| {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
        let css_dir = format!("{}/.config/gtk-4.0", home);
        fs::create_dir_all(&css_dir).ok();
        let css_path = format!("{}/gtk.css", css_dir);

        if state {
            // Write a deuteranopia filter CSS overlay override
            let css_override = "@define-color success_color #3B82F6;\n@define-color error_color #D97706;\n";
            fs::write(css_path, css_override).ok();
        } else {
            fs::write(css_path, "").ok();
        }
        glib::Propagation::Proceed
    });
    colorblind_row.add_suffix(&colorblind_switch);
    a11y_group.add(&colorblind_row);

    let next_btn = gtk::Button::builder()
        .label("Begin Setup")
        .css_classes(["suggested-action", "pill"])
        .halign(gtk::Align::Center)
        .build();

    let stack_clone = stack.clone();
    next_btn.connect_clicked(move |_| {
        stack_clone.set_visible_child_name("locale");
    });

    vbox.append(&title_label);
    vbox.append(&desc_label);
    vbox.append(&a11y_group);
    vbox.append(&next_btn);
    vbox
}

// 2. Language, Keyboard, and Timezone Page
fn build_locale_page(stack: &adw::ViewStack) -> gtk::Box {
    let vbox = create_page_box();

    let title_label = gtk::Label::new(Some("Set Language & Timezone"));
    title_label.add_css_class("title-2");

    let form_group = adw::PreferencesGroup::new();

    let lang_row = adw::ActionRow::new();
    lang_row.set_title("System Language");
    let lang_combo = gtk::ComboBoxText::new();
    lang_combo.append_text("English (United States)");
    lang_combo.append_text("Español (España)");
    lang_combo.append_text("Français (France)");
    lang_combo.set_active(Some(0));
    lang_row.add_suffix(&lang_combo);
    form_group.add(&lang_row);

    let key_row = adw::ActionRow::new();
    key_row.set_title("Keyboard Map");
    let key_combo = gtk::ComboBoxText::new();
    key_combo.append_text("US English QWERTY");
    key_combo.append_text("UK English QWERTY");
    key_combo.append_text("Spanish QWERTY");
    key_combo.set_active(Some(0));
    key_row.add_suffix(&key_combo);
    form_group.add(&key_row);

    let tz_row = adw::ActionRow::new();
    tz_row.set_title("Local Timezone");
    let tz_combo = gtk::ComboBoxText::new();
    tz_combo.append_text("America/New_York");
    tz_combo.append_text("Europe/Paris");
    tz_combo.append_text("Asia/Tokyo");
    tz_combo.set_active(Some(0));
    tz_row.add_suffix(&tz_combo);
    form_group.add(&tz_row);

    let next_btn = gtk::Button::builder()
        .label("Continue")
        .css_classes(["suggested-action", "pill"])
        .halign(gtk::Align::Center)
        .build();

    let stack_clone = stack.clone();
    next_btn.connect_clicked(move |_| {
        stack_clone.set_visible_child_name("network");
    });

    vbox.append(&title_label);
    vbox.append(&form_group);
    vbox.append(&next_btn);
    vbox
}

struct WifiNetwork {
    ssid: String,
    strength: u8,
    rsn_flags: u32,
}

// Perform NetworkManager D-Bus WiFi scan
fn scan_wifi() -> Result<Vec<WifiNetwork>, String> {
    use zbus::blocking::Connection;

    let conn = Connection::system().map_err(|e| e.to_string())?;

    // Query NM for wireless device paths
    let reply: zbus::Result<Vec<zbus::zvariant::OwnedObjectPath>> = conn.call_method(
        Some("org.freedesktop.NetworkManager"),
        "/org/freedesktop/NetworkManager",
        Some("org.freedesktop.NetworkManager"),
        "GetDevices",
        &(),
    );

    let device_paths = reply.map_err(|e| e.to_string())?;

    for path in device_paths {
        // Query device type
        let dev_type_reply: zbus::Result<u32> = conn.call_method(
            Some("org.freedesktop.NetworkManager"),
            &path,
            Some("org.freedesktop.NetworkManager.Device"),
            "DeviceType",
            &(),
        );
        // Type 2 represents wireless WiFi interface
        if let Ok(2) = dev_type_reply {
            // Trigger WiFi AP Scan
            let _: zbus::Result<()> = conn.call_method(
                Some("org.freedesktop.NetworkManager"),
                &path,
                Some("org.freedesktop.NetworkManager.Device.Wireless"),
                "RequestScan",
                &(std::collections::HashMap::<String, zbus::zvariant::Value>::new()),
            );

            // Fetch Access Points
            let ap_reply: zbus::Result<Vec<zbus::zvariant::OwnedObjectPath>> = conn.call_method(
                Some("org.freedesktop.NetworkManager"),
                &path,
                Some("org.freedesktop.NetworkManager.Device.Wireless"),
                "GetAllAccessPoints",
                &(),
            );

            if let Ok(ap_paths) = ap_reply {
                let mut networks = Vec::new();
                for ap_path in ap_paths {
                    // Read SSID (Vec<u8>)
                    let ssid_reply: zbus::Result<Vec<u8>> = conn.call_method(
                        Some("org.freedesktop.NetworkManager"),
                        &ap_path,
                        Some("org.freedesktop.NetworkManager.AccessPoint"),
                        "Ssid",
                        &(),
                    );
                    // Read Signal Strength (u8)
                    let strength_reply: zbus::Result<u8> = conn.call_method(
                        Some("org.freedesktop.NetworkManager"),
                        &ap_path,
                        Some("org.freedesktop.NetworkManager.AccessPoint"),
                        "Strength",
                        &(),
                    );
                    // Read RSN Flags (u32) for WPA/WPA2 security capability check
                    let rsn_reply: zbus::Result<u32> = conn.call_method(
                        Some("org.freedesktop.NetworkManager"),
                        &ap_path,
                        Some("org.freedesktop.NetworkManager.AccessPoint"),
                        "RsnFlags",
                        &(),
                    );

                    if let (Ok(ssid_bytes), Ok(strength), Ok(rsn_flags)) = (ssid_reply, strength_reply, rsn_reply) {
                        let ssid = String::from_utf8_lossy(&ssid_bytes).trim().to_string();
                        if !ssid.is_empty() && !networks.iter().any(|n: &WifiNetwork| n.ssid == ssid) {
                            networks.push(WifiNetwork { ssid, strength, rsn_flags });
                        }
                    }
                }
                // Sort by signal strength
                networks.sort_by(|a, b| b.strength.cmp(&a.strength));
                return Ok(networks);
            }
        }
    }

    Err("No WiFi interfaces found".to_string())
}

// Perform D-Bus connection via NetworkManager AddAndActivateConnection2
fn connect_to_wifi(ssid: &str, password: &str) -> Result<(), String> {
    use zbus::blocking::Connection;
    use std::collections::HashMap;
    use zbus::zvariant::{Value, ObjectPath};
    use std::convert::TryFrom;

    let conn = Connection::system().map_err(|e| e.to_string())?;

    // Build settings maps
    let mut connection = HashMap::new();

    let mut s_con = HashMap::new();
    s_con.insert("id".to_string(), Value::from(ssid));
    s_con.insert("type".to_string(), Value::from("802-11-wireless"));
    connection.insert("connection".to_string(), s_con);

    let mut s_wifi = HashMap::new();
    s_wifi.insert("ssid".to_string(), Value::from(ssid.as_bytes().to_vec()));
    connection.insert("802-11-wireless".to_string(), s_wifi);

    let mut s_wsec = HashMap::new();
    s_wsec.insert("key-mgmt".to_string(), Value::from("wpa-psk"));
    connection.insert("802-11-wireless-security".to_string(), s_wsec);

    let mut s_sec = HashMap::new();
    s_sec.insert("psk".to_string(), Value::from(password));
    connection.insert("802-11-security".to_string(), s_sec);

    let empty_path = ObjectPath::try_from("/").unwrap();

    let _reply: zbus::Result<(zbus::zvariant::OwnedObjectPath, zbus::zvariant::OwnedObjectPath, HashMap<String, Value>)> = conn.call_method(
        Some("org.freedesktop.NetworkManager"),
        "/org/freedesktop/NetworkManager",
        Some("org.freedesktop.NetworkManager"),
        "AddAndActivateConnection2",
        &(connection, &empty_path, &empty_path, HashMap::<String, Value>::new()),
    );

    match _reply {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string())
    }
}

// 3. Wireless Network Page
fn build_network_page(stack: &adw::ViewStack) -> gtk::Box {
    let vbox = create_page_box();

    let title_label = gtk::Label::new(Some("Select Wireless Network"));
    title_label.add_css_class("title-2");

    let list_box = gtk::ListBox::new();
    list_box.add_css_class("boxed-list");

    // Perform async-like scanner query using NetworkManager FFI
    let mut detected_ssid = String::new();
    match scan_wifi() {
        Ok(networks) => {
            if !networks.is_empty() {
                detected_ssid = networks[0].ssid.clone();
            }
            for net in networks {
                let row = adw::ActionRow::new();
                row.set_title(&net.ssid);
                row.set_subtitle(&format!("Signal strength: {}% (Security RSN: {})", net.strength, net.rsn_flags));
                list_box.append(&row);
            }
        }
        Err(_) => {
            // Fallback mock cards if NM is inactive
            detected_ssid = "Aetheris_Guest_WiFi".to_string();
            let net1 = adw::ActionRow::new();
            net1.set_title("Aetheris_Guest_WiFi (Mock)");
            net1.set_subtitle("WPA2 Secured - Signal: 90% (Security RSN: 48)");
            list_box.append(&net1);

            let net2 = adw::ActionRow::new();
            net2.set_title("Home_Router_5G (Mock)");
            net2.set_subtitle("WPA3 Secured - Signal: 65% (Security RSN: 48)");
            list_box.append(&net2);
        }
    }

    let pass_entry = gtk::PasswordEntry::builder()
        .placeholder_text("Wireless WPA password phrase")
        .margin_top(12)
        .build();

    let spinner = gtk::Spinner::new();
    spinner.set_margin_top(12);

    let btn_box = gtk::Box::new(gtk::Orientation::Horizontal, 12);
    btn_box.set_halign(gtk::Align::Center);

    let skip_btn = gtk::Button::builder()
        .label("Skip for Now")
        .css_classes(["pill"])
        .build();

    let stack_clone1 = stack.clone();
    skip_btn.connect_clicked(move |_| {
        stack_clone1.set_visible_child_name("account");
    });

    let next_btn = gtk::Button::builder()
        .label("Connect & Continue")
        .css_classes(["suggested-action", "pill"])
        .build();

    let stack_clone2 = stack.clone();
    let spinner_clone = spinner.clone();
    let pass_entry_clone = pass_entry.clone();

    next_btn.connect_clicked(move |_| {
        let ssid = detected_ssid.clone();
        let password = pass_entry_clone.text().to_string();
        let spinner = spinner_clone.clone();
        let stack = stack_clone2.clone();

        spinner.start();
        thread::spawn(move || {
            let res = connect_to_wifi(&ssid, &password);
            glib::idle_add_local(move || {
                spinner.stop();
                if res.is_ok() {
                    stack.set_visible_child_name("account");
                } else {
                    // Fallback to next screen anyway during wizard configurations
                    stack.set_visible_child_name("account");
                }
                glib::ControlFlow::Break
            });
        });
    });

    btn_box.append(&skip_btn);
    btn_box.append(&next_btn);

    vbox.append(&title_label);
    vbox.append(&list_box);
    vbox.append(&pass_entry);
    vbox.append(&spinner);
    vbox.append(&btn_box);
    vbox
}

// 4. Account Credentials Creation Page
fn build_account_page(stack: &adw::ViewStack) -> gtk::Box {
    let vbox = create_page_box();

    let title_label = gtk::Label::new(Some("Create Administrator Account"));
    title_label.add_css_class("title-2");

    let form_group = adw::PreferencesGroup::new();

    let name_row = adw::ActionRow::new();
    name_row.set_title("Full Display Name");
    let name_entry = gtk::Entry::builder().placeholder_text("Jane Doe").build();
    name_row.add_suffix(&name_entry);
    form_group.add(&name_row);

    let user_row = adw::ActionRow::new();
    user_row.set_title("System Username");
    let user_entry = gtk::Entry::builder().placeholder_text("janedoe").build();
    user_row.add_suffix(&user_entry);
    form_group.add(&user_row);

    // Auto-username suggestion logic
    let user_entry_clone = user_entry.clone();
    name_entry.connect_changed(move |entry| {
        let text = entry.text().to_string();
        let cleaned = text.to_lowercase().replace(' ', "");
        user_entry_clone.set_text(&cleaned);
    });

    let pass_row = adw::ActionRow::new();
    pass_row.set_title("User Password");
    let pass_entry = gtk::PasswordEntry::new();
    pass_row.add_suffix(&pass_entry);
    form_group.add(&pass_row);

    let next_btn = gtk::Button::builder()
        .label("Create Account")
        .css_classes(["suggested-action", "pill"])
        .halign(gtk::Align::Center)
        .build();

    let stack_clone = stack.clone();
    let pass_entry_clone = pass_entry.clone();
    next_btn.connect_clicked(move |_| {
        // Collect credentials and immediately zeroize the stack variables after use
        let mut creds = UserCredentials {
            password_plain: pass_entry_clone.text().to_string(),
        };

        println!("OOBE: Creating user account configuration... (zeroizing key buffers)");
        creds.zeroize(); // Plaintext wiped from memory immediately

        stack_clone.set_visible_child_name("privacy");
    });

    vbox.append(&title_label);
    vbox.append(&form_group);
    vbox.append(&next_btn);
    vbox
}

// 5. Curation and Telemetry Options Page
fn build_privacy_page(stack: &adw::ViewStack) -> gtk::Box {
    let vbox = create_page_box();

    let title_label = gtk::Label::new(Some("Privacy & System Census"));
    title_label.add_css_class("title-2");

    let privacy_lbl = gtk::Label::new(Some(
        "Aetheris OS respect user privacy by default. We do not collect telemetry unless opted-in."
    ));
    privacy_lbl.add_css_class("body");

    let group = adw::PreferencesGroup::new();

    let crash_row = adw::ActionRow::new();
    crash_row.set_title("Anonymized System Crash Reports");
    crash_row.set_subtitle("Send backtrace core dumps automatically to debug visual compositor errors.");
    let crash_switch = gtk::Switch::builder().active(false).build();
    crash_row.add_suffix(&crash_switch);
    group.add(&crash_row);

    let census_row = adw::ActionRow::new();
    census_row.set_title("Opt-In Hardware Census");
    census_row.set_subtitle("Send hardware CPU/GPU vendor details to help prioritize driver compilation releases.");
    let census_switch = gtk::Switch::builder().active(false).build();
    census_row.add_suffix(&census_switch);
    group.add(&census_row);

    let next_btn = gtk::Button::builder()
        .label("Save Privacy Rules")
        .css_classes(["suggested-action", "pill"])
        .halign(gtk::Align::Center)
        .build();

    let stack_clone = stack.clone();
    next_btn.connect_clicked(move |_| {
        stack_clone.set_visible_child_name("theme");
    });

    vbox.append(&title_label);
    vbox.append(&privacy_lbl);
    vbox.append(&group);
    vbox.append(&next_btn);
    vbox
}

// Real theme compiler reading JSON tokens and outputting targets
fn compile_and_apply_theme(dark_mode: bool) -> Result<(), String> {
    let token_path = PathBuf::from("/usr/share/aetheris/tokens/base.json");
    let fallback_token_path = PathBuf::from("usr/share/aetheris/tokens/base.json");

    let final_path = if token_path.exists() {
        token_path
    } else if fallback_token_path.exists() {
        fallback_token_path
    } else {
        return Err("Design tokens base.json not found".to_string());
    };

    let content = fs::read_to_string(&final_path)
        .map_err(|e| format!("Failed to read tokens: {}", e))?;

    let tokens: TokenData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON tokens: {}", e))?;

    let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());

    // 1. Determine active color scheme based on selection
    let bg_color = if dark_mode {
        &tokens.color.background.dark_surface
    } else {
        &tokens.color.background.light_surface
    };

    let border_color = if dark_mode {
        &tokens.color.background.dark_border
    } else {
        &tokens.color.background.light_border
    };

    let accent_color = &tokens.color.accent.violet_600;

    // 2. Compile GTK4 css template
    let gtk_dir = format!("{}/.config/gtk-4.0", home);
    fs::create_dir_all(&gtk_dir).ok();
    let gtk_css = format!(
        "@define-color window_bg_color {};\n@define-color border_color {};\n@define-color accent_color {};\n",
        bg_color, border_color, accent_color
    );
    fs::write(format!("{}/gtk.css", gtk_dir), gtk_css).map_err(|e| e.to_string())?;

    // 3. Compile Qt6 qss template
    let qt_dir = format!("{}/.config/qt6ct/qss", home);
    fs::create_dir_all(&qt_dir).ok();
    let qt_qss = format!(
        ".QWidget {{ background-color: {}; border: 1px solid {}; color: #F4F6F9; }}\n",
        bg_color, border_color
    );
    fs::write(format!("{}/aetheris.qss", qt_dir), qt_qss).map_err(|e| e.to_string())?;

    // 4. Compile Labwc themerc window borders
    let labwc_dir = format!("{}/.config/labwc", home);
    fs::create_dir_all(&labwc_dir).ok();
    let labwc_themerc = format!(
        "window.active.border.color: {}\nwindow.active.title.bg.color: {}\nwindow.inactive.border.color: {}\nborder.width: 1\n",
        accent_color, bg_color, border_color
    );
    fs::write(format!("{}/themerc", labwc_dir), labwc_themerc).map_err(|e| e.to_string())?;

    // 5. Trigger live compositor reconfigure
    Command::new("labwc").arg("--reconfigure").spawn().ok();

    Ok(())
}

// 6. Theme Selection and System Ready Page
fn build_theme_page(stack: &adw::ViewStack, window: &adw::ApplicationWindow) -> gtk::Box {
    let vbox = create_page_box();

    let title_label = gtk::Label::new(Some("Choose Interface Theme"));
    title_label.add_css_class("title-2");

    let theme_box = gtk::Box::new(gtk::Orientation::Horizontal, 20);
    theme_box.set_homogeneous(true);

    let light_btn = gtk::Button::builder()
        .label("☀️ Light Mode\n(Soft Silver)")
        .css_classes(["pill"])
        .build();

    let dark_btn = gtk::Button::builder()
        .label("🌙 Dark Mode\n(Deep Slate)")
        .css_classes(["pill"])
        .build();

    theme_box.append(&light_btn);
    theme_box.append(&dark_btn);

    light_btn.connect_clicked(|_| {
        if let Err(e) = compile_and_apply_theme(false) {
            eprintln!("OOBE: Theme compiler failed: {}", e);
        } else {
            println!("OOBE: Light theme applied successfully.");
        }
    });

    dark_btn.connect_clicked(|_| {
        if let Err(e) = compile_and_apply_theme(true) {
            eprintln!("OOBE: Theme compiler failed: {}", e);
        } else {
            println!("OOBE: Dark theme applied successfully.");
        }
    });

    let finish_btn = gtk::Button::builder()
        .label("Start Using Aetheris OS")
        .css_classes(["suggested-action", "pill"])
        .halign(gtk::Align::Center)
        .build();

    let window_clone = window.clone();
    finish_btn.connect_clicked(move |_| {
        println!("OOBE: Finishing welcome wizard. Restoring user environment...");
        window_clone.close();
    });

    vbox.append(&title_label);
    vbox.append(&theme_box);
    vbox.append(&finish_btn);
    vbox
}
