// import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { supabaseService } from '../services/SupabaseService';
import { QuestEventParser } from '../services/QuestEventParser';

export class ImportWizard {
    private logDirectory: string = '';
    private foundQuests: Set<string> = new Set();
    private importedCount: number = 0;
    private isImporting: boolean = false;

    private elements = {
        selectDirBtn: document.getElementById('select-dir-btn') as HTMLButtonElement,
        scanLogsBtn: document.getElementById('scan-logs-btn') as HTMLButtonElement,
        importBtn: document.getElementById('import-btn') as HTMLButtonElement,
        cancelBtn: document.getElementById('cancel-btn') as HTMLButtonElement,

        directoryPath: document.getElementById('directory-path') as HTMLSpanElement,
        scanStatus: document.getElementById('scan-status') as HTMLDivElement,
        questCount: document.getElementById('quest-count') as HTMLSpanElement,
        questList: document.getElementById('quest-list') as HTMLDivElement,
        importProgress: document.getElementById('import-progress') as HTMLDivElement,
        progressBar: document.getElementById('progress-bar') as HTMLDivElement,
        progressText: document.getElementById('progress-text') as HTMLSpanElement,
    };

    constructor() {
        this.init();
    }

    private init() {
        this.attachEventListeners();
        this.updateUI();
    }

    private attachEventListeners() {
        this.elements.selectDirBtn.addEventListener('click', () => this.handleSelectDirectory());
        this.elements.scanLogsBtn.addEventListener('click', () => this.handleScanLogs());
        this.elements.importBtn.addEventListener('click', () => this.handleImport());
        this.elements.cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    private async handleSelectDirectory() {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Tarkov Logs Directory',
            });

            if (selected && typeof selected === 'string') {
                this.logDirectory = selected;
                this.elements.directoryPath.textContent = selected;
                this.foundQuests.clear();
                this.updateUI();
            }
        } catch (error) {
            console.error('Failed to select directory:', error);
            this.showError('Failed to open directory picker');
        }
    }

    private async handleScanLogs() {
        if (!this.logDirectory) {
            this.showError('Please select a log directory first');
            return;
        }

        try {
            this.elements.scanLogsBtn.disabled = true;
            this.elements.scanLogsBtn.textContent = 'Scanning...';
            this.showScanStatus('Scanning log files...', 'info');

            // Read all log files in directory
            const files = await this.getLogFiles(this.logDirectory);

            if (files.length === 0) {
                this.showScanStatus('No log files found in directory', 'error');
                return;
            }

            this.showScanStatus(`Found ${files.length} log files, parsing...`, 'info');

            // Parse each log file
            this.foundQuests.clear();
            for (const file of files) {
                const content = await this.readLogFile(file);
                const events = QuestEventParser.parseLogContent(content);
                const completedQuests = QuestEventParser.getCompletedQuests(events);

                completedQuests.forEach(questId => this.foundQuests.add(questId));
            }

            this.showScanStatus(`Found ${this.foundQuests.size} completed quests`, 'success');
            this.displayQuestList();
            this.updateUI();
        } catch (error) {
            console.error('Failed to scan logs:', error);
            this.showScanStatus('Failed to scan log files', 'error');
        } finally {
            this.elements.scanLogsBtn.disabled = false;
            this.elements.scanLogsBtn.textContent = 'Scan Logs';
        }
    }

    private async getLogFiles(directory: string): Promise<string[]> {
        try {
            // Use Tauri FS API to read directory
            const { readDir } = await import('@tauri-apps/plugin-fs');
            const entries = await readDir(directory);

            return entries
                .filter(entry => entry.isFile && entry.name.endsWith('.log'))
                .map(entry => `${directory}/${entry.name}`);
        } catch (error) {
            console.error('Failed to read directory:', error);
            return [];
        }
    }

    private async readLogFile(filePath: string): Promise<string> {
        try {
            const { readTextFile } = await import('@tauri-apps/plugin-fs');
            return await readTextFile(filePath);
        } catch (error) {
            console.error(`Failed to read file ${filePath}:`, error);
            return '';
        }
    }

    private displayQuestList() {
        if (this.foundQuests.size === 0) {
            this.elements.questList.innerHTML = '<p class="empty-message">No quests found</p>';
            return;
        }

        const questArray = Array.from(this.foundQuests).sort();
        this.elements.questList.innerHTML = questArray
            .map(questId => `<div class="quest-item">${questId}</div>`)
            .join('');
    }

    private async handleImport() {
        if (this.foundQuests.size === 0) {
            this.showError('No quests to import');
            return;
        }

        if (!supabaseService.isReady()) {
            this.showError('Database not connected. Please configure settings first.');
            return;
        }

        try {
            this.isImporting = true;
            this.updateUI();

            this.elements.importProgress.style.display = 'block';
            this.showProgress(0, this.foundQuests.size);

            const questArray = Array.from(this.foundQuests);
            const batchSize = 50; // Import in batches to avoid rate limits

            for (let i = 0; i < questArray.length; i += batchSize) {
                const batch = questArray.slice(i, i + batchSize);
                const imported = await supabaseService.batchImportQuests(batch);
                this.importedCount += imported;

                this.showProgress(this.importedCount, this.foundQuests.size);

                // Small delay between batches
                if (i + batchSize < questArray.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            this.showSuccess(`Successfully imported ${this.importedCount} quests!`);

            // Redirect to main app after success
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        } catch (error) {
            console.error('Import failed:', error);
            this.showError('Failed to import quests. Please try again.');
        } finally {
            this.isImporting = false;
            this.updateUI();
        }
    }

    private handleCancel() {
        window.location.href = '/index.html';
    }

    private showScanStatus(message: string, type: 'info' | 'success' | 'error') {
        this.elements.scanStatus.textContent = message;
        this.elements.scanStatus.className = `status-message ${type}`;
        this.elements.scanStatus.style.display = 'block';
    }

    private showProgress(current: number, total: number) {
        const percentage = Math.round((current / total) * 100);
        this.elements.progressBar.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${current} / ${total} quests (${percentage}%)`;
    }

    private showSuccess(message: string) {
        alert(message);
    }

    private showError(message: string) {
        alert(message);
    }

    private updateUI() {
        // Enable/disable buttons based on state
        this.elements.scanLogsBtn.disabled = !this.logDirectory || this.isImporting;
        this.elements.importBtn.disabled = this.foundQuests.size === 0 || this.isImporting;

        // Update quest count
        this.elements.questCount.textContent = this.foundQuests.size.toString();

        // Show/hide elements
        if (!this.logDirectory) {
            this.elements.scanStatus.style.display = 'none';
            this.elements.questList.innerHTML = '';
        }
    }
}
