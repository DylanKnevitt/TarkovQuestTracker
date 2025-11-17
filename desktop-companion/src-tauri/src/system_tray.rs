use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub enum ConnectionStatus {
    Connected,
    Disconnected,
    Syncing,
}

/// Setup system tray with menu items
pub fn setup_system_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    // Create menu items
    let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let import_item = MenuItem::with_id(app, "import", "Import Progress", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    // Build menu
    let menu = Menu::with_items(
        app,
        &[&show_item, &settings_item, &import_item, &quit_item],
    )?;

    // Build tray icon
    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Tarkov Quest Companion")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("navigate", "/settings");
                }
            }
            "import" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("navigate", "/import");
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// Update tray icon based on connection status
pub fn update_tray_icon_status<R: Runtime>(
    app: &AppHandle<R>,
    status: ConnectionStatus,
) -> Result<(), Box<dyn std::error::Error>> {
    // Get the tray icon
    if let Some(tray) = app.tray_by_id("main") {
        // Update tooltip based on status
        let tooltip = match status {
            ConnectionStatus::Connected => "Tarkov Quest Companion - Connected",
            ConnectionStatus::Disconnected => "Tarkov Quest Companion - Disconnected",
            ConnectionStatus::Syncing => "Tarkov Quest Companion - Syncing...",
        };
        
        tray.set_tooltip(Some(tooltip))?;
        
        // Note: To change icon color, you would need different icon files
        // For now, we update the tooltip to indicate status
        // Future enhancement: Load different icon files based on status
    }

    Ok(())
}
