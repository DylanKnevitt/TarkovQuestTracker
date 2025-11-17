/**
 * Main application entry point
 */

import { fetchQuests, questCache } from './api/tarkov-api.js';
import { QuestManager } from './models/quest.js';
import { QuestList } from './components/quest-list.js';
import { QuestGraph } from './components/quest-graph.js';
import { QuestOptimizer } from './components/quest-optimizer.js';
import { getSupabaseClient, isSupabaseAvailable } from './api/supabase-client.js';
import { AuthUI } from './components/auth-ui.js';
import { SyncIndicator } from './components/sync-indicator.js';
import { getComparisonService } from './services/comparison-service.js';
import { UserComparison } from './components/user-comparison.js';
import { ItemTracker } from './components/item-tracker.js';
import { HideoutManager } from './models/hideout-manager.js';
import { ItemTrackerManager } from './models/item-tracker-manager.js';
import { userProfileService } from './services/user-profile-service.js';

class TarkovQuestApp {
    constructor() {
        this.questManager = new QuestManager();
        this.hideoutManager = null;
        this.itemTrackerManager = null;
        this.questList = null;
        this.questGraph = null;
        this.questOptimizer = null;
        this.itemTracker = null;
        this.authUI = null;
        this.syncIndicator = null;
        this.comparisonService = null;
        this.userComparison = null;
        this.currentTab = 'list';
    }

    async init() {
        console.log('Initializing Tarkov Quest Tracker...');

        // Initialize Supabase client (checks for environment variables)
        const supabase = getSupabaseClient();
        if (supabase) {
            console.log('Supabase client available - cloud sync enabled');
        } else {
            console.log('Running in LocalStorage-only mode (no cloud sync)');
        }

        // Initialize authentication UI
        this.authUI = new AuthUI('auth-container');

        // Initialize sync indicator
        this.syncIndicator = new SyncIndicator('sync-indicator-container');

        // Initialize comparison service
        this.comparisonService = getComparisonService();
        console.log('Comparison service initialized');

        // Listen for auth state changes to reload progress and user level
        const { authService } = await import('./services/auth-service.js');
        authService.onAuthStateChange(async (user) => {
            if (user && this.questManager) {
                console.log('Auth state changed, reloading progress and user level...');
                await this.questManager.loadProgress();
                
                // Load user's saved level
                const { level } = await userProfileService.getUserProfile(user.id);
                if (level) {
                    document.getElementById('user-level').value = level;
                    this.updateLevelFilters(level);
                }
                
                if (this.questList) {
                    this.questList.render();
                }
                if (this.questGraph) {
                    this.questGraph.buildGraph(this.questManager.quests);
                }
                this.updateStats();
            } else {
                // User signed out, clear profile cache
                userProfileService.clearCache();
                document.getElementById('user-level').value = 1;
                this.updateLevelFilters(1);
            }
        });

        try {
            // Try to load from cache first
            let questData = questCache.get();

            if (!questData) {
                console.log('Fetching quest data from Tarkov API...');
                questData = await fetchQuests();
                questCache.set(questData);
                console.log(`Loaded ${questData.length} quests from API`);
            } else {
                console.log(`Loaded ${questData.length} quests from cache`);
            }

            // Initialize quest manager
            this.questManager.setQuests(questData);
            await this.questManager.initialize();

            // Initialize hideout and item tracker managers
            this.hideoutManager = new HideoutManager();
            await this.hideoutManager.initialize();

            this.itemTrackerManager = new ItemTrackerManager(this.questManager, this.hideoutManager);
            await this.itemTrackerManager.initialize();

            // Initialize components
            this.questList = new QuestList('quest-list', this.questManager);
            this.questGraph = new QuestGraph('quest-graph', this.questManager);
            this.questOptimizer = new QuestOptimizer(this.questManager);
            this.userComparison = new UserComparison('comparison-view', this.questManager);

            // Initialize item tracker component
            this.itemTracker = new ItemTracker(this.questManager, this.hideoutManager, this.itemTrackerManager);
            const itemsTabContent = document.getElementById('items-tab');
            if (itemsTabContent) {
                await this.itemTracker.initialize(itemsTabContent);
            }

            // Set up graph click handler
            this.questGraph.onNodeClick = (questId) => {
                this.questList.showQuestDetails(questId);
            };

            // Render initial view
            this.questList.render();
            this.questGraph.buildGraph(this.questManager.quests);

            // Update stats
            this.updateStats();

            // Set up event listeners
            this.setupEventListeners();

            // Populate target quest dropdown
            this.populateTargetQuestSelect();

            // Load optimizer settings
            this.loadOptimizerSettings();

            console.log('Initialization complete!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError(`Failed to load quest data: ${error.message}<br><br>Please check the browser console for details and refresh the page.`);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Trader filters
        document.querySelectorAll('.trader-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateTraderFilters();
            });
        });

