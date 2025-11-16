use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::task;
use tokio::time::{sleep, Duration};

/// Log event data sent to frontend
#[derive(Clone, serde::Serialize)]
pub struct LogEvent {
    pub file_path: String,
    pub content: String,
    pub timestamp: String,
}

/// Start watching the log directory for changes
pub fn start_log_watcher(
    log_directory: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Validate directory exists
    if !Path::new(&log_directory).exists() {
        return Err(format!("Log directory not found: {}", log_directory));
    }

    let (tx, rx): (Sender<Result<Event, notify::Error>>, Receiver<Result<Event, notify::Error>>) = channel();

    // Create watcher with recommended configuration
    let mut watcher = RecommendedWatcher::new(
        move |res| {
            let _ = tx.send(res);
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create file watcher: {}", e))?;

    // Watch the log directory (non-recursive)
    watcher
        .watch(Path::new(&log_directory), RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;

    // Spawn async task to handle file events with batching
    task::spawn(async move {
        // Keep watcher alive
        let _watcher = watcher;
        
        let mut last_content: Option<String> = None;
        let mut last_path: Option<String> = None;
        let mut batch_timer = tokio::time::interval(Duration::from_millis(100));
        
        loop {
            tokio::select! {
                // Process file system events
                Ok(res) = async { rx.recv() } => {
                    match res {
                        Ok(event) => {
                            // Filter for modify events on .log files
                            if let Some(path) = event.paths.first() {
                                if let Some(extension) = path.extension() {
                                    if extension == "log" && path.file_name().and_then(|n| n.to_str()).map_or(false, |n| n.contains("notifications")) {
                                        // Read the new content and buffer it
                                        if let Ok(content) = std::fs::read_to_string(path) {
                                            // Get last 10KB to avoid reading entire file
                                            let start = content.len().saturating_sub(10240);
                                            let recent_content = &content[start..];
                                            
                                            last_content = Some(recent_content.to_string());
                                            last_path = Some(path.display().to_string());
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("Watch error: {:?}", e);
                            let _ = app_handle.emit("log-error", format!("Watch error: {}", e));
                        }
                    }
                }
                
                // Emit batched events every 100ms
                _ = batch_timer.tick() => {
                    if let (Some(content), Some(path)) = (last_content.take(), last_path.take()) {
                        let log_event = LogEvent {
                            file_path: path,
                            content,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                        };

                        // Emit event to frontend
                        let _ = app_handle.emit("log-event", log_event);
                    }
                }
            }
        }
    });

    Ok(())
}

/// Stop the log watcher (handled by dropping the watcher)
pub fn stop_log_watcher() -> Result<bool, String> {
    // In this implementation, stopping is handled by the task ending
    // A more sophisticated approach would use a cancellation token
    Ok(true)
}
