/**
 * ItemCorrectionModal Component
 * 
 * Modal for correcting misidentified items from OCR.
 * Provides autocomplete search and quantity editing.
 */

import { ItemMatchingService } from '../services/item-matching-service.js';

export class ItemCorrectionModal {
    constructor() {
        this.modal = null;
        this.currentItem = null;
        this.onSave = null;
        this.onCancel = null;
        this.itemMatchingService = null;
    }

    /**
     * Show the correction modal
     * @param {Object} detectedItem - Item to correct
     * @param {Array} allItems - All available items for search
     * @param {Function} onSave - Callback when correction is saved
     */
    show(detectedItem, allItems, onSave) {
        this.currentItem = detectedItem;
        this.onSave = onSave;
        
        if (!this.itemMatchingService) {
            this.itemMatchingService = new ItemMatchingService(allItems);
        }

        this.render();
        this.attachEventListeners();
        
        // Focus search input
        setTimeout(() => {
            const searchInput = this.modal.querySelector('#itemSearchInput');
            if (searchInput) searchInput.focus();
        }, 100);
    }

    render() {
        // Remove existing modal if present
        const existing = document.querySelector('.item-correction-modal');
        if (existing) existing.remove();

        const modalHTML = `
            <div class="modal-overlay item-correction-modal">
                <div class="modal correction-modal">
                    <div class="modal-header">
                        <h2>Correct Item Detection</h2>
                        <button class="modal-close" id="closeCorrectionModal">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="correction-original">
                            <h3>Detected As:</h3>
                            <p class="detected-text">"${this.currentItem.detectedText}"</p>
                            ${this.currentItem.matchedItem ? `
                                <p class="matched-text">Matched to: <strong>${this.currentItem.matchedItem.name}</strong></p>
                            ` : ''}
                            <p class="confidence-text">Confidence: ${Math.round(this.currentItem.confidence * 100)}%</p>
                        </div>
                        
                        <div class="correction-search">
                            <h3>Search for Correct Item:</h3>
                            <input 
                                type="text" 
                                id="itemSearchInput" 
                                class="search-input"
                                placeholder="Type item name..."
                                autocomplete="off"
                            />
                            <div class="search-results" id="searchResults"></div>
                        </div>
                        
                        <div class="correction-quantity">
                            <h3>Quantity:</h3>
                            <input 
                                type="number" 
                                id="quantityInput" 
                                class="quantity-input"
                                value="${this.currentItem.quantity || 1}"
                                min="1"
                                max="9999"
                            />
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn-secondary" id="cancelBtn">Cancel</button>
                        <button class="btn-primary" id="saveBtn" disabled>Save Correction</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.querySelector('.item-correction-modal');
    }

    attachEventListeners() {
        const searchInput = this.modal.querySelector('#itemSearchInput');
        const searchResults = this.modal.querySelector('#searchResults');
        const quantityInput = this.modal.querySelector('#quantityInput');
        const saveBtn = this.modal.querySelector('#saveBtn');
        const cancelBtn = this.modal.querySelector('#cancelBtn');
        const closeBtn = this.modal.querySelector('#closeCorrectionModal');

        let selectedItem = this.currentItem.matchedItem;

        // Search input
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                saveBtn.disabled = true;
                return;
            }

            // Search for matching items
            const matches = this.itemMatchingService.fuse.search(query, { limit: 10 });
            
            if (matches.length === 0) {
                searchResults.innerHTML = '<div class="no-results">No items found</div>';
                saveBtn.disabled = true;
                return;
            }

            // Display results
            searchResults.innerHTML = matches.map(result => `
                <div class="search-result-item" data-item-id="${result.item.id}">
                    <div class="result-name">${result.item.name}</div>
                    <div class="result-type">${result.item.types?.join(', ') || 'Unknown'}</div>
                </div>
            `).join('');

            // Attach click handlers to results
            searchResults.querySelectorAll('.search-result-item').forEach(el => {
                el.addEventListener('click', () => {
                    const itemId = el.dataset.itemId;
                    selectedItem = matches.find(m => m.item.id === itemId)?.item;
                    
                    // Highlight selected
                    searchResults.querySelectorAll('.search-result-item').forEach(e => 
                        e.classList.remove('selected')
                    );
                    el.classList.add('selected');
                    
                    // Update search input
                    searchInput.value = selectedItem.name;
                    
                    // Enable save button
                    saveBtn.disabled = false;
                });
            });
        });

        // Save button
        saveBtn.addEventListener('click', () => {
            if (!selectedItem) return;

            const correction = {
                originalItem: this.currentItem,
                correctedItem: selectedItem,
                quantity: parseInt(quantityInput.value) || 1,
                timestamp: new Date().toISOString()
            };

            if (this.onSave) {
                this.onSave(correction);
            }

            this.close();
        });

        // Cancel/Close buttons
        const closeModal = () => {
            if (this.onCancel) this.onCancel();
            this.close();
        };

        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        
        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) closeModal();
        });

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}
