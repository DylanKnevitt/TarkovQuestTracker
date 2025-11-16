/**
 * Hideout Card Component
 * Feature: 004-hideout-item-enhancements
 * Displays individual hideout module build status and requirements
 */

/**
 * T011: HideoutCard component
 * Renders hideout module card with build status and requirements
 */
export class HideoutCard {
    /**
     * Render hideout module card
     * @param {HideoutModule} module - The hideout module to display
     * @param {HideoutManager} hideoutManager - Manager for checking buildability
     * @returns {string} HTML string
     */
    static render(module, hideoutManager) {
        const moduleKey = module.getModuleKey();
        const isCompleted = module.completed;
        const isBuildable = !isCompleted && hideoutManager.isModuleBuildable(module.stationId, module.level);

        const statusBadge = isCompleted
            ? '<span class="hideout-status-badge built">✓ Built</span>'
            : isBuildable
                ? '<span class="hideout-status-badge buildable">⚙ Buildable</span>'
                : '<span class="hideout-status-badge locked">🔒 Locked</span>';

        const buttonText = isCompleted ? 'Mark as Unbuilt' : 'Mark as Built';
        const buttonClass = isCompleted ? 'toggle-build-btn built' : 'toggle-build-btn';

        const requirementsHtml = !isCompleted ? this.renderRequirements(module) : '';

        return `
            <div class="hideout-card" data-module-key="${moduleKey}">
                <div class="hideout-card-header">
                    <div class="hideout-card-icon">🏠</div>
                    <div class="hideout-card-title">
                        <h3>${module.stationName}</h3>
                        <p class="hideout-card-level">Level ${module.level}</p>
                    </div>
                    ${statusBadge}
                </div>
                
                ${requirementsHtml}
                
                <div class="hideout-card-actions">
                    <button class="${buttonClass}" data-module-key="${moduleKey}" data-completed="${isCompleted}">
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render requirements section for unbuilt modules
     * @param {HideoutModule} module
     * @returns {string} HTML string
     */
    static renderRequirements(module) {
        if (!module.itemRequirements || module.itemRequirements.length === 0) {
            return '<div class="hideout-card-requirements"><p class="no-requirements">No item requirements</p></div>';
        }

        const itemsHtml = module.itemRequirements
            .map(req => `
                <li class="requirement-item">
                    <span class="requirement-name">${req.itemName}</span>
                    <span class="requirement-quantity">×${req.quantity}</span>
                </li>
            `)
            .join('');

        const prerequisitesHtml = this.renderPrerequisites(module);

        return `
            <div class="hideout-card-requirements">
                <h4>Required Items:</h4>
                <ul class="requirements-list">
                    ${itemsHtml}
                </ul>
                ${prerequisitesHtml}
            </div>
        `;
    }

    /**
     * Render prerequisites (station level requirements)
     * @param {HideoutModule} module
     * @returns {string} HTML string
     */
    static renderPrerequisites(module) {
        if (!module.stationLevelRequirements || module.stationLevelRequirements.length === 0) {
            return '';
        }

        const prereqsHtml = module.stationLevelRequirements
            .map(req => `
                <li class="prerequisite-item">
                    ${req.stationName} Level ${req.level}
                </li>
            `)
            .join('');

        return `
            <div class="hideout-prerequisites">
                <h4>Prerequisites:</h4>
                <ul class="prerequisites-list">
                    ${prereqsHtml}
                </ul>
            </div>
        `;
    }
}
