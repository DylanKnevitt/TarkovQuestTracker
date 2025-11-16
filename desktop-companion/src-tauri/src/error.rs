use serde::{Deserialize, Serialize};

/// Error structure for desktop app operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
    pub recoverable: bool,
    pub retry_count: u32,
}

impl AppError {
    /// Create a new error
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: None,
            recoverable: true,
            retry_count: 0,
        }
    }

    /// Set error details
    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }

    /// Mark error as non-recoverable
    pub fn non_recoverable(mut self) -> Self {
        self.recoverable = false;
        self
    }

    /// Increment retry count
    pub fn increment_retry(&mut self) {
        self.retry_count += 1;
    }

    /// Check if max retries exceeded (default: 5)
    pub fn max_retries_exceeded(&self) -> bool {
        self.retry_count >= 5
    }
}

/// Error types for different operations
impl AppError {
    /// File system errors
    pub fn file_not_found(path: impl Into<String>) -> Self {
        Self::new("FILE_NOT_FOUND", "File or directory not found")
            .with_details(path.into())
            .non_recoverable()
    }

    pub fn file_read_error(path: impl Into<String>, error: impl std::fmt::Display) -> Self {
        Self::new("FILE_READ_ERROR", "Failed to read file")
            .with_details(format!("{}: {}", path.into(), error))
    }

    /// Network errors
    pub fn network_error(error: impl std::fmt::Display) -> Self {
        Self::new("NETWORK_ERROR", "Network connection failed")
            .with_details(error.to_string())
    }

    pub fn timeout_error() -> Self {
        Self::new("TIMEOUT", "Operation timed out")
    }

    /// Authentication errors
    pub fn auth_error(error: impl std::fmt::Display) -> Self {
        Self::new("AUTH_ERROR", "Authentication failed")
            .with_details(error.to_string())
            .non_recoverable()
    }

    /// Database errors
    pub fn database_error(error: impl std::fmt::Display) -> Self {
        Self::new("DATABASE_ERROR", "Database operation failed")
            .with_details(error.to_string())
    }

    pub fn quest_not_found(quest_id: impl Into<String>) -> Self {
        Self::new("QUEST_NOT_FOUND", "Quest not found in database")
            .with_details(quest_id.into())
            .non_recoverable()
    }

    /// Rate limiting
    pub fn rate_limited() -> Self {
        Self::new("RATE_LIMITED", "API rate limit exceeded, please try again later")
    }

    /// Configuration errors
    pub fn invalid_config(field: impl Into<String>) -> Self {
        Self::new("INVALID_CONFIG", "Invalid configuration")
            .with_details(field.into())
            .non_recoverable()
    }
}

/// Result type alias using AppError
pub type AppResult<T> = Result<T, AppError>;
