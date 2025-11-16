use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub log_directory: Option<String>,
    pub supabase_url: Option<String>,
    pub supabase_key: Option<String>,
    pub auto_start: bool,
    pub notifications_enabled: bool,
    pub sync_enabled: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            log_directory: None,
            supabase_url: None,
            supabase_key: None,
            auto_start: false,
            notifications_enabled: true,
            sync_enabled: true,
        }
    }
}

/// Watcher status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum WatcherStatus {
    Stopped,
    Running,
    Error(String),
}

/// Global application state
pub struct AppState {
    pub config: Arc<Mutex<AppConfig>>,
    pub watcher_status: Arc<Mutex<WatcherStatus>>,
    pub is_watching: Arc<Mutex<bool>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            config: Arc::new(Mutex::new(AppConfig::default())),
            watcher_status: Arc::new(Mutex::new(WatcherStatus::Stopped)),
            is_watching: Arc::new(Mutex::new(false)),
        }
    }

    pub fn get_config(&self) -> AppConfig {
        self.config.lock().unwrap().clone()
    }

    pub fn set_config(&self, config: AppConfig) {
        *self.config.lock().unwrap() = config;
    }

    pub fn get_watcher_status(&self) -> WatcherStatus {
        self.watcher_status.lock().unwrap().clone()
    }

    pub fn set_watcher_status(&self, status: WatcherStatus) {
        *self.watcher_status.lock().unwrap() = status;
    }

    pub fn is_watching(&self) -> bool {
        *self.is_watching.lock().unwrap()
    }

    pub fn set_watching(&self, watching: bool) {
        *self.is_watching.lock().unwrap() = watching;
    }
}
