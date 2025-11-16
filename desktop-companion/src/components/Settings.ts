// import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
  getAppConfig,
  saveAppConfig,
  autoDetectLogDirectory,
  validateLogDirectory,
  type AppConfig,
} from '../services/tauri-commands';

export class SettingsComponent {
  private config: AppConfig | null = null;
  private isValidated = false;

  private elements = {
    logDirectoryInput: document.getElementById('log-directory') as HTMLInputElement,
    autoDetectBtn: document.getElementById('auto-detect-btn') as HTMLButtonElement,
    browseBtn: document.getElementById('browse-btn') as HTMLButtonElement,
    validateBtn: document.getElementById('validate-btn') as HTMLButtonElement,
    validationStatus: document.getElementById('validation-status') as HTMLDivElement,
    
    supabaseUrlInput: document.getElementById('supabase-url') as HTMLInputElement,
    supabaseKeyInput: document.getElementById('supabase-key') as HTMLInputElement,
    testConnectionBtn: document.getElementById('test-connection-btn') as HTMLButtonElement,
    connectionStatus: document.getElementById('connection-status') as HTMLDivElement,
    
    autoStartCheckbox: document.getElementById('auto-start') as HTMLInputElement,
    notificationsCheckbox: document.getElementById('notifications') as HTMLInputElement,
    syncEnabledCheckbox: document.getElementById('sync-enabled') as HTMLInputElement,
    
    saveBtn: document.getElementById('save-btn') as HTMLButtonElement,
    cancelBtn: document.getElementById('cancel-btn') as HTMLButtonElement,
  };

  constructor() {
    this.init();
  }

  private async init() {
    await this.loadConfig();
    this.attachEventListeners();
  }

  private async loadConfig() {
    try {
      this.config = await getAppConfig();
      this.populateForm();
    } catch (error) {
      console.error('Failed to load config:', error);
      this.showError('Failed to load settings');
    }
  }

  private populateForm() {
    if (!this.config) return;

    this.elements.logDirectoryInput.value = this.config.log_directory || '';
    this.elements.supabaseUrlInput.value = this.config.supabase_url || '';
    this.elements.supabaseKeyInput.value = this.config.supabase_key || '';
    this.elements.autoStartCheckbox.checked = this.config.auto_start;
    this.elements.notificationsCheckbox.checked = this.config.notifications_enabled;
    this.elements.syncEnabledCheckbox.checked = this.config.sync_enabled;
  }

  private attachEventListeners() {
    this.elements.autoDetectBtn.addEventListener('click', () => this.handleAutoDetect());
    this.elements.browseBtn.addEventListener('click', () => this.handleBrowse());
    this.elements.validateBtn.addEventListener('click', () => this.handleValidate());
    this.elements.testConnectionBtn.addEventListener('click', () => this.handleTestConnection());
    this.elements.saveBtn.addEventListener('click', () => this.handleSave());
    this.elements.cancelBtn.addEventListener('click', () => this.handleCancel());
  }

  private async handleAutoDetect() {
    try {
      this.elements.autoDetectBtn.disabled = true;
      this.elements.autoDetectBtn.textContent = 'Detecting...';
      
      const detectedPath = await autoDetectLogDirectory();
      
      if (detectedPath && detectedPath !== 'not found') {
        this.elements.logDirectoryInput.value = detectedPath;
        this.showValidationSuccess('Tarkov installation detected!');
        this.isValidated = true;
      } else {
        this.showValidationError('Could not auto-detect Tarkov installation. Please browse manually.');
        this.isValidated = false;
      }
    } catch (error) {
      console.error('Auto-detect failed:', error);
      this.showValidationError('Auto-detection failed. Please select directory manually.');
      this.isValidated = false;
    } finally {
      this.elements.autoDetectBtn.disabled = false;
      this.elements.autoDetectBtn.textContent = 'Auto-detect';
    }
  }

