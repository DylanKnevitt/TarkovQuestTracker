/**
 * OCRResultsViewer Component
 * 
 * Displays OCR analysis results including detected items, confidence levels,
 * and keep/sell recommendations. Shows progress during analysis.
 */

import { RecommendationBadge } from './recommendation-badge.js';

export class OCRResultsViewer {
    constructor(container) {
        this.container = container;
        this.analysisSession = null;
        this.onAnalysisComplete = null;
    }

    /**
     * Show loading state with progress
     */
    showLoading() {
        this.container.innerHTML = `
            <div class="ocr-results-loading">
                <div class="loading-spinner"></div>
                <h3>Analyzing Screenshot...</h3>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <div class="progress-text" id="progressText">Initializing OCR...</div>
                </div>
                <p class="loading-hint">This may take 10-30 seconds depending on image size</p>
            </div>
        `;
    }

    /**
     * Update progress during OCR analysis
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    updateProgress(progress, message) {
        const progressFill = this.container.querySelector('#progressFill');
        const progressText = this.container.querySelector('#progressText');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = message;
        }
    }

    /**
     * Display analysis results
     * @param {Object} analysisSession - Complete analysis session with OCR results and recommendations
     */
    showResults(analysisSession) {
        this.analysisSession = analysisSession;
        
        const detectedItems = analysisSession.ocrResult.detectedItems;
        const hasItems = detectedItems && detectedItems.length > 0;

        this.container.innerHTML = `
            <div class="ocr-results">
                <div class="results-header">
                    <h3>Analysis Complete</h3>
                    <div class="results-summary">
                        <span class="summary-stat">
                            <strong>${detectedItems ? detectedItems.length : 0}</strong> items detected
                        </span>
                        <span class="summary-stat">
                            <strong>${this.countByAction(detectedItems, 'KEEP')}</strong> to keep
                        </span>
                        <span class="summary-stat">
                            <strong>${this.countByAction(detectedItems, 'SELL')}</strong> to sell
                        </span>
                    </div>
                </div>

                ${this.renderConfidenceWarning(detectedItems)}

                <div class="results-body">
                    ${hasItems ? this.renderItemsList(detectedItems) : this.renderNoItemsFound()}
                </div>

                <div class="results-actions">
                    <button class="btn-secondary" id="newAnalysisBtn">Analyze Another</button>
                    ${hasItems ? '<button class="btn-primary" id="acceptAllBtn">Accept All Results</button>' : ''}
                </div>
            </div>
        `;

        this.attachResultsListeners();
    }

    /**
     * Render confidence warning if low-confidence items detected
     * @param {Array} detectedItems - Array of detected items
     * @returns {string} HTML for warning banner
     */
    renderConfidenceWarning(detectedItems) {
        if (!detectedItems || detectedItems.length === 0) return '';

        const lowConfidenceCount = detectedItems.filter(item => 
            item.confidence < 0.7
        ).length;

        if (lowConfidenceCount === 0) return '';

        return `
            <div class="confidence-warning">
                <span class="warning-icon">⚠️</span>
                <div class="warning-content">
                    <strong>Low Confidence Detections</strong>
                    <p>${lowConfidenceCount} item(s) detected with lower confidence. Review these items carefully before accepting.</p>
                </div>
            </div>
        `;
    }

    /**
     * Render list of detected items
     * @param {Array} detectedItems - Array of detected items
     * @returns {string} HTML for items list
     */
    renderItemsList(detectedItems) {
        const sortedItems = [...detectedItems].sort((a, b) => {
            // Sort by recommendation (KEEP first), then by confidence
            if (a.recommendation.action !== b.recommendation.action) {
                return a.recommendation.action === 'KEEP' ? -1 : 1;
            }
            return b.confidence - a.confidence;
        });

        return `
            <div class="detected-items-list">
                ${sortedItems.map(item => this.renderItemCard(item)).join('')}
            </div>
        `;
    }

