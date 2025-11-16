/**
 * Item Collection Service with Supabase Sync
 * Feature: 003-item-tracker
 * Syncs item collection quantities to Supabase database per user
 */

import { getSupabaseClient } from '../api/supabase-client.js';

const STORAGE_KEY = 'tarkov-item-collection';

/**
 * ItemCollectionService with cloud sync support
 * Manages item collection tracking with localStorage fallback and Supabase sync
 */
export class ItemCollectionService {
    /**
     * Load collection data from Supabase (if authenticated) or localStorage
     * @returns {Promise<Map<string, Object>>} Map of itemId → { collected: boolean, quantity: number }
     */
    static async loadCollection() {
        const supabase = getSupabaseClient();
        
        if (supabase) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    console.log('Loading collection from Supabase for user:', user.id);
                    // Load from Supabase
                    const { data, error } = await supabase
                        .from('item_collection')
                        .select('item_id, collected_quantity')
                        .eq('user_id', user.id);
                    
                    if (error) throw error;
                    
                    console.log('Loaded', data?.length || 0, 'items from Supabase');
                    
                    const collection = new Map();
                    for (const item of data || []) {
                        collection.set(item.item_id, {
                            collected: item.collected_quantity > 0,
                            quantity: item.collected_quantity
                        });
                    }
                    
                    // Sync to localStorage as cache
                    this.saveToLocalStorage(collection);
                    
                    return collection;
                } else {
                    console.log('No authenticated user, using localStorage');
                }
            } catch (error) {
                console.error('Failed to load collection from Supabase:', error);
            }
        } else {
            console.log('Supabase not configured, using localStorage');
        }
        
        // Fallback to localStorage
        const localCollection = this.loadFromLocalStorage();
        console.log('Loaded', localCollection.size, 'items from localStorage');
        return localCollection;
    }

    /**
     * Load from localStorage only
     * @returns {Map<string, Object>}
     */
    static loadFromLocalStorage() {
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
            console.error('Failed to load item collection from localStorage:', error);
            return new Map();
        }
    }

    /**
     * Save collection data to both Supabase and localStorage
     * @param {Map<string, Object>} collection - Map of itemId → { collected, quantity }
     */
    static async saveCollection(collection) {
        // Always save to localStorage first (immediate feedback)
        this.saveToLocalStorage(collection);
        
        const supabase = getSupabaseClient();
        
        if (supabase) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    // Prepare batch upsert data
                    const upsertData = [];
                    for (const [itemId, status] of collection.entries()) {
                        if (status.quantity > 0) {
                            upsertData.push({
                                user_id: user.id,
                                item_id: itemId,
                                collected_quantity: status.quantity
                            });
                        }
                    }
                    
                    if (upsertData.length > 0) {
                        const { error } = await supabase
                            .from('item_collection')
                            .upsert(upsertData, {
                                onConflict: 'user_id,item_id'
                            });
                        
                        if (error) throw error;
                    }
                    
                    // Delete items with 0 quantity
                    const zeroItems = [];
                    for (const [itemId, status] of collection.entries()) {
                        if (status.quantity === 0) {
                            zeroItems.push(itemId);
                        }
                    }
                    
                    if (zeroItems.length > 0) {
                        await supabase
                            .from('item_collection')
                            .delete()
                            .eq('user_id', user.id)
                            .in('item_id', zeroItems);
                    }
                }
            } catch (error) {
                console.error('Failed to sync collection to Supabase:', error);
            }
        }
    }

    /**
     * Save to localStorage only
     * @param {Map<string, Object>} collection
     */
    static saveToLocalStorage(collection) {
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
            console.error('Failed to save item collection to localStorage:', error);
            throw error;
        }
    }

    /**
     * Set collected quantity for an item (syncs to database)
     * @param {string} itemId
     * @param {number} quantity
     * @param {boolean} dispatchEvent - Whether to dispatch update event (default: false)
     */
    static async setQuantity(itemId, quantity, dispatchEvent = false) {
        const collection = await this.loadCollection();
        
        const status = collection.get(itemId) || { collected: false, quantity: 0 };
        status.quantity = Math.max(0, quantity);
        status.collected = status.quantity > 0;

        collection.set(itemId, status);
        await this.saveCollection(collection);
        
        // Only dispatch event if requested (e.g., for external updates)
        if (dispatchEvent) {
            this.dispatchUpdateEvent(itemId, status.collected, status.quantity);
        }
    }

    /**
     * Toggle collected status for an item (legacy method for backwards compatibility)
     * @param {string} itemId
     * @param {boolean} collected
     * @param {number} quantity
     */
    static async toggleCollected(itemId, collected, quantity = 0) {
        await this.setQuantity(itemId, collected ? quantity : 0);
    }

    /**
     * Get collection status for a specific item
     * @param {string} itemId
     * @returns {Promise<Object>} { collected: boolean, quantity: number }
     */
    static async getItemStatus(itemId) {
        const collection = await this.loadCollection();
        return collection.get(itemId) || { collected: false, quantity: 0 };
    }

    /**
     * Get all collected items
     * @returns {Promise<Array<string>>} Array of collected item IDs
     */
    static async getCollectedItems() {
        const collection = await this.loadCollection();
        const collected = [];

        for (const [itemId, status] of collection.entries()) {
            if (status.collected) {
                collected.push(itemId);
            }
        }

        return collected;
    }

    /**
     * Clear all collection data (both localStorage and database)
     */
    static async clearCollection() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            
            const supabase = getSupabaseClient();
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('item_collection')
                        .delete()
                        .eq('user_id', user.id);
                }
            }
            
            this.dispatchUpdateEvent(null, false, 0);
        } catch (error) {
            console.error('Failed to clear item collection:', error);
        }
    }

    /**
     * Get collection statistics
     * @param {Array<AggregatedItem>} allItems - All aggregated items
     * @returns {Promise<Object>}
     */
    static async getStats(allItems) {
        const collection = await this.loadCollection();
        
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
    static async applyCollectionStatus(items) {
        const collection = await this.loadCollection();

        for (const item of items) {
            const status = collection.get(item.item.id) || { collected: false, quantity: 0 };
            item.setCollectionStatus(status.collected, status.quantity);
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
     * @returns {Promise<string>} JSON string of collection data
     */
    static async exportCollection() {
        const collection = await this.loadCollection();
        const data = {};
        for (const [itemId, status] of collection.entries()) {
            data[itemId] = status;
        }
        return JSON.stringify(data);
    }

    /**
     * Import collection data from backup
     * @param {string} json - JSON string of collection data
     */
    static async importCollection(json) {
        try {
            const data = JSON.parse(json);
            const collection = new Map();
            
            for (const [itemId, status] of Object.entries(data)) {
                collection.set(itemId, status);
            }
            
            await this.saveCollection(collection);
            this.dispatchUpdateEvent(null, false, 0);
        } catch (error) {
            console.error('Failed to import item collection:', error);
            throw error;
        }
    }
}
