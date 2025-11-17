/**
 * Quest list UI component
 */

export class QuestList {
    constructor(containerId, questManager) {
        this.container = document.getElementById(containerId);
        this.questManager = questManager;
        this.filters = {
            traders: new Set(['prapor', 'therapist', 'fence', 'skier', 'peacekeeper', 'mechanic', 'ragman', 'jaeger', 'lightkeeper']),
            minLevel: 1,
            maxLevel: 79,
            searchTerm: '',
            showCompleted: true,
            kappaOnly: false,
            showLocked: true
        };
    }

    render(quests = null) {
        const questsToRender = quests || this.getFilteredQuests();

        if (questsToRender.length === 0) {
            this.container.innerHTML = '<div class="no-results">No quests found matching your filters.</div>';
            return;
        }

        // Group quests by availability
        const grouped = this.groupByAvailability(questsToRender);

        let html = '';
        // Render Available section first, then Locked
        if (grouped.available && grouped.available.length > 0) {
            html += this.renderAvailabilitySection('available', grouped.available);
        }
        if (grouped.locked && grouped.locked.length > 0) {
            html += this.renderAvailabilitySection('locked', grouped.locked);
        }

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    groupByAvailability(quests) {
        const grouped = {
            available: [],
            locked: []
        };

        quests.forEach(quest => {
            if (quest.unlocked && !quest.completed) {
                grouped.available.push(quest);
            } else if (!quest.unlocked && !quest.completed) {
                grouped.locked.push(quest);
            } else if (quest.completed) {
                // Completed quests go in available section
                grouped.available.push(quest);
            }
        });

        // Sort within each group by level, then trader
        const sortQuests = (a, b) => {
            if (a.minLevel !== b.minLevel) return a.minLevel - b.minLevel;
            return a.trader.localeCompare(b.trader);
        };

        grouped.available.sort(sortQuests);
        grouped.locked.sort(sortQuests);

        return grouped;
    }

    renderAvailabilitySection(status, quests) {
        const sectionTitle = status === 'available' ? 'Available Quests' : 'Locked Quests';
        const questCount = quests.length;
        const completedCount = quests.filter(q => q.completed).length;

        return `
            <div class="availability-section">
                <h2 class="availability-header">
                    <span class="section-title">${sectionTitle}</span>
                    <span class="quest-count">(${status === 'available' && completedCount > 0 ? `${completedCount} completed, ` : ''}${questCount - completedCount} ${status === 'available' ? 'active' : 'locked'})</span>
                </h2>
                <div class="quest-cards">
                    ${quests.map(q => this.renderQuestCard(q)).join('')}
                </div>
            </div>
        `;
    }

    renderQuestCard(quest) {
        const statusClass = quest.completed ? 'completed' : quest.unlocked ? 'unlocked' : 'locked';
        const badges = [];

        if (quest.kappaRequired) badges.push('<span class="badge badge-kappa">Kappa</span>');
        if (quest.lightkeeperRequired) badges.push('<span class="badge badge-lightkeeper">Lightkeeper</span>');
        if (quest.isLightkeeperPath) badges.push('<span class="badge badge-path">LK Path</span>');

        return `
            <div class="quest-card ${statusClass}" data-quest-id="${quest.id}">
                <div class="quest-header">
                    <h3 class="quest-name">${quest.name}</h3>
                    <div class="quest-badges">
                        ${badges.join('')}
                    </div>
                </div>
                <div class="quest-meta">
                    <span class="quest-level">Level ${quest.minLevel}</span>
                    <span class="quest-exp">+${quest.experience.toLocaleString()} XP</span>
                </div>
                <div class="quest-objectives">
                    <strong>Objectives:</strong>
                    <ul>
                        ${quest.objectives.slice(0, 3).map(obj =>
            `<li class="${obj.optional ? 'optional' : ''}">${obj.description}</li>`
        ).join('')}
                        ${quest.objectives.length > 3 ? `<li class="more">+${quest.objectives.length - 3} more...</li>` : ''}
                    </ul>
                </div>
                <div class="quest-actions">
                    <button class="btn-toggle-complete" data-quest-id="${quest.id}">
                        ${quest.completed ? '✓ Completed' : 'Mark Complete'}
                    </button>
                    <button class="btn-view-details" data-quest-id="${quest.id}">View Details</button>
                    ${quest.wikiLink ? `<a href="${quest.wikiLink}" target="_blank" class="btn-wiki">Wiki</a>` : ''}
                </div>
            </div>
        `;
    }

    getFilteredQuests() {
        let quests = this.questManager.quests;

        // Filter by traders
        quests = quests.filter(q => this.filters.traders.has(q.trader.toLowerCase()));

        // Filter by level
        quests = quests.filter(q =>
            q.minLevel >= this.filters.minLevel &&
            q.minLevel <= this.filters.maxLevel
        );

        // Filter by search term
        if (this.filters.searchTerm) {
            quests = this.questManager.searchQuests(this.filters.searchTerm);
        }

        // Filter by completion status
        if (!this.filters.showCompleted) {
            quests = quests.filter(q => !q.completed);
        }

        // Filter by kappa requirement
        if (this.filters.kappaOnly) {
            quests = quests.filter(q => q.kappaRequired);
        }

        // Filter by locked status
        if (!this.filters.showLocked) {
            quests = quests.filter(q => q.unlocked || q.completed);
        }

        return quests;
    }

    updateFilters(newFilters) {
        Object.assign(this.filters, newFilters);
        this.render();
    }

    attachEventListeners() {
        // Toggle complete buttons
        this.container.querySelectorAll('.btn-toggle-complete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const questId = e.target.dataset.questId;
                await this.questManager.toggleComplete(questId);
                this.render();
                // Trigger custom event for other components to update
                document.dispatchEvent(new CustomEvent('questUpdated', { detail: { questId } }));
            });
        });

        // View details buttons
        this.container.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questId = e.target.dataset.questId;
                this.showQuestDetails(questId);
            });
        });

        // Quest card clicks
        this.container.querySelectorAll('.quest-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;

                const questId = card.dataset.questId;
                this.showQuestDetails(questId);
            });
        });
    }

    showQuestDetails(questId) {
        const quest = this.questManager.getQuestById(questId);
        if (!quest) return;

        const prereqs = quest.getDependencies(this.questManager.quests);
        const dependents = quest.getDependents(this.questManager.quests);

        const modalContent = `
            <h2>${quest.name}</h2>
            <div class="quest-detail-meta">
                <span>Trader: ${quest.trader}</span>
                <span>Level: ${quest.minLevel}</span>
                <span>XP: ${quest.experience.toLocaleString()}</span>
            </div>
            
            ${quest.kappaRequired ? '<p class="highlight">✓ Required for Kappa container</p>' : ''}
            ${quest.lightkeeperRequired ? '<p class="highlight">✓ Required for Lightkeeper</p>' : ''}
            
            <h3>Objectives</h3>
            <ul>
                ${quest.objectives.map(obj => `
                    <li class="${obj.optional ? 'optional' : ''}">
                        ${obj.description}
                        ${obj.maps && obj.maps.length > 0 ? `<br><small>Maps: ${obj.maps.join(', ')}</small>` : ''}
                    </li>
                `).join('')}
            </ul>

            ${prereqs.length > 0 ? `
                <h3>Prerequisites</h3>
                <ul>
                    ${prereqs.map(q => `<li>${q.name} (${q.trader})</li>`).join('')}
                </ul>
            ` : ''}

            ${dependents.length > 0 ? `
                <h3>Unlocks</h3>
                <ul>
                    ${dependents.map(q => `<li>${q.name} (${q.trader})</li>`).join('')}
                </ul>
            ` : ''}

            ${quest.wikiLink ? `<p><a href="${quest.wikiLink}" target="_blank" class="btn-wiki-large">View on Wiki →</a></p>` : ''}
        `;

        this.showModal(modalContent);
    }

    showModal(content) {
        const modal = document.getElementById('quest-modal');
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = content;
        modal.style.display = 'block';

        // Close button
        modal.querySelector('.close').onclick = () => {
            modal.style.display = 'none';
        };

        // Click outside to close
        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
}
