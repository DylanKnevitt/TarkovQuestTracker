/**
 * Sync Indicator Component
 * 
 * Displays the current sync status (synced, syncing, offline, error).
 * Shows visual feedback for cloud sync operations.
 */

import { storageService } from '../services/storage-service.js';
import { syncService } from '../services/sync-service.js';
import { authService } from '../services/auth-service.js';

export class SyncIndicator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentStatus = 'idle'; // idle, syncing, synced, offline, error
    this.currentUser = null;

    if (!this.container) {
      console.error(`Sync indicator container #${containerId} not found`);
      return;
    }

    this.init();
  }

  /**
   * Initialize sync indicator
   */
  async init() {
    // Check if auth is available
    if (!authService.isAvailable()) {
      this.hide();
      return;
    }

    // Get current user
    this.currentUser = await authService.getCurrentUser();

    // Listen for auth state changes
    authService.onAuthStateChange((user) => {
      this.currentUser = user;
      this.updateStatus();
    });

    // Listen for sync events
    syncService.onSyncEvent((event) => {
      if (event.type === 'start') {
        this.setStatus('syncing');
      } else if (event.type === 'complete') {
        this.setStatus(event.success ? 'synced' : 'error');
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.updateStatus();
    });

    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });

    // Initial render
    this.updateStatus();

    // Auto-hide "synced" status after 3 seconds
    setInterval(() => {
      if (this.currentStatus === 'synced') {
        this.setStatus('idle');
      }
    }, 3000);
  }

  /**
   * Update status based on current conditions
   */
  updateStatus() {
    const syncStatus = storageService.getSyncStatus();

    if (!this.currentUser) {
      this.hide();
      return;
    }

    if (!syncStatus.supabaseAvailable) {
      this.hide();
      return;
    }

    if (!syncStatus.isOnline) {
      this.setStatus('offline');
      return;
    }

    if (syncStatus.queueSize > 0) {
      this.setStatus('syncing');
      // Process queue
      syncService.processQueue();
    } else {
      this.setStatus('idle');
    }
  }

  /**
   * Set the current status and render
   * @param {string} status - Status: idle, syncing, synced, offline, error
   */
  setStatus(status) {
    if (this.currentStatus === status) return;

    this.currentStatus = status;
    this.render();
  }

  /**
   * Render the sync indicator
   */
  render() {
    if (!this.container) return;

    const statusConfig = {
      idle: {
        show: false,
        icon: '',
        text: '',
        class: ''
      },
      syncing: {
        show: true,
        icon: '↻',
        text: 'Syncing...',
        class: 'syncing'
      },
      synced: {
        show: true,
        icon: '✓',
        text: 'Synced',
        class: 'synced'
      },
      offline: {
        show: true,
        icon: '⚠',
        text: 'Offline',
        class: 'offline'
      },
      error: {
        show: true,
        icon: '✗',
        text: 'Sync failed',
        class: 'error'
      }
    };

    const config = statusConfig[this.currentStatus] || statusConfig.idle;

    if (!config.show) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'flex';
    this.container.innerHTML = `
      <div class="sync-indicator sync-indicator-${config.class}">
        <span class="sync-icon">${config.icon}</span>
        <span class="sync-text">${config.text}</span>
      </div>
    `;
  }

  /**
   * Hide the sync indicator
   */
  hide() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }

  /**
   * Show the sync indicator
   */
  show() {
    if (!this.container) return;
    this.container.style.display = 'flex';
    this.render();
  }

  /**
   * Manually trigger a sync
   */
  async triggerSync() {
    if (this.currentUser && syncService.isAvailable()) {
      this.setStatus('syncing');
      await syncService.processQueue();
    }
  }
}