    /**
     * Render individual item card
     * @param {Object} item - Detected item object
     * @returns {string} HTML for item card
     */
    renderItemCard(item) {
        const confidencePercent = Math.round(item.confidence * 100);
        const confidenceClass = item.confidence >= 0.8 ? 'high' : 
                               item.confidence >= 0.6 ? 'medium' : 'low';

        return `
            <div class="detected-item-card" data-item-id="${item.id}">
                <div class="item-card-header">
                    <div class="item-info">
                        <h4 class="item-name">${item.matchedItem ? item.matchedItem.name : item.detectedText}</h4>
                        ${item.quantity > 1 ? `<span class="item-quantity">x${item.quantity}</span>` : ''}
                    </div>
                    <div class="item-recommendation" data-recommendation="${item.recommendation.action}">
                        ${this.createBadgeHTML(item.recommendation)}
                    </div>
                </div>
                
                <div class="item-card-body">
                    <div class="confidence-indicator">
                        <span class="confidence-label">Confidence:</span>
                        <div class="confidence-bar">
                            <div class="confidence-fill confidence-${confidenceClass}" 
                                 style="width: ${confidencePercent}%"></div>
                        </div>
                        <span class="confidence-value">${confidencePercent}%</span>
                    </div>
                    
                    ${item.detectedText !== item.matchedItem?.name ? `
                        <div class="detection-info">
                            <span class="detection-label">Detected as:</span>
                            <span class="detection-text">"${item.detectedText}"</span>
                        </div>
                    ` : ''}
                    
                    ${item.recommendation.reason ? `
                        <div class="recommendation-reason">
                            ${item.recommendation.reason}
                        </div>
                    ` : ''}
                </div>

                <div class="item-card-actions">
                    <button class="btn-icon" data-action="edit" data-item-id="${item.id}" 
                            title="Correct item identification">
                        ✏️ Edit
                    </button>
                    <button class="btn-icon" data-action="remove" data-item-id="${item.id}"
                            title="Remove this item">
                        🗑️ Remove
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Create HTML for recommendation badge
     * @param {Object} recommendation - Recommendation object
     * @returns {string} HTML string
     */
    createBadgeHTML(recommendation) {
        const icon = recommendation.action === 'KEEP' ? '✓' : '✗';
        const priorityClass = recommendation.priority ? 
            `priority-${recommendation.priority.toLowerCase().replace(/\s+/g, '-')}` : '';
        
        return `
            <div class="recommendation-badge recommendation-${recommendation.action.toLowerCase()} ${priorityClass}"
                 title="${recommendation.reason || ''}">
                <span class="badge-icon">${icon}</span>
                <span class="badge-text">${recommendation.action}</span>
            </div>
        `;
    }

    /**
     * Render no items found message
     * @returns {string} HTML for empty state
     */
    renderNoItemsFound() {
        return `
            <div class="no-items-found">
                <div class="empty-state-icon">🔍</div>
                <h3>No Items Detected</h3>
                <p>The OCR analysis didn't detect any recognizable items in the screenshot.</p>
                <div class="suggestions">
                    <h4>Try these tips:</h4>
                    <ul>
                        <li>Use a higher resolution screenshot (1080p+)</li>
                        <li>Ensure text is clearly visible and not blurred</li>
                        <li>Close any overlapping UI elements or tooltips</li>
                        <li>Capture the inventory grid view if possible</li>
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * Show error state
     * @param {Error} error - Error object
     */
    showError(error) {
        this.container.innerHTML = `
            <div class="ocr-results-error">
                <div class="error-icon">❌</div>
                <h3>Analysis Failed</h3>
                <p class="error-message">${error.message || 'An unexpected error occurred during OCR analysis.'}</p>
                <div class="error-details">
                    <p>This could be due to:</p>
                    <ul>
                        <li>Image processing error</li>
                        <li>OCR engine initialization failure</li>
                        <li>Unsupported image format</li>
                        <li>Browser compatibility issue</li>
                    </ul>
                </div>
                <button class="btn-primary" id="retryBtn">Try Again</button>
            </div>
        `;

        const retryBtn = this.container.querySelector('#retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (this.onRetry) this.onRetry();
            });
        }
    }

    /**
     * Attach event listeners to results UI
     */
    attachResultsListeners() {
        // New analysis button
        const newAnalysisBtn = this.container.querySelector('#newAnalysisBtn');
        if (newAnalysisBtn) {
            newAnalysisBtn.addEventListener('click', () => {
                if (this.onNewAnalysis) this.onNewAnalysis();
            });
        }

        // Accept all button
        const acceptAllBtn = this.container.querySelector('#acceptAllBtn');
        if (acceptAllBtn) {
            acceptAllBtn.addEventListener('click', () => {
                if (this.onAcceptAll) this.onAcceptAll(this.analysisSession);
            });
        }

        // Item action buttons (edit/remove)
        const actionButtons = this.container.querySelectorAll('[data-action]');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.dataset.action;
                const itemId = button.dataset.itemId;
                this.handleItemAction(action, itemId);
            });
        });
    }

    /**
     * Handle item-level actions (edit/remove)
     * @param {string} action - Action type (edit/remove)
     * @param {string} itemId - Item ID
     */
    handleItemAction(action, itemId) {
        const item = this.analysisSession.ocrResult.detectedItems.find(
            i => i.id === itemId
        );
        
        if (!item) return;

        if (action === 'edit') {
            if (this.onEditItem) this.onEditItem(item);
        } else if (action === 'remove') {
            if (this.onRemoveItem) this.onRemoveItem(item);
        }
    }

    /**
     * Count items by recommendation action
     * @param {Array} items - Array of detected items
     * @param {string} action - Action to count (KEEP/SELL)
     * @returns {number} Count
     */
    countByAction(items, action) {
        if (!items) return 0;
        return items.filter(item => item.recommendation.action === action).length;
    }

    /**
     * Clear the viewer
     */
    clear() {
        this.container.innerHTML = '';
        this.analysisSession = null;
    }
}
