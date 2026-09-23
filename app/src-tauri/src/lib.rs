use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::thread;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
use tauri::{Emitter, Manager};

struct AgentProc(Mutex<Option<std::process::Child>>);

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

fn find_file(rel: &str) -> Option<PathBuf> {
    let mut starts = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        starts.push(cwd);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            starts.push(dir.to_path_buf());
        }
    }
    for start in starts {
        let mut dir = start;
        for _ in 0..8 {
            let cand = dir.join(rel);
            if cand.is_file() {
                return Some(cand);
            }
            if !dir.pop() {
                break;
            }
        }
    }
    None
}

fn agent_command() -> Result<Command, String> {
    if let Ok(p) = std::env::var("SEALOO_AGENT") {
        if Path::new(&p).is_file() {
            return Ok(Command::new(p));
        }
        return Err(format!("SEALOO_AGENT 不存在: {p}"));
    }
    let exe = if cfg!(windows) {
        "agent/sealoo-agent.exe"
    } else {
        "agent/sealoo-agent"
    };
    if let Some(path) = find_file(exe) {
        return Ok(Command::new(path));
    }
    let main_go = find_file("agent/main.go").ok_or(
        "找不到 Agent。设置 SEALOO_AGENT，或在 agent/ 下执行 go build -o sealoo-agent.exe .",
    )?;
    let dir = main_go.parent().ok_or("agent 路径无效")?;
    let mut cmd = Command::new("go");
    cmd.arg("run").arg(".").current_dir(dir);
    Ok(cmd)
}

fn clip(s: &str) -> String {
    let s = s.trim();
    let n = s.chars().count();
    if n <= 800 {
        return s.to_string();
    }
    s.chars().take(800).collect()
}

#[tauri::command]
fn agent_prompt(
    app: tauri::AppHandle,
    state: tauri::State<AgentProc>,
    prompt: String,
    max_credit: Option<u32>,
) -> Result<(), String> {
    let prompt = prompt.trim().to_string();
    if prompt.is_empty() {
        return Err("请输入内容".into());
    }
    let workspace = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("workspace");
    fs::create_dir_all(&workspace).map_err(|e| e.to_string())?;

    let mut cmd = agent_command()?;
    cmd.arg("-events")
        .arg("-workspace")
        .arg(&workspace)
        .arg("-prompt")
        .arg(&prompt);
    if let Some(c) = max_credit {
        if c > 0 {
            cmd.arg("-max-credit").arg(c.to_string());
        }
    }
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    let mut child = cmd.spawn().map_err(|e| format!("无法启动 Agent: {e}"))?;
    let stdout = child.stdout.take().ok_or("agent stdout 不可用")?;
    let stderr = child.stderr.take().ok_or("agent stderr 不可用")?;
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            let _ = child.kill();
            return Err("已有任务在进行".into());
        }
        *guard = Some(child);
    }

    let logged = thread::spawn(move || {
        let mut s = String::new();
        let mut stderr = stderr;
        let _ = stderr.read_to_string(&mut s);
        s
    });

    for line in BufReader::new(stdout).lines() {
        let line = match line {
            Ok(line) => line,
            Err(_) => break,
        };
        if line.trim().is_empty() {
            continue;
        }
        let value: Value = serde_json::from_str(&line).unwrap_or_else(|_| {
            serde_json::json!({"type": "agent_end", "error": line})
        });
        let _ = app.emit("agent-event", value);
    }

    let mut child = {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.take()
    };
    let Some(child) = child.as_mut() else {
        return Ok(());
    };
    let status = child.wait().map_err(|e| e.to_string())?;
    let logged = logged.join().unwrap_or_default();
    if status.success() {
        return Ok(());
    }
    let msg = clip(&logged);
    if msg.is_empty() {
        return Ok(());
    }
    Err(msg)
}

#[tauri::command]
fn agent_abort(state: tauri::State<AgentProc>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
        let _ = child.kill();
    }
    Ok(())
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

fn show_window(app: &tauri::AppHandle, label: &str) {
    if let Some(w) = app.get_webview_window(label) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn toggle_pet(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            show_window(app, "main");
        }
    }
}

fn install_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let toggle = MenuItem::with_id(app, "toggle", "显示/隐藏", true, None::<&str>)?;
    let home = MenuItem::with_id(app, "home", "主界面", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &home, &quit])?;
    let Some(tray) = app.tray_by_id("tray") else {
        return Ok(());
    };
    tray.set_menu(Some(menu))?;
    tray.on_menu_event(|app, event| match event.id.as_ref() {
        "toggle" => toggle_pet(app),
        "home" => {
            show_window(app, "home");
            let _ = app.emit("sealoo-home-view", "home");
        }
        "quit" => app.exit(0),
        _ => {}
    });
    tray.on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            toggle_pet(tray.app_handle());
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AgentProc(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            get_prefs,
            set_prefs,
            agent_prompt,
            agent_abort,
            quit_app
        ])
        .setup(|app| {
            install_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
