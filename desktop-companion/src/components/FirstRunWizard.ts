// import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
    getAppConfig,
    saveAppConfig,
    autoDetectLogDirectory,
    validateLogDirectory,
    type AppConfig,
} from '../services/tauri-commands';

type WizardStep = 'welcome' | 'detect-tarkov' | 'configure-database' | 'complete';

export class FirstRunWizard {
    private currentStep: WizardStep = 'welcome';
    private config: Partial<AppConfig> = {
        auto_start: true,
        notifications_enabled: true,
        sync_enabled: true,
    };

    private elements = {
        wizardContainer: document.getElementById('wizard-container') as HTMLDivElement,
        stepIndicator: document.getElementById('step-indicator') as HTMLDivElement,
        contentArea: document.getElementById('content-area') as HTMLDivElement,
        prevBtn: document.getElementById('prev-btn') as HTMLButtonElement,
        nextBtn: document.getElementById('next-btn') as HTMLButtonElement,
        skipBtn: document.getElementById('skip-btn') as HTMLButtonElement,
    };

    constructor() {
        this.init();
    }

    private async init() {
        // Check if already configured
        const existingConfig = await getAppConfig();
        if (existingConfig.log_directory && existingConfig.supabase_url) {
            // Already configured, close wizard
            window.location.href = '/index.html';
            return;
        }

        this.attachEventListeners();
        this.renderStep();
    }

    private attachEventListeners() {
        this.elements.prevBtn.addEventListener('click', () => this.handlePrev());
        this.elements.nextBtn.addEventListener('click', () => this.handleNext());
        this.elements.skipBtn.addEventListener('click', () => this.handleSkip());
    }

    private renderStep() {
        this.updateStepIndicator();
        this.updateButtons();

        switch (this.currentStep) {
            case 'welcome':
                this.renderWelcome();
                break;
            case 'detect-tarkov':
                this.renderDetectTarkov();
                break;
            case 'configure-database':
                this.renderConfigureDatabase();
                break;
            case 'complete':
                this.renderComplete();
                break;
        }
    }

