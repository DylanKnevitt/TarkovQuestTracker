/**
 * Tarkov.dev Items and Hideout API Client
 * Feature: 003-item-tracker
 * Handles GraphQL queries for items and hideout stations with 24-hour caching
 */

const API_ENDPOINT = 'https://api.tarkov.dev/graphql';

// Cache durations
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Cache keys
const ITEMS_CACHE_KEY = 'tarkov-items-cache';
const ITEMS_CACHE_TIME_KEY = 'tarkov-items-cache-time';
const HIDEOUT_CACHE_KEY = 'tarkov-hideout-cache';
const HIDEOUT_CACHE_TIME_KEY = 'tarkov-hideout-cache-time';

/**
 * T005: Fetch items from Tarkov.dev API with minimal query
 * T007: 24-hour cache logic for items API
 * T009: Error handling with stale cache fallback
 * 
 * @returns {Promise<Array>} Array of item objects
 */
export async function fetchItems() {
    // Check cache validity
    const cachedTime = localStorage.getItem(ITEMS_CACHE_TIME_KEY);
    if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
        const cached = localStorage.getItem(ITEMS_CACHE_KEY);
        if (cached) {
            console.log('Using cached items data (age: ' + Math.round((Date.now() - parseInt(cachedTime)) / 1000 / 60) + ' minutes)');
            return JSON.parse(cached);
        }
    }

    // Minimal query for MVP (per contracts/tarkov-items-api.md)
    const query = `query GetItems {
        items {
            id
            name
            shortName
            iconLink
            wikiLink
            types
        }
    }`;

    try {
        console.log('Fetching fresh items data from Tarkov.dev API...');
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            throw new Error(`GraphQL error: ${data.errors[0].message}`);
        }

        const items = data.data.items;
        console.log(`Fetched ${items.length} items from API`);

        // Cache the response
        localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(items));
        localStorage.setItem(ITEMS_CACHE_TIME_KEY, Date.now().toString());

        return items;
    } catch (error) {
        console.error('Failed to fetch items:', error);

        // Try to use stale cache (T009: error handling with fallback)
        const staleCache = localStorage.getItem(ITEMS_CACHE_KEY);
        if (staleCache) {
            console.warn('Using stale cached items data due to network error');
            return JSON.parse(staleCache);
        }

        // No cache available, throw error
        throw new Error(`Failed to load items: ${error.message}. Please check your internet connection and try again.`);
    }
}

/**
 * T006: Fetch hideout stations from Tarkov.dev API
 * T008: 24-hour cache logic for hideout API
 * T009: Error handling with stale cache fallback
 * 
 * @returns {Promise<Array>} Array of hideout station objects
 */
export async function fetchHideoutStations() {
    // Check cache validity
    const cachedTime = localStorage.getItem(HIDEOUT_CACHE_TIME_KEY);
    if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
        const cached = localStorage.getItem(HIDEOUT_CACHE_KEY);
        if (cached) {
            console.log('Using cached hideout data (age: ' + Math.round((Date.now() - parseInt(cachedTime)) / 1000 / 60) + ' minutes)');
            return JSON.parse(cached);
        }
    }

    // Minimal query for MVP (per contracts/tarkov-hideout-api.md)
    const query = `query GetHideoutStations {
        hideoutStations {
            id
            name
            levels {
                level
                itemRequirements {
                    item {
                        id
                    }
                    count
                }
                stationLevelRequirements {
                    station {
                        id
                    }
                    level
                }
            }
        }
    }`;

    try {
        console.log('Fetching fresh hideout data from Tarkov.dev API...');
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            throw new Error(`GraphQL error: ${data.errors[0].message}`);
        }

        const stations = data.data.hideoutStations;
        console.log(`Fetched ${stations.length} hideout stations from API`);

        // Cache the response
        localStorage.setItem(HIDEOUT_CACHE_KEY, JSON.stringify(stations));
        localStorage.setItem(HIDEOUT_CACHE_TIME_KEY, Date.now().toString());

        return stations;
    } catch (error) {
        console.error('Failed to fetch hideout stations:', error);

        // Try to use stale cache (T009: error handling with fallback)
        const staleCache = localStorage.getItem(HIDEOUT_CACHE_KEY);
        if (staleCache) {
            console.warn('Using stale hideout data due to network error');
            return JSON.parse(staleCache);
        }

        // No cache available - non-blocking for MVP (hideout items won't show but quest items still work)
        console.warn('Hideout items unavailable - showing quest items only');
        return [];
    }
}

/**
 * Clear all API caches (useful for debugging or manual refresh)
 */
export function clearApiCache() {
    localStorage.removeItem(ITEMS_CACHE_KEY);
    localStorage.removeItem(ITEMS_CACHE_TIME_KEY);
    localStorage.removeItem(HIDEOUT_CACHE_KEY);
    localStorage.removeItem(HIDEOUT_CACHE_TIME_KEY);
    console.log('API caches cleared');
}

/**
 * Get cache status for debugging
 * @returns {Object} Cache status information
 */
export function getCacheStatus() {
    const itemsCacheTime = localStorage.getItem(ITEMS_CACHE_TIME_KEY);
    const hideoutCacheTime = localStorage.getItem(HIDEOUT_CACHE_TIME_KEY);

    return {
        items: {
            cached: !!localStorage.getItem(ITEMS_CACHE_KEY),
            age: itemsCacheTime ? Date.now() - parseInt(itemsCacheTime) : null,
            ageMinutes: itemsCacheTime ? Math.round((Date.now() - parseInt(itemsCacheTime)) / 1000 / 60) : null,
            valid: itemsCacheTime ? Date.now() - parseInt(itemsCacheTime) < CACHE_DURATION : false
        },
        hideout: {
            cached: !!localStorage.getItem(HIDEOUT_CACHE_KEY),
            age: hideoutCacheTime ? Date.now() - parseInt(hideoutCacheTime) : null,
            ageMinutes: hideoutCacheTime ? Math.round((Date.now() - parseInt(hideoutCacheTime)) / 1000 / 60) : null,
            valid: hideoutCacheTime ? Date.now() - parseInt(hideoutCacheTime) < CACHE_DURATION : false
        }
    };
}
