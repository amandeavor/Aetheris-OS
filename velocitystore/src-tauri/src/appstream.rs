// SPDX-License-Identifier: GPL-3.0-or-later
// File: velocitystore/src-tauri/src/appstream.rs
// SQLite database indexer for Linux AppStream XML metainfo.

use std::fs;
use std::path::{Path, PathBuf};
use sqlite::Connection;
use quick_xml::events::Event;
use quick_xml::Reader;

pub struct AppMetadata {
    pub id: String,
    pub name: String,
    pub summary: String,
    pub description: String,
    pub icon: String,
    pub category: String,
    pub screenshot: String,
    pub homepage: String,
}

fn get_db_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
    PathBuf::from(format!("{}/.local/share/velocity-store/appstream.db", home))
}

// 1. Initialize SQLite Database Schema
fn init_database(conn: &Connection) -> Result<(), sqlite::Error> {
    let query = "
        CREATE TABLE IF NOT EXISTS appstream (
            id TEXT PRIMARY KEY,
            name TEXT,
            summary TEXT,
            description TEXT,
            icon TEXT,
            category TEXT,
            screenshot TEXT,
            homepage TEXT
        );
    ";
    conn.execute(query)
}

// 2. Parse a single AppStream XML file
fn parse_xml_file<P: AsRef<Path>>(path: P) -> Option<AppMetadata> {
    let file = fs::File::open(path).ok()?;
    let mut reader = Reader::from_reader(std::io::BufReader::new(file));
    reader.config_mut().trim_text(true);

    let mut buf = Vec::new();
    let mut id = String::new();
    let mut name = String::new();
    let mut summary = String::new();
    let mut description = String::new();
    let mut icon = String::new();
    let mut category = String::new();
    let mut screenshot = String::new();
    let mut homepage = String::new();

    let mut current_tag = String::new();
    let mut in_description = false;
    let mut in_screenshot = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let tag_name = String::from_utf8_lossy(e.name().as_ref()).into_owned();
                current_tag = tag_name.clone();
                if tag_name == "description" {
                    in_description = true;
                } else if tag_name == "screenshot" {
                    in_screenshot = true;
                }
            }
            Ok(Event::End(ref e)) => {
                let tag_name = String::from_utf8_lossy(e.name().as_ref()).into_owned();
                if tag_name == "description" {
                    in_description = false;
                } else if tag_name == "screenshot" {
                    in_screenshot = false;
                }
                current_tag.clear();
            }
            Ok(Event::Text(ref e)) => {
                let text = e.unescape().ok()?.into_owned();
                match current_tag.as_str() {
                    "id" => id = text,
                    "name" => name = text,
                    "summary" => summary = text,
                    "icon" => icon = text,
                    "category" => {
                        if category.is_empty() {
                            category = text;
                        }
                    }
                    "image" => {
                        if in_screenshot && screenshot.is_empty() {
                            screenshot = text;
                        }
                    }
                    "url" => {
                        if homepage.is_empty() {
                            homepage = text;
                        }
                    }
                    _ => {
                        if in_description && (current_tag == "p" || current_tag == "li") {
                            description.push_str(&text);
                            description.push_str("\n");
                        }
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => return None,
            _ => {}
        }
        buf.clear();
    }

    if id.is_empty() || name.is_empty() {
        return None;
    }

    Some(AppMetadata {
        id,
        name,
        summary,
        description,
        icon,
        category,
        screenshot,
        homepage,
    })
}

// 3. Scan directories and build index
pub fn update_appstream_index() -> Result<(), String> {
    let db_file = get_db_path();

    // Ensure parent directory exists
    if let Some(parent) = db_file.parent() {
        fs::create_dir_all(parent).ok();
    }

    // Check modification times to skip redundant indexing
    let mut max_xml_mtime = 0;
    let paths = vec!["/usr/share/metainfo", "/usr/share/appdata"];
    let mut xml_files = Vec::new();

    for dir in paths {
        let path = Path::new(dir);
        if path.exists() {
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    let file_path = entry.path();
                    if file_path.extension().map_or(false, |ext| ext == "xml") {
                        if let Ok(metadata) = file_path.metadata() {
                            if let Ok(modified) = metadata.modified() {
                                if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                                    let mtime = duration.as_secs();
                                    if mtime > max_xml_mtime {
                                        max_xml_mtime = mtime;
                                    }
                                }
                            }
                        }
                        xml_files.push(file_path);
                    }
                }
            }
        }
    }

    if db_file.exists() {
        if let Ok(db_metadata) = db_file.metadata() {
            if let Ok(db_modified) = db_metadata.modified() {
                if let Ok(db_duration) = db_modified.duration_since(std::time::UNIX_EPOCH) {
                    let db_mtime = db_duration.as_secs();
                    // Skip indexing if DB is newer than all metainfo XMLs
                    if db_mtime > max_xml_mtime {
                        println!("AppStream index is up to date.");
                        return Ok(());
                    }
                }
            }
        }
    }

    println!("Indexing AppStream metadata into SQLite...");
    let conn = Connection::open(&db_file).map_err(|e| e.to_string())?;
    init_database(&conn).map_err(|e| e.to_string())?;

    for xml in xml_files {
        if let Some(metadata) = parse_xml_file(&xml) {
            let query = "
                INSERT OR REPLACE INTO appstream (id, name, summary, description, icon, category, screenshot, homepage)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            ";
            let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
            stmt.bind((1, metadata.id.as_str())).ok();
            stmt.bind((2, metadata.name.as_str())).ok();
            stmt.bind((3, metadata.summary.as_str())).ok();
            stmt.bind((4, metadata.description.as_str())).ok();
            stmt.bind((5, metadata.icon.as_str())).ok();
            stmt.bind((6, metadata.category.as_str())).ok();
            stmt.bind((7, metadata.screenshot.as_str())).ok();
            stmt.bind((8, metadata.homepage.as_str())).ok();
            stmt.next().ok();
        }
    }

    println!("AppStream indexing complete.");
    Ok(())
}