    private renderWelcome() {
        this.elements.contentArea.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-icon">🎮</div>
        <h1>Welcome to Tarkov Quest Companion</h1>
        <p class="lead">
          Automatically track your quest progress in Escape from Tarkov.
        </p>
        
        <div class="features-list">
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <div>
              <h3>Automatic Quest Tracking</h3>
              <p>Monitors your game logs to detect quest completions in real-time</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <div>
              <h3>Web App Sync</h3>
              <p>Syncs your progress with the Tarkov Quest web application</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-icon">✓</span>
            <div>
              <h3>Background Operation</h3>
              <p>Runs quietly in your system tray while you play</p>
            </div>
          </div>
        </div>
        
        <p class="wizard-note">
          This setup wizard will help you configure the companion app in less than 3 minutes.
        </p>
      </div>
    `;
    }

    private renderDetectTarkov() {
        this.elements.contentArea.innerHTML = `
      <div class="wizard-step">
        <h1>Locate Tarkov Installation</h1>
        <p class="lead">
          We need to find your Escape from Tarkov installation to monitor quest events.
        </p>
        
        <div class="detection-container">
          <button id="auto-detect-wizard" class="btn btn-primary btn-large">
            <span class="btn-icon">🔍</span>
            Auto-detect Installation
          </button>
          
          <div id="detection-status" class="status-message"></div>
          
          <div class="manual-section">
            <p class="section-label">Or select manually:</p>
            <div class="input-group">
              <input 
                type="text" 
                id="manual-path" 
                placeholder="C:\\Battlestate Games\\EscapeFromTarkov"
                class="text-input"
                value="${this.config.log_directory || ''}"
              />
              <button id="browse-wizard" class="btn btn-secondary">Browse</button>
            </div>
            <button id="validate-wizard" class="btn btn-secondary">Validate Path</button>
          </div>
        </div>
        
        <div class="help-box">
          <strong>Common Locations:</strong>
          <ul>
            <li>C:\\Battlestate Games\\EscapeFromTarkov</li>
            <li>D:\\Games\\EscapeFromTarkov</li>
            <li>C:\\Program Files (x86)\\Steam\\steamapps\\common\\EscapeFromTarkov</li>
          </ul>
        </div>
      </div>
    `;

        // Attach event listeners for this step
        document.getElementById('auto-detect-wizard')?.addEventListener('click', () => this.handleAutoDetectWizard());
        document.getElementById('browse-wizard')?.addEventListener('click', () => this.handleBrowseWizard());
        document.getElementById('validate-wizard')?.addEventListener('click', () => this.handleValidateWizard());
    }

    private renderConfigureDatabase() {
        this.elements.contentArea.innerHTML = `
      <div class="wizard-step">
        <h1>Connect to Supabase</h1>
        <p class="lead">
          Connect to your Supabase database to sync quest progress with the web app.
        </p>
        
        <div class="form-container">
          <div class="form-group">
            <label for="supabase-url-wizard">Supabase URL</label>
            <input 
              type="text" 
              id="supabase-url-wizard" 
              placeholder="https://your-project.supabase.co"
              class="text-input"
              value="${this.config.supabase_url || ''}"
            />
          </div>

          <div class="form-group">
            <label for="supabase-key-wizard">Supabase Anon Key</label>
            <input 
              type="password" 
              id="supabase-key-wizard" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              class="text-input"
              value="${this.config.supabase_key || ''}"
            />
          </div>
          
          <button id="test-connection-wizard" class="btn btn-primary">Test Connection</button>
          <div id="connection-status-wizard" class="status-message"></div>
        </div>
        
        <div class="help-box">
          <strong>Where to find these credentials:</strong>
          <ol>
            <li>Go to your Supabase project dashboard</li>
            <li>Navigate to Settings → API</li>
            <li>Copy the "Project URL" and "anon public" key</li>
          </ol>
          <p>
            <a href="https://supabase.com/dashboard" target="_blank" class="external-link">
              Open Supabase Dashboard →
            </a>
          </p>
        </div>
      </div>
    `;

        // Attach event listeners for this step
        document.getElementById('test-connection-wizard')?.addEventListener('click', () => this.handleTestConnectionWizard());
    }

    private renderComplete() {
        this.elements.contentArea.innerHTML = `
      <div class="wizard-step">
        <div class="wizard-icon success">✓</div>
        <h1>Setup Complete!</h1>
        <p class="lead">
          Your Tarkov Quest Companion is ready to use.
        </p>
        
        <div class="summary-box">
          <h3>Configuration Summary:</h3>
          <div class="summary-item">
            <span class="summary-label">Tarkov Directory:</span>
            <span class="summary-value">${this.config.log_directory || 'Not set'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Database:</span>
            <span class="summary-value">${this.config.supabase_url ? 'Connected' : 'Not configured'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Auto-start:</span>
            <span class="summary-value">${this.config.auto_start ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
        
        <div class="next-steps">
          <h3>What happens next?</h3>
          <ul>
            <li>The app will monitor your Tarkov logs in the background</li>
            <li>Quest completions will be automatically detected</li>
            <li>Your progress will sync with the web app</li>
            <li>You'll get notifications for important quest events</li>
          </ul>
        </div>
        
        <button id="start-monitoring" class="btn btn-primary btn-large">
          <span class="btn-icon">🚀</span>
          Start Monitoring
        </button>
      </div>
    `;

        // Attach event listener for final button
        document.getElementById('start-monitoring')?.addEventListener('click', () => this.handleStartMonitoring());
    }

    private async handleAutoDetectWizard() {
        const btn = document.getElementById('auto-detect-wizard') as HTMLButtonElement;
        const status = document.getElementById('detection-status') as HTMLDivElement;
        const input = document.getElementById('manual-path') as HTMLInputElement;

        try {
            btn.disabled = true;
            btn.textContent = 'Detecting...';
            status.textContent = 'Searching for Tarkov installation...';
            status.className = 'status-message info';

            const detectedPath = await autoDetectLogDirectory();

            if (detectedPath && detectedPath !== 'not found') {
                this.config.log_directory = detectedPath;
                input.value = detectedPath;
                status.textContent = '✓ Tarkov installation found!';
                status.className = 'status-message success';
                this.elements.nextBtn.disabled = false;
            } else {
                status.textContent = '✗ Could not auto-detect. Please select manually.';
                status.className = 'status-message error';
            }
        } catch (error) {
            console.error('Auto-detect failed:', error);
            status.textContent = '✗ Auto-detection failed. Please select manually.';
            status.className = 'status-message error';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="btn-icon">🔍</span> Auto-detect Installation';
        }
    }

    private async handleBrowseWizard() {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Tarkov Installation Directory',
            });

            if (selected && typeof selected === 'string') {
                const input = document.getElementById('manual-path') as HTMLInputElement;
                input.value = selected;
                await this.handleValidateWizard();
            }
        } catch (error) {
            console.error('Browse failed:', error);
        }
    }

    private async handleValidateWizard() {
        const input = document.getElementById('manual-path') as HTMLInputElement;
        const status = document.getElementById('detection-status') as HTMLDivElement;
        const path = input.value.trim();

        if (!path) {
            status.textContent = 'Please enter a directory path';
            status.className = 'status-message error';
            return;
        }

        try {
            status.textContent = 'Validating...';
            status.className = 'status-message info';

            const isValid = await validateLogDirectory(path);

            if (isValid) {
                this.config.log_directory = path;
                status.textContent = '✓ Valid Tarkov directory!';
                status.className = 'status-message success';
                this.elements.nextBtn.disabled = false;
            } else {
                status.textContent = '✗ Invalid directory. Make sure it contains Tarkov log files.';
                status.className = 'status-message error';
                this.elements.nextBtn.disabled = true;
            }
        } catch (error) {
            console.error('Validation failed:', error);
            status.textContent = '✗ Validation error. Please check the path.';
            status.className = 'status-message error';
            this.elements.nextBtn.disabled = true;
        }
    }

    private async handleTestConnectionWizard() {
        const urlInput = document.getElementById('supabase-url-wizard') as HTMLInputElement;
        const keyInput = document.getElementById('supabase-key-wizard') as HTMLInputElement;
        const btn = document.getElementById('test-connection-wizard') as HTMLButtonElement;
        const status = document.getElementById('connection-status-wizard') as HTMLDivElement;

        const url = urlInput.value.trim();
        const key = keyInput.value.trim();

        if (!url || !key) {
            status.textContent = 'Please enter both URL and API key';
            status.className = 'status-message error';
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = 'Testing...';
            status.textContent = 'Testing connection...';
            status.className = 'status-message info';

            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(url, key);
            const { error } = await supabase.from('profiles').select('id').limit(1);

            if (error) throw error;

            this.config.supabase_url = url;
            this.config.supabase_key = key;
            status.textContent = '✓ Connection successful!';
            status.className = 'status-message success';
            this.elements.nextBtn.disabled = false;
        } catch (error: any) {
            console.error('Connection test failed:', error);
            status.textContent = `✗ Connection failed: ${error.message || 'Unknown error'}`;
            status.className = 'status-message error';
            this.elements.nextBtn.disabled = true;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Test Connection';
        }
    }

    private async handleStartMonitoring() {
        const btn = document.getElementById('start-monitoring') as HTMLButtonElement;

        try {
            btn.disabled = true;
            btn.textContent = 'Starting...';

            // Save configuration
            const fullConfig: AppConfig = {
                log_directory: this.config.log_directory || '',
                supabase_url: this.config.supabase_url || '',
                supabase_key: this.config.supabase_key || '',
                auto_start: this.config.auto_start ?? true,
                notifications_enabled: this.config.notifications_enabled ?? true,
                sync_enabled: this.config.sync_enabled ?? true,
            };

            await saveAppConfig(fullConfig);

            // Redirect to main app
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('Failed to save configuration. Please try again.');
            btn.disabled = false;
            btn.innerHTML = '<span class="btn-icon">🚀</span> Start Monitoring';
        }
    }

    private handlePrev() {
        const steps: WizardStep[] = ['welcome', 'detect-tarkov', 'configure-database', 'complete'];
        const currentIndex = steps.indexOf(this.currentStep);
        if (currentIndex > 0) {
            this.currentStep = steps[currentIndex - 1];
            this.renderStep();
        }
    }

    private handleNext() {
        const steps: WizardStep[] = ['welcome', 'detect-tarkov', 'configure-database', 'complete'];
        const currentIndex = steps.indexOf(this.currentStep);

        // Validate before proceeding
        if (this.currentStep === 'detect-tarkov' && !this.config.log_directory) {
            alert('Please configure the Tarkov directory before continuing.');
            return;
        }

        if (this.currentStep === 'configure-database' && (!this.config.supabase_url || !this.config.supabase_key)) {
            alert('Please test the database connection before continuing.');
            return;
        }

        if (currentIndex < steps.length - 1) {
            this.currentStep = steps[currentIndex + 1];
            this.renderStep();
        }
    }

    private handleSkip() {
        window.location.href = '/index.html';
    }

    private updateStepIndicator() {
        const steps: WizardStep[] = ['welcome', 'detect-tarkov', 'configure-database', 'complete'];
        const currentIndex = steps.indexOf(this.currentStep);

        this.elements.stepIndicator.innerHTML = steps.map((_, index) => `
      <div class="step-dot ${index <= currentIndex ? 'active' : ''}"></div>
    `).join('');
    }

    private updateButtons() {
        const steps: WizardStep[] = ['welcome', 'detect-tarkov', 'configure-database', 'complete'];
        const currentIndex = steps.indexOf(this.currentStep);

        // Previous button
        this.elements.prevBtn.style.display = currentIndex > 0 && currentIndex < steps.length - 1 ? 'inline-block' : 'none';

        // Next button
        if (currentIndex === steps.length - 1) {
            this.elements.nextBtn.style.display = 'none';
        } else {
            this.elements.nextBtn.style.display = 'inline-block';
            this.elements.nextBtn.textContent = currentIndex === 0 ? "Let's Go!" : 'Next';
            this.elements.nextBtn.disabled = currentIndex === 1 && !this.config.log_directory;
        }

        // Skip button
        this.elements.skipBtn.style.display = currentIndex < steps.length - 1 ? 'inline-block' : 'none';
    }
}
