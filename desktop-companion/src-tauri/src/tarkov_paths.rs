use std::path::PathBuf;
use winreg::enums::*;
use winreg::RegKey;

/// Auto-detect Tarkov installation directory
pub fn detect_tarkov_directory() -> Result<String, String> {
    // Try Windows Registry first (EFT Launcher)
    if let Ok(path) = detect_from_registry() {
        return Ok(path);
    }

    // Try Steam installation
    if let Ok(path) = detect_from_steam() {
        return Ok(path);
    }

    // Try common paths
    detect_from_common_paths()
}

/// Detect from Windows Registry (EFT Launcher installation)
fn detect_from_registry() -> Result<String, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    
    // Try EFT registry key
    if let Ok(eft_key) = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\EscapeFromTarkov") {
        if let Ok(install_location) = eft_key.get_value::<String, _>("InstallLocation") {
            let log_path = PathBuf::from(install_location).join("Logs");
            if log_path.exists() {
                return Ok(log_path.to_string_lossy().to_string());
            }
        }
    }

    Err("Registry key not found".to_string())
}

/// Detect from Steam library folders
fn detect_from_steam() -> Result<String, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    
    // Get Steam installation path
    if let Ok(steam_key) = hkcu.open_subkey("SOFTWARE\\Valve\\Steam") {
        if let Ok(steam_path) = steam_key.get_value::<String, _>("SteamPath") {
            // Check common library folders
            let library_folders = vec![
                PathBuf::from(&steam_path).join("steamapps\\common\\Escape from Tarkov\\Logs"),
                PathBuf::from("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Escape from Tarkov\\Logs"),
                PathBuf::from("D:\\Steam\\steamapps\\common\\Escape from Tarkov\\Logs"),
            ];

            for folder in library_folders {
                if folder.exists() {
                    return Ok(folder.to_string_lossy().to_string());
                }
            }
        }
    }

    Err("Steam installation not found".to_string())
}

/// Check common installation paths
fn detect_from_common_paths() -> Result<String, String> {
    let common_paths = vec![
        "C:\\Battlestate Games\\Escape from Tarkov\\Logs",
        "C:\\Battlestate Games\\EFT\\Logs",
        "D:\\Battlestate Games\\Escape from Tarkov\\Logs",
        "D:\\Games\\Escape from Tarkov\\Logs",
        "E:\\Battlestate Games\\Escape from Tarkov\\Logs",
    ];

    for path in common_paths {
        let path_buf = PathBuf::from(path);
        if path_buf.exists() {
            return Ok(path_buf.to_string_lossy().to_string());
        }
    }

    Err("Tarkov installation not found in common paths".to_string())
}

/// Validate that a directory contains Tarkov log files
pub fn validate_log_directory(path: &str) -> Result<bool, String> {
    let path_buf = PathBuf::from(path);
    
    if !path_buf.exists() {
        return Ok(false);
    }

    if !path_buf.is_dir() {
        return Ok(false);
    }

    // Check if directory contains log subdirectories or log files
    if let Ok(entries) = std::fs::read_dir(&path_buf) {
        for entry in entries.flatten() {
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy();
            
            // Look for log subdirectories or .log files
            if name.starts_with("log_") || name.ends_with(".log") {
                return Ok(true);
            }
        }
    }

    Ok(false)
}
