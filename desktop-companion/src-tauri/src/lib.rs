mod app_state;
mod log_watcher;
mod system_tray;
mod tarkov_paths;

use app_state::{AppConfig, AppState, WatcherStatus};
use tauri::{Manager, State};

// ============================================================================
// IPC Commands
// ============================================================================

#[tauri::command]
fn get_app_config(state: State<AppState>) -> Result<AppConfig, String> {
    Ok(state.get_config())
}

#[tauri::command]
fn update_tray_icon(
    status: system_tray::ConnectionStatus,
    app: tauri::AppHandle,
) -> Result<(), String> {
    system_tray::update_tray_icon_status(&app, status)
        .map_err(|e| format!("Failed to update tray icon: {}", e))
}

#[tauri::command]
fn save_app_config(config: AppConfig, state: State<AppState>) -> Result<bool, String> {
    state.set_config(config);
    Ok(true)
}

#[tauri::command]
fn auto_detect_log_directory() -> Result<String, String> {
    tarkov_paths::detect_tarkov_directory()
}

#[tauri::command]
fn validate_log_directory(path: String) -> Result<bool, String> {
    tarkov_paths::validate_log_directory(&path)
}

#[tauri::command]
fn start_log_watcher(
    log_directory: String,
    app: tauri::AppHandle,
    state: State<AppState>,
) -> Result<String, String> {
    if state.is_watching() {
        return Err("Watcher is already running".to_string());
    }

    log_watcher::start_log_watcher(log_directory.clone(), app)?;
    
    state.set_watching(true);
    state.set_watcher_status(WatcherStatus::Running);

    Ok(format!("Started watching: {}", log_directory))
}

#[tauri::command]
fn stop_log_watcher(state: State<AppState>) -> Result<bool, String> {
    if !state.is_watching() {
        return Ok(false);
    }

    log_watcher::stop_log_watcher()?;
    
    state.set_watching(false);
    state.set_watcher_status(WatcherStatus::Stopped);

    Ok(true)
}

#[tauri::command]
fn get_watcher_status(state: State<AppState>) -> Result<WatcherStatus, String> {
    Ok(state.get_watcher_status())
}

// ============================================================================
// Application Entry Point
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::new())
        .setup(|app| {
            // Setup system tray
            system_tray::setup_system_tray(app.handle())?;

            // Prevent window from closing (minimize to tray instead)
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        // Hide window to tray instead of closing
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_config,
            save_app_config,
            auto_detect_log_directory,
            validate_log_directory,
            start_log_watcher,
            stop_log_watcher,
            get_watcher_status,
            update_tray_icon,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
