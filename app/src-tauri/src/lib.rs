use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Prefs {
    setup_complete: bool,
    pet_name: String,
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            setup_complete: false,
            pet_name: "Sealoo".into(),
        }
    }
}

fn prefs_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("prefs.json"))
        .map_err(|e| e.to_string())
}

fn read_prefs(app: &tauri::AppHandle) -> Result<Prefs, String> {
    let path = prefs_path(app)?;
    if !path.exists() {
        return Ok(Prefs::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn write_prefs(app: &tauri::AppHandle, prefs: &Prefs) -> Result<(), String> {
    let path = prefs_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_prefs(app: tauri::AppHandle) -> Result<Prefs, String> {
    read_prefs(&app)
}

#[tauri::command]
fn set_prefs(app: tauri::AppHandle, prefs: Prefs) -> Result<(), String> {
    let mut next = prefs;
    if next.pet_name.trim().is_empty() {
        next.pet_name = "Sealoo".into();
    } else {
        next.pet_name = next.pet_name.trim().to_string();
    }
    write_prefs(&app, &next)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_prefs, set_prefs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
