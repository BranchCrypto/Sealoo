#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(windows)]
            {
                use tauri::Manager;
                if let Some(home) = app.get_webview_window("home") {
                    clear_titlebar_icon(&home);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Title bar shows text only — no app icon next to "Sealoo".
#[cfg(windows)]
fn clear_titlebar_icon(window: &tauri::WebviewWindow) {
    let Ok(hwnd) = window.hwnd() else {
        return;
    };
    #[link(name = "user32")]
    extern "system" {
        fn SendMessageW(hwnd: isize, msg: u32, wparam: usize, lparam: isize) -> isize;
    }
    const WM_SETICON: u32 = 0x0080;
    let h = hwnd.0 as isize;
    unsafe {
        SendMessageW(h, WM_SETICON, 0, 0); // ICON_SMALL
        SendMessageW(h, WM_SETICON, 1, 0); // ICON_BIG
    }
}
