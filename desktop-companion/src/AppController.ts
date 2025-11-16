import { listen } from '@tauri-apps/api/event';
import {
    getAppConfig,
    startLogWatcher,
    updateTrayIcon,
    type LogEvent,
} from './services/tauri-commands';
import { supabaseService } from './services/SupabaseService';
import { QuestEventParser, QuestEventType } from './services/QuestEventParser';
import { CircularBuffer } from './utils/CircularBuffer';

export class AppController {
    private isWatching = false;
    private connectionStatus: 'Connected' | 'Disconnected' | 'Syncing' = 'Disconnected';
    private logLineBuffer = new CircularBuffer<string>(1000); // Keep last 1000 log lines

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

        // Initialize Supabase client
        if (config.supabase_url && config.supabase_key) {
            const initialized = supabaseService.initialize(config.supabase_url, config.supabase_key);
            if (initialized) {
                console.log('Supabase client initialized');
                this.setConnectionStatus('Connected');
            } else {
                console.error('Failed to initialize Supabase client');
                this.setConnectionStatus('Disconnected');
            }
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

        // Request notification permissions
        if (config.notifications_enabled && Notification.permission === 'default') {
            await Notification.requestPermission();
        }

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
        // Split content into lines and store in circular buffer
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                this.logLineBuffer.push(line);
            }
        }

        // Parse quest events from recent log lines
        const recentContent = this.logLineBuffer.getAll().join('\n');
        const events = QuestEventParser.parseLogContent(recentContent);

        if (events.length === 0) {
            return;
        }

        console.log(`Found ${events.length} quest events`);

        // Process each event
        for (const event of events) {
            const eventName = QuestEventParser.getEventTypeName(event.eventType);
            console.log(`Quest ${eventName}:`, event.questId);

            switch (event.eventType) {
                case QuestEventType.TaskStarted:
                    // Quest started - could show notification
                    break;
                case QuestEventType.TaskFailed:
                    // Quest failed - sync to database
                    this.handleQuestFailed(event.questId);
                    break;
                case QuestEventType.TaskFinished:
                    // Quest completed - sync to database
                    this.handleQuestCompletion(event.questId);
                    break;
            }
        }
    }

    private async handleQuestCompletion(questId: string) {
        if (!questId) return;

        console.log('Quest completed! ID:', questId);

        // Set status to syncing
        this.setConnectionStatus('Syncing');

        try {
            // Sync to Supabase database
            const success = await supabaseService.markQuestCompleted(questId);

            if (success) {
                console.log(`Successfully synced quest ${questId} to database`);

                // Show success notification
                if (Notification.permission === 'granted') {
                    new Notification('Quest Completed!', {
                        body: `Quest ${questId} has been marked as complete`,
                        icon: '/icons/icon.png',
                    });
                }
            } else {
                console.error(`Failed to sync quest ${questId}`);
            }
        } catch (error) {
            console.error('Error syncing quest completion:', error);
        } finally {
            // Reset to connected
            this.setConnectionStatus('Connected');
        }
    }

    private async handleQuestFailed(questId: string) {
        if (!questId) return;

        console.log('Quest failed! ID:', questId);

        // Set status to syncing
        this.setConnectionStatus('Syncing');

        try {
            // Sync to Supabase database
            const success = await supabaseService.markQuestFailed(questId);

            if (success) {
                console.log(`Successfully synced quest failure ${questId} to database`);

                // Show notification
                if (Notification.permission === 'granted') {
                    new Notification('Quest Failed', {
                        body: `Quest ${questId} has been marked as failed`,
                        icon: '/icons/icon.png',
                    });
                }
            } else {
                console.error(`Failed to sync quest ${questId}`);
            }
        } catch (error) {
            console.error('Error syncing quest failure:', error);
        } finally {
            // Reset to connected
            this.setConnectionStatus('Connected');
        }
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