  private async handleBrowse() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Tarkov Log Directory',
      });

      if (selected && typeof selected === 'string') {
        this.elements.logDirectoryInput.value = selected;
        await this.handleValidate();
      }
    } catch (error) {
      console.error('Browse failed:', error);
      this.showError('Failed to open directory picker');
    }
  }

  private async handleValidate() {
    const path = this.elements.logDirectoryInput.value.trim();
    
    if (!path) {
      this.showValidationError('Please enter a directory path');
      this.isValidated = false;
      return;
    }

    try {
      this.elements.validateBtn.disabled = true;
      this.elements.validateBtn.textContent = 'Validating...';
      
      const isValid = await validateLogDirectory(path);
      
      if (isValid) {
        this.showValidationSuccess('✓ Valid Tarkov log directory');
        this.isValidated = true;
      } else {
        this.showValidationError('✗ Invalid directory. Make sure it contains Tarkov log files.');
        this.isValidated = false;
      }
    } catch (error) {
      console.error('Validation failed:', error);
      this.showValidationError('Validation error. Please check the path.');
      this.isValidated = false;
    } finally {
      this.elements.validateBtn.disabled = false;
      this.elements.validateBtn.textContent = 'Validate';
    }
  }

  private async handleTestConnection() {
    const url = this.elements.supabaseUrlInput.value.trim();
    const key = this.elements.supabaseKeyInput.value.trim();

    if (!url || !key) {
      this.showConnectionError('Please enter both Supabase URL and API key');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showConnectionError('Invalid Supabase URL format');
      return;
    }

    try {
      this.elements.testConnectionBtn.disabled = true;
      this.elements.testConnectionBtn.textContent = 'Testing...';
      this.showConnectionInfo('Testing connection...');

      // Test connection by attempting a simple query
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(url, key);
      
      // Try to fetch from a table (assuming 'profiles' exists from web app)
      const { error } = await supabase.from('profiles').select('id').limit(1);

      if (error) {
        throw error;
      }

      this.showConnectionSuccess('✓ Connection successful!');
    } catch (error: any) {
      console.error('Connection test failed:', error);
      this.showConnectionError(`✗ Connection failed: ${error.message || 'Unknown error'}`);
    } finally {
      this.elements.testConnectionBtn.disabled = false;
      this.elements.testConnectionBtn.textContent = 'Test Connection';
    }
  }

  private async handleSave() {
    if (!this.isValidated) {
      this.showError('Please validate the log directory before saving');
      return;
    }

    const config: AppConfig = {
      log_directory: this.elements.logDirectoryInput.value.trim(),
      supabase_url: this.elements.supabaseUrlInput.value.trim(),
      supabase_key: this.elements.supabaseKeyInput.value.trim(),
      auto_start: this.elements.autoStartCheckbox.checked,
      notifications_enabled: this.elements.notificationsCheckbox.checked,
      sync_enabled: this.elements.syncEnabledCheckbox.checked,
    };

    try {
      this.elements.saveBtn.disabled = true;
      this.elements.saveBtn.textContent = 'Saving...';
      
      const success = await saveAppConfig(config);
      
      if (success) {
        this.config = config;
        this.showSuccess('Settings saved successfully!');
        
        // Close settings window after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        this.showError('Failed to save settings');
      }
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save settings');
    } finally {
      this.elements.saveBtn.disabled = false;
      this.elements.saveBtn.textContent = 'Save';
    }
  }

  private handleCancel() {
    window.close();
  }

  // Validation helpers
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname.includes('supabase');
    } catch {
      return false;
    }
  }

  // Status message helpers
  private showValidationSuccess(message: string) {
    this.elements.validationStatus.textContent = message;
    this.elements.validationStatus.className = 'status-message success';
  }

  private showValidationError(message: string) {
    this.elements.validationStatus.textContent = message;
    this.elements.validationStatus.className = 'status-message error';
  }

  private showConnectionSuccess(message: string) {
    this.elements.connectionStatus.textContent = message;
    this.elements.connectionStatus.className = 'status-message success';
  }

  private showConnectionError(message: string) {
    this.elements.connectionStatus.textContent = message;
    this.elements.connectionStatus.className = 'status-message error';
  }

  private showConnectionInfo(message: string) {
    this.elements.connectionStatus.textContent = message;
    this.elements.connectionStatus.className = 'status-message info';
  }

  private showSuccess(message: string) {
    // Global success message (could use a toast/notification system)
    console.log('SUCCESS:', message);
  }

  private showError(message: string) {
    // Global error message (could use a toast/notification system)
    console.error('ERROR:', message);
    alert(message);
  }
}
