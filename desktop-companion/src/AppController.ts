import { listen } from '@tauri-apps/api/event';
import {
  getAppConfig,
  startLogWatcher,
  updateTrayIcon,
  type LogEvent,
} from './services/tauri-commands';

export class AppController {
  private isWatching = false;
  private connectionStatus: 'Connected' | 'Disconnected' | 'Syncing' = 'Disconnected';

  constructor() {
    this.init();
  }

  private async init() {
    // Check if configured
    const config = await getAppConfig();
    
    if (!config.log_directory || !config.supabase_url) {
      // Not configured, redirect to wizard
      window.location.href = '/wizard.html';
      return;
    }

    // Listen for log events
    await listen<LogEvent>('log-event', (event) => {
      this.handleLogEvent(event.payload);
    });

    // Listen for log errors
    await listen<string>('log-error', (event) => {
      console.error('Log watcher error:', event.payload);
      this.setConnectionStatus('Disconnected');
    });

    // Listen for navigation events from tray menu
    await listen<string>('navigate', (event) => {
      this.handleNavigation(event.payload);
    });

    // Auto-start log watching if configured
    if (config.log_directory) {
      await this.startWatching(config.log_directory);
    }

    // Update UI based on initial state
    this.updateUI();
  }

  private async startWatching(logDirectory: string) {
    try {
      await startLogWatcher(logDirectory);
      this.isWatching = true;
      this.setConnectionStatus('Connected');
      console.log('Log watcher started successfully');
    } catch (error) {
      console.error('Failed to start log watcher:', error);
      this.setConnectionStatus('Disconnected');
    }
  }

  private handleLogEvent(event: LogEvent) {
    console.log('Log event received:', {
      file: event.file_path,
      timestamp: event.timestamp,
      contentLength: event.content.length,
    });

    // Parse quest events from log content
    this.parseQuestEvents(event.content);
  }

  private parseQuestEvents(content: string) {
    // Look for quest completion patterns from research.md
    // Pattern: Got notification | ChatMessageReceived with MessageType 10/11/12
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('Got notification') && line.includes('ChatMessageReceived')) {
        try {
          // Extract JSON from log line
          const jsonMatch = line.match(/\{.*\}/);
          if (jsonMatch) {
            const notification = JSON.parse(jsonMatch[0]);
            
            // Check MessageType: 10=TaskStarted, 11=TaskFailed, 12=TaskFinished
            if (notification.MessageType === 10) {
              console.log('Quest started:', notification.message?.templateId);
            } else if (notification.MessageType === 11) {
              console.log('Quest failed:', notification.message?.templateId);
            } else if (notification.MessageType === 12) {
              console.log('Quest completed:', notification.message?.templateId);
              this.handleQuestCompletion(notification.message?.templateId);
            }
          }
        } catch (error) {
          console.error('Failed to parse notification:', error);
        }
      }
    }
  }

  private async handleQuestCompletion(templateId: string) {
    if (!templateId) return;

    // Extract quest ID (templateId format: "questId arg1 arg2 ...")
    const questId = templateId.split(' ')[0];
    
    console.log('Quest completed! ID:', questId);
    
    // Set status to syncing
    this.setConnectionStatus('Syncing');
    
    // TODO: Phase 5 - Sync to Supabase database
    // For now, just log it
    
    // Reset to connected after a short delay
    setTimeout(() => {
      this.setConnectionStatus('Connected');
    }, 2000);
  }

  private handleNavigation(route: string) {
    console.log('Navigation requested:', route);
    
    switch (route) {
      case '/settings':
        window.location.href = '/settings.html';
        break;
      case '/import':
        // TODO: Phase 7 - Import wizard
        console.log('Import feature coming in Phase 7');
        break;
      default:
        window.location.href = '/index.html';
    }
  }

  private async setConnectionStatus(status: 'Connected' | 'Disconnected' | 'Syncing') {
    this.connectionStatus = status;
    await updateTrayIcon(status);
    this.updateUI();
  }

  private updateUI() {
    // Update status indicator if it exists
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.textContent = this.connectionStatus;
      statusEl.className = `status ${this.connectionStatus.toLowerCase()}`;
    }

    // Update watcher status if it exists
    const watcherEl = document.getElementById('watcher-status');
    if (watcherEl) {
      watcherEl.textContent = this.isWatching ? 'Watching' : 'Stopped';
      watcherEl.className = `status ${this.isWatching ? 'watching' : 'stopped'}`;
    }
  }
}