        // User level selector in header
        document.getElementById('user-level').addEventListener('change', async (e) => {
            const newLevel = parseInt(e.target.value);
            await this.updateUserLevel(newLevel);
        });

        // Level filters
        document.getElementById('min-level').addEventListener('change', (e) => {
            this.questList.updateFilters({ minLevel: parseInt(e.target.value) });
        });

        document.getElementById('max-level').addEventListener('change', (e) => {
            this.questList.updateFilters({ maxLevel: parseInt(e.target.value) });
        });

        // Search
        document.getElementById('quest-search').addEventListener('input', (e) => {
            this.questList.updateFilters({ searchTerm: e.target.value });
        });

        // View options
        document.getElementById('show-completed').addEventListener('change', (e) => {
            this.questList.updateFilters({ showCompleted: e.target.checked });
        });

        document.getElementById('kappa-only').addEventListener('change', (e) => {
            this.questList.updateFilters({ kappaOnly: e.target.checked });
        });

        document.getElementById('show-locked').addEventListener('change', (e) => {
            this.questList.updateFilters({ showLocked: e.target.checked });
        });

        // Reset filters
        document.querySelector('.reset-btn').addEventListener('click', () => {
            this.resetFilters();
        });

        // Quick path buttons
        document.querySelectorAll('.path-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showQuickPath(e.target.dataset.target);
            });
        });

        // Graph controls
        document.getElementById('fit-graph')?.addEventListener('click', () => {
            this.questGraph.fit();
        });

        document.getElementById('reset-graph')?.addEventListener('click', () => {
            this.questGraph.resetZoom();
        });

        document.getElementById('layout-select')?.addEventListener('change', (e) => {
            this.questGraph.applyLayout(e.target.value);
        });

        // Path finder
        document.getElementById('find-path')?.addEventListener('click', () => {
            this.findPath();
        });

        // Quest optimizer
        document.getElementById('analyze-quests')?.addEventListener('click', () => {
            this.analyzeQuests();
        });

        // Listen for quest updates
        document.addEventListener('questUpdated', () => {
            this.updateStats();
            if (this.currentTab === 'graph') {
                this.questGraph.refresh();
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        this.currentTab = tabName;

        // Refresh graph when switching to it
        if (tabName === 'graph') {
            setTimeout(() => {
                this.questGraph.fit();
            }, 100);
        }

        // Initialize comparison view when switching to it
        if (tabName === 'comparison' && this.userComparison) {
            this.userComparison.initialize();
        }

        // Refresh item tracker when switching to it
        if (tabName === 'items' && this.itemTracker) {
            this.itemTracker.refresh();
        }
    }

    updateTraderFilters() {
        const selectedTraders = new Set();
        document.querySelectorAll('.trader-filter:checked').forEach(checkbox => {
            selectedTraders.add(checkbox.value);
        });

        this.questList.updateFilters({ traders: selectedTraders });

        if (this.currentTab === 'graph') {
            this.questGraph.filterByTrader(Array.from(selectedTraders));
        }
    }

    resetFilters() {
        // Reset checkboxes
        document.querySelectorAll('.trader-filter').forEach(cb => cb.checked = true);
        document.getElementById('show-completed').checked = true;
        document.getElementById('kappa-only').checked = false;
        document.getElementById('show-locked').checked = true;

        // Reset inputs
        document.getElementById('min-level').value = 1;
        document.getElementById('max-level').value = 79;
        document.getElementById('quest-search').value = '';

        // Reset filters
        this.questList.filters = {
            traders: new Set(['prapor', 'therapist', 'fence', 'skier', 'peacekeeper', 'mechanic', 'ragman', 'jaeger', 'lightkeeper']),
            minLevel: 1,
            maxLevel: 79,
            searchTerm: '',
            showCompleted: true,
            kappaOnly: false,
            showLocked: true
        };

        this.questList.render();

        if (this.currentTab === 'graph') {
            this.questGraph.buildGraph(this.questManager.quests);
        }
    }

    showQuickPath(target) {
        let quest = null;
        let pathQuests = null;

        switch (target) {
            case 'lightkeeper':
                pathQuests = this.questManager.getLightkeeperPath();
                this.questList.render(pathQuests);
                if (this.currentTab === 'list') {
                    this.switchTab('graph');
                }
                this.questGraph.showLightkeeperPath();
                break;

            case 'setup':
                quest = this.questManager.findQuestByName('Setup');
                if (quest) {
                    pathQuests = this.questManager.findPathToQuest(quest.id);
                    this.questList.render(pathQuests);
                    if (this.currentTab === 'list') {
                        this.switchTab('graph');
                    }
                    this.questGraph.showPathToQuest(quest.id);
                }
                break;

            case 'test-drive':
                quest = this.questManager.findQuestByName('Test Drive - Part 1');
                if (quest) {
                    pathQuests = this.questManager.findPathToQuest(quest.id);
                    this.questList.render(pathQuests);
                    if (this.currentTab === 'list') {
                        this.switchTab('graph');
                    }
                    this.questGraph.showPathToQuest(quest.id);
                }
                break;
        }
    }

    populateTargetQuestSelect() {
        const select = document.getElementById('target-quest');
        if (!select) return;

        // Sort quests alphabetically
        const sortedQuests = [...this.questManager.quests].sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        sortedQuests.forEach(quest => {
            const option = document.createElement('option');
            option.value = quest.id;
            option.textContent = `${quest.name} (${quest.trader} - Lvl ${quest.minLevel})`;
            select.appendChild(option);
        });

        // Pre-select important quests
        const setupQuest = this.questManager.findQuestByName('Setup');
        if (setupQuest) {
            const setupOption = Array.from(select.options).find(opt => opt.value === setupQuest.id);
            if (setupOption) setupOption.selected = true;
        }
    }

    findPath() {
        const targetQuestId = document.getElementById('target-quest').value;
        const playerLevel = parseInt(document.getElementById('current-level').value);

        if (!targetQuestId) {
            alert('Please select a target quest');
            return;
        }

        const path = this.questManager.findPathToQuest(targetQuestId, playerLevel);
        const targetQuest = this.questManager.getQuestById(targetQuestId);

        if (!path || path.length === 0) {
            document.getElementById('path-result').innerHTML =
                '<div class="error">No path found. Quest may be completed or requirements not met.</div>';
            return;
        }

        // Render path result
        let html = `
            <h3>Path to: ${targetQuest.name}</h3>
            <p>Total quests required: <strong>${path.length}</strong></p>
            <div class="path-steps">
        `;

        path.forEach((quest, index) => {
            const statusIcon = quest.completed ? '✓' : (quest.unlocked ? '○' : '●');
            const statusClass = quest.completed ? 'completed' : (quest.unlocked ? 'available' : 'locked');

            html += `
                <div class="path-step ${statusClass}">
                    <span class="step-number">${index + 1}</span>
                    <span class="step-icon">${statusIcon}</span>
                    <div class="step-info">
                        <strong>${quest.name}</strong>
                        <small>${quest.trader} - Level ${quest.minLevel}</small>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        document.getElementById('path-result').innerHTML = html;

        // Switch to graph and highlight path
        this.switchTab('graph');
        this.questGraph.showPathToQuest(targetQuestId, playerLevel);
    }

    analyzeQuests() {
        const playerLevel = parseInt(document.getElementById('optimizer-level').value);
        this.questManager.updateUnlockedStatus(playerLevel);

        // Get selected paths
        const selectedPaths = [];
        document.querySelectorAll('.path-checkbox:checked').forEach(cb => {
            selectedPaths.push(cb.value);
        });

        // Save optimizer settings
        this.saveOptimizerSettings(playerLevel, selectedPaths);

        // Get quests from selected paths
        let pathQuests = [];
        if (selectedPaths.length > 0) {
            selectedPaths.forEach(path => {
                const quests = this.getQuestsForPath(path, playerLevel);
                pathQuests = pathQuests.concat(quests);
            });
            // Remove duplicates
            pathQuests = [...new Set(pathQuests)];
        }

        // If paths selected, use those quests; otherwise use all available
        const questsToAnalyze = pathQuests.length > 0 ? pathQuests : null;

        const clusters = this.questOptimizer.findSimultaneousQuests(playerLevel, questsToAnalyze);
        const mapPriorities = this.questOptimizer.getMapPriorities(questsToAnalyze);

        this.renderOptimizerResults(clusters, mapPriorities, playerLevel, selectedPaths);
    }

    getQuestsForPath(pathName, playerLevel) {
        let quest = null;
        let path = [];

        switch (pathName) {
            case 'setup':
                quest = this.questManager.findQuestByName('Setup');
                if (quest) {
                    path = this.questManager.findPathToQuest(quest.id, playerLevel);
                }
                break;

            case 'lightkeeper':
                path = this.questManager.getLightkeeperPath();
                break;

            case 'test-drive':
                quest = this.questManager.findQuestByName('Test Drive - Part 1');
                if (quest) {
                    path = this.questManager.findPathToQuest(quest.id, playerLevel);
                }
                break;

            case 'punisher':
                // Find all Punisher quests
                const punisherQuests = this.questManager.quests.filter(q =>
                    q.name.includes('The Punisher')
                );
                punisherQuests.forEach(pq => {
                    const questPath = this.questManager.findPathToQuest(pq.id, playerLevel);
                    if (questPath) path = path.concat(questPath);
                });
                // Remove duplicates
                path = [...new Set(path)];
                break;
        }

        return path || [];
    }

    renderOptimizerResults(clusters, mapPriorities, playerLevel, selectedPaths = []) {
        const container = document.getElementById('optimizer-results');

        if (clusters.length === 0) {
            container.innerHTML = '<div class="no-results">No overlapping quests found at your current level.</div>';
            return;
        }

        let html = '<div class="optimizer-content">';

        // Show selected paths
        if (selectedPaths.length > 0) {
            html += '<div class="selected-paths">';
            html += '<strong>📋 Analyzing paths:</strong> ';
            const pathNames = {
                'setup': 'Setup',
                'lightkeeper': 'Lightkeeper',
                'test-drive': 'Test Drive',
                'punisher': 'Punisher Series'
            };
            html += selectedPaths.map(p => `<span class="path-badge">${pathNames[p]}</span>`).join(' ');
            html += '</div>';
        }

        // Map priorities
        html += '<div class="priority-section">';
        html += '<h3>📍 Map Priority (Most Quest Objectives)</h3>';
        html += '<div class="map-priorities">';
        mapPriorities.slice(0, 5).forEach(({ map, questCount }) => {
            html += `
                <div class="priority-item">
                    <span class="map-name">${map}</span>
                    <span class="quest-count">${questCount} objectives</span>
                </div>
            `;
        });
        html += '</div></div>';

        // Simultaneous quest clusters
        html += '<div class="clusters-section">';
        html += '<h3>⚡ Quests You Can Do Together</h3>';

        clusters.forEach((cluster, index) => {
            html += `
                <div class="cluster-card">
                    <div class="cluster-header">
                        <h4>${cluster.map}</h4>
                        <span class="cluster-count">${cluster.quests.length} quests</span>
                    </div>
                    <div class="cluster-body">
                        <div class="quest-names">
                            ${cluster.quests.map(q => `
                                <div class="quest-item">
                                    <span class="quest-name">${q.name}</span>
                                    <span class="quest-trader trader-${q.trader}">${q.trader}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${cluster.kills.length > 0 ? `
                            <div class="objective-group">
                                <strong>🎯 Kill Objectives:</strong>
                                <ul>
                                    ${cluster.kills.slice(0, 3).map(k => `<li>${k.objective.description}</li>`).join('')}
                                    ${cluster.kills.length > 3 ? `<li class="more">+${cluster.kills.length - 3} more</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                        ${cluster.items.length > 0 ? `
                            <div class="objective-group">
                                <strong>📦 Find/Place Items:</strong>
                                <ul>
                                    ${cluster.items.slice(0, 3).map(i => `<li>${i.objective.description}</li>`).join('')}
                                    ${cluster.items.length > 3 ? `<li class="more">+${cluster.items.length - 3} more</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    <div class="cluster-footer">
                        <button class="btn-show-cluster" data-quests='${JSON.stringify(cluster.quests.map(q => q.id))}'>
                            Show These Quests
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        container.innerHTML = html;

        // Add event listeners to cluster buttons
        container.querySelectorAll('.btn-show-cluster').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questIds = JSON.parse(e.target.dataset.quests);
                const quests = questIds.map(id => this.questManager.getQuestById(id)).filter(Boolean);
                this.questList.render(quests);
                this.switchTab('list');
            });
        });
    }

    updateStats() {
        const stats = this.questManager.getCompletionStats();

        document.getElementById('quest-count').textContent =
            `${stats.total} Total Quests`;

        document.getElementById('completion-rate').textContent =
            `${stats.completed}/${stats.total} (${stats.percentage}%) Complete`;
    }

    saveOptimizerSettings(level, paths) {
        const settings = {
            level: level,
            selectedPaths: paths
        };
        localStorage.setItem('optimizer_settings', JSON.stringify(settings));
    }

    loadOptimizerSettings() {
        const saved = localStorage.getItem('optimizer_settings');
        if (!saved) return;

        try {
            const settings = JSON.parse(saved);

            // Restore level
            const levelInput = document.getElementById('optimizer-level');
            if (levelInput && settings.level) {
                levelInput.value = settings.level;
            }

            // Restore checkbox states
            if (settings.selectedPaths) {
                document.querySelectorAll('.path-checkbox').forEach(cb => {
                    cb.checked = settings.selectedPaths.includes(cb.value);
                });
            }
        } catch (error) {
            console.error('Error loading optimizer settings:', error);
        }
    }

    async updateUserLevel(level) {
        // Update all level-based filters to use the new level
        this.updateLevelFilters(level);
        
        // Save to database if user is authenticated
        const { authService } = await import('./services/auth-service.js');
        const user = authService.currentUser;
        
        if (user) {
            const { success, error } = await userProfileService.updateUserLevel(user.id, level);
            if (!success) {
                console.error('Failed to save user level:', error);
            } else {
                console.log('User level saved:', level);
            }
        }
    }

    updateLevelFilters(level) {
        // Update quest manager unlock status based on level
        this.questManager.updateUnlockedStatus(level);
        
        // Update max level filter to match user level
        const maxLevelInput = document.getElementById('max-level');
        if (maxLevelInput) {
            maxLevelInput.value = level;
            this.questList.updateFilters({ maxLevel: level });
        }
        
        // Update optimizer level
        const optimizerLevelInput = document.getElementById('optimizer-level');
        if (optimizerLevelInput) {
            optimizerLevelInput.value = level;
        }
        
        // Update path finder level
        const pathFinderLevelInput = document.getElementById('current-level');
        if (pathFinderLevelInput) {
            pathFinderLevelInput.value = level;
        }
        
        // Re-render quest list with updated unlock status
        if (this.questList) {
            this.questList.render();
        }
        
        // Update graph if visible
        if (this.currentTab === 'graph' && this.questGraph) {
            this.questGraph.buildGraph(this.questManager.quests);
        }
    }

    showError(message) {
        document.getElementById('quest-list').innerHTML =
            `<div class="error">${message}</div>`;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new TarkovQuestApp();
        app.init();
    });
} else {
    const app = new TarkovQuestApp();
    app.init();
}
