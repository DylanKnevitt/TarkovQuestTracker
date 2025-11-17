import { invoke } from '@tauri-apps/api/core';

export interface AppConfig {
    log_directory: string | null;
    supabase_url: string | null;
    supabase_key: string | null;
    auto_start: boolean;
    notifications_enabled: boolean;
    sync_enabled: boolean;
}

export type WatcherStatus =
    | { Stopped: null }
    | { Running: null }
    | { Error: string };

export interface LogEvent {
    file_path: string;
    content: string;
    timestamp: string;
}

export type ConnectionStatus = 'Connected' | 'Disconnected' | 'Syncing';

// ============================================================================
// IPC Command Wrappers
// ============================================================================

export async function getAppConfig(): Promise<AppConfig> {
    return await invoke('get_app_config');
}

export async function saveAppConfig(config: AppConfig): Promise<boolean> {
    return await invoke('save_app_config', { config });
}

export async function autoDetectLogDirectory(): Promise<string> {
    return await invoke('auto_detect_log_directory');
}

export async function validateLogDirectory(path: string): Promise<boolean> {
    return await invoke('validate_log_directory', { path });
}

export async function startLogWatcher(logDirectory: string): Promise<string> {
    return await invoke('start_log_watcher', { logDirectory });
}

export async function stopLogWatcher(): Promise<boolean> {
    return await invoke('stop_log_watcher');
}

export async function getWatcherStatus(): Promise<WatcherStatus> {
    return await invoke('get_watcher_status');
}

export async function updateTrayIcon(status: ConnectionStatus): Promise<void> {
    return await invoke('update_tray_icon', { status });
}
