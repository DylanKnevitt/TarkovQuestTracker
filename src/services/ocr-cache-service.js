/**
 * OCRCacheService
 * Caches OCR results by screenshot hash to avoid reprocessing
 */

export class OCRCacheService {
    static CACHE_KEY = 'tarkov-ocr-cache';
    static MAX_ENTRIES = 10;
    static MAX_AGE_DAYS = 7;

    /**
     * Generate SHA-256 hash for screenshot
     * Uses first 10KB of image data for faster hashing
     * @param {string} imageData Base64 data URL
     * @returns {Promise<string>} Hash string
     */
    static async generateHash(imageData) {
        try {
            // Use first 10KB for hash (faster than full image)
            const sample = imageData.substring(0, 10000);
            const buffer = new TextEncoder().encode(sample);
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);

            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (error) {
            console.error('Hash generation failed:', error);
            throw error;
        }
    }

    /**
     * Get cached OCR result
     * @param {string} hash Screenshot hash
     * @returns {Object|null} Cached result or null
     */
    static get(hash) {
        try {
            const cache = this.loadCache();
            const entry = cache[hash];

            if (!entry) return null;

            // Check expiration
            const age = Date.now() - entry.timestamp;
            const maxAge = this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

            if (age > maxAge) {
                // Expired - remove from cache
                delete cache[hash];
                this.saveCache(cache);
                return null;
            }

            // Update last access time for LRU
            entry.lastAccess = Date.now();
            this.saveCache(cache);

            console.log('Cache hit for hash:', hash.substring(0, 8));
            return entry.result;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Save result to cache
     * @param {string} hash Screenshot hash
     * @param {Object} result OCR result to cache
     */
    static set(hash, result) {
        try {
            const cache = this.loadCache();

            // Add new entry
            cache[hash] = {
                result: result,
                timestamp: Date.now(),
                lastAccess: Date.now()
            };

            // Evict old entries if needed
            const evictedCache = this.evictOldEntries(cache);
            this.saveCache(evictedCache);

            console.log('Cached result for hash:', hash.substring(0, 8));
        } catch (error) {
            console.error('Cache set error:', error);
            // Non-critical error - continue without caching
        }
    }

    /**
     * Evict old entries using LRU strategy
     * @param {Object} cache Current cache
     * @returns {Object} Cache after eviction
     */
    static evictOldEntries(cache) {
        const entries = Object.entries(cache);

        if (entries.length <= this.MAX_ENTRIES) {
            return cache;
        }

        // Sort by last access (oldest first)
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

        // Keep only newest MAX_ENTRIES
        const kept = entries.slice(-this.MAX_ENTRIES);
        const newCache = Object.fromEntries(kept);

        const evicted = entries.length - kept.length;
        console.log(`Evicted ${evicted} old cache entries`);

        return newCache;
    }

    /**
     * Load cache from localStorage
     * @returns {Object} Cache object
     */
    static loadCache() {
        try {
            const json = localStorage.getItem(this.CACHE_KEY);
            return json ? JSON.parse(json) : {};
        } catch (error) {
            console.error('Cache load error:', error);
            return {};
        }
    }

    /**
     * Save cache to localStorage
     * @param {Object} cache Cache object to save
     */
    static saveCache(cache) {
        try {
            const json = JSON.stringify(cache);

            // Check localStorage quota (~5MB typical limit)
            if (json.length > 5 * 1024 * 1024) {
                console.warn('Cache too large, reducing entries');
                this.MAX_ENTRIES = Math.floor(this.MAX_ENTRIES * 0.7);
                const reduced = this.evictOldEntries(cache);
                localStorage.setItem(this.CACHE_KEY, JSON.stringify(reduced));
            } else {
                localStorage.setItem(this.CACHE_KEY, json);
            }
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('localStorage quota exceeded, clearing OCR cache');
                this.clearCache();
            } else {
                console.error('Cache save error:', error);
            }
        }
    }

    /**
     * Clear all cached entries
     */
    static clearCache() {
        try {
            localStorage.removeItem(this.CACHE_KEY);
            console.log('OCR cache cleared');
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    static getCacheStats() {
        try {
            const cache = this.loadCache();
            const entries = Object.entries(cache);

            return {
                entryCount: entries.length,
                maxEntries: this.MAX_ENTRIES,
                oldestEntry: entries.length > 0 
                    ? new Date(Math.min(...entries.map(e => e[1].timestamp)))
                    : null,
                newestEntry: entries.length > 0
                    ? new Date(Math.max(...entries.map(e => e[1].timestamp)))
                    : null
            };
        } catch (error) {
            console.error('Cache stats error:', error);
            return { entryCount: 0, maxEntries: this.MAX_ENTRIES };
        }
    }

    /**
     * Clean up expired entries
     * @returns {number} Number of entries removed
     */
    static cleanup() {
        try {
            const cache = this.loadCache();
            const entries = Object.entries(cache);
            const maxAge = this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
            const now = Date.now();

            let removed = 0;
            for (const [hash, entry] of entries) {
                const age = now - entry.timestamp;
                if (age > maxAge) {
                    delete cache[hash];
                    removed++;
                }
            }

            if (removed > 0) {
                this.saveCache(cache);
                console.log(`Cleaned up ${removed} expired cache entries`);
            }

            return removed;
        } catch (error) {
            console.error('Cache cleanup error:', error);
            return 0;
        }
    }
}
