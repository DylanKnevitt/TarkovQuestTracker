/**
 * Item Storage Service
 * Feature: 003-item-tracker
 * Persists item collection status to localStorage
 */

const STORAGE_KEY = 'tarkov-item-collection';

/**
 * T027-T030: ItemStorageService
 * Manages item collection tracking in localStorage
 * Per research.md storage format: { itemId: { collected: true, quantity: 5 } }
 */
export class ItemStorageService {
    /**
     * T027: Load collection data from localStorage
     * @returns {Map<string, Object>} Map of itemId → { collected: boolean, quantity: number }
     */
    static loadCollection() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            if (!json) {
                return new Map();
            }

            const data = JSON.parse(json);
            const collection = new Map();

            for (const [itemId, status] of Object.entries(data)) {
                collection.set(itemId, {
                    collected: status.collected || false,
                    quantity: status.quantity || 0
                });
            }

            return collection;
        } catch (error) {
            console.error('Failed to load item collection:', error);
            return new Map();
        }
    }

    /**
     * T028: Save collection data to localStorage
     * @param {Map<string, Object>} collection - Map of itemId → { collected, quantity }
     */
    static saveCollection(collection) {
        try {
            const data = {};
            for (const [itemId, status] of collection.entries()) {
                data[itemId] = {
                    collected: status.collected || false,
                    quantity: status.quantity || 0
                };
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save item collection:', error);
            throw error;
        }
    }

    /**
     * T029: Toggle collected status for an item
     * @param {string} itemId
     * @param {boolean} collected
     * @param {number} quantity
     */
    static toggleCollected(itemId, collected, quantity = 0) {
        const collection = this.loadCollection();
        
        collection.set(itemId, {
            collected,
            quantity: collected ? quantity : 0
        });

        this.saveCollection(collection);
        
        // Dispatch event for UI updates
        this.dispatchUpdateEvent(itemId, collected, quantity);
    }

    /**
     * T030: Set collected quantity for an item
     * @param {string} itemId
     * @param {number} quantity
     */
    static setQuantity(itemId, quantity) {
        const collection = this.loadCollection();
        
        const status = collection.get(itemId) || { collected: false, quantity: 0 };
        status.quantity = Math.max(0, quantity);
        status.collected = status.quantity > 0;

        collection.set(itemId, status);
        this.saveCollection(collection);
        
        // Dispatch event for UI updates
        this.dispatchUpdateEvent(itemId, status.collected, status.quantity);
    }

    /**
     * Get collection status for a specific item
     * @param {string} itemId
     * @returns {Object} { collected: boolean, quantity: number }
     */
    static getItemStatus(itemId) {
        const collection = this.loadCollection();
        return collection.get(itemId) || { collected: false, quantity: 0 };
    }

    /**
     * Get all collected items
     * @returns {Array<string>} Array of collected item IDs
     */
    static getCollectedItems() {
        const collection = this.loadCollection();
        const collected = [];

        for (const [itemId, status] of collection.entries()) {
            if (status.collected) {
                collected.push(itemId);
            }
        }

        return collected;
    }

    /**
     * Clear all collection data
     */
    static clearCollection() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            this.dispatchUpdateEvent(null, false, 0);
        } catch (error) {
            console.error('Failed to clear item collection:', error);
        }
    }

    /**
     * Get collection statistics
     * @param {Array<AggregatedItem>} allItems - All aggregated items
     * @returns {Object}
     */
    static getStats(allItems) {
        const collection = this.loadCollection();
        
        let totalItems = allItems.length;
        let collectedItems = 0;
        let totalQuantityNeeded = 0;
        let totalQuantityCollected = 0;

        for (const item of allItems) {
            const status = collection.get(item.item.id) || { collected: false, quantity: 0 };
            
            if (status.collected) {
                collectedItems++;
            }

            totalQuantityNeeded += item.totalQuantity;
            totalQuantityCollected += status.quantity;
        }

        return {
            totalItems,
            collectedItems,
            remainingItems: totalItems - collectedItems,
            collectionRate: totalItems > 0 ? (collectedItems / totalItems * 100).toFixed(1) : 0,
            totalQuantityNeeded,
            totalQuantityCollected,
            quantityRate: totalQuantityNeeded > 0 ? (totalQuantityCollected / totalQuantityNeeded * 100).toFixed(1) : 0
        };
    }

    /**
     * Apply collection status to aggregated items
     * @param {Array<AggregatedItem>} items
     */
    static applyCollectionStatus(items) {
        const collection = this.loadCollection();

        for (const item of items) {
            const status = collection.get(item.item.id) || { collected: false, quantity: 0 };
            item.setCollectionStatus(status);
        }
    }

    /**
     * Dispatch custom event for collection updates
     * @param {string|null} itemId
     * @param {boolean} collected
     * @param {number} quantity
     */
    static dispatchUpdateEvent(itemId, collected, quantity) {
        const event = new CustomEvent('itemCollectionUpdated', {
            detail: {
                itemId,
                collected,
                quantity,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Export collection data for backup
     * @returns {string} JSON string of collection data
     */
    static exportCollection() {
        const json = localStorage.getItem(STORAGE_KEY) || '{}';
        return json;
    }

    /**
     * Import collection data from backup
     * @param {string} json - JSON string of collection data
     */
    static importCollection(json) {
        try {
            const data = JSON.parse(json);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            this.dispatchUpdateEvent(null, false, 0);
        } catch (error) {
            console.error('Failed to import item collection:', error);
            throw error;
        }
    }
}
