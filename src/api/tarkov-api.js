/**
 * Tarkov.dev GraphQL API Client
 * Fetches real quest data from the Tarkov API
 */

const API_ENDPOINT = 'https://api.tarkov.dev/graphql';

/**
 * Fetch all quests from Tarkov API
 */
export async function fetchQuests() {
    const query = `
        query {
            tasks {
                id
                name
                trader {
                    name
                }
                minPlayerLevel
                experience
                wikiLink
                taskRequirements {
                    task {
                        id
                        name
                    }
                }
                objectives {
                    id
                    type
                    description
                    optional
                    maps {
                        name
                    }
                }
                kappaRequired
                lightkeeperRequired
            }
        }
    `;

    try {
        console.log('Fetching quest data from:', API_ENDPOINT);

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', data);

        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            throw new Error('Failed to fetch quest data: ' + JSON.stringify(data.errors));
        }

        if (!data.data || !data.data.tasks) {
            console.error('No task data in response:', data);
            throw new Error('No task data received from API');
        }

        console.log(`Processing ${data.data.tasks.length} quests...`);
        const processed = processQuestData(data.data.tasks);
        console.log(`Successfully processed ${processed.length} quests`);

        return processed;
    } catch (error) {
        console.error('Error fetching quests:', error);
        throw error;
    }
}

/**
 * Process and normalize quest data
 */
function processQuestData(tasks) {
    return tasks.map(task => {
        // Extract prerequisites - simplified to just get task IDs
        const prerequisites = (task.taskRequirements || [])
            .map(req => req.task?.id)
            .filter(Boolean);

        // Normalize trader name
        const traderName = task.trader?.name?.toLowerCase() || 'unknown';

        // Determine if quest is on path to Lightkeeper
        const isLightkeeperPath = task.lightkeeperRequired ||
            traderName === 'lightkeeper';

        return {
            id: task.id,
            name: task.name,
            trader: traderName,
            minLevel: task.minPlayerLevel || 1,
            experience: task.experience || 0,
            wikiLink: task.wikiLink,
            prerequisites: prerequisites,
            objectives: (task.objectives || []).map(obj => ({
                id: obj.id,
                type: obj.type,
                description: obj.description,
                optional: obj.optional || false,
                maps: obj.maps ? obj.maps.map(m => m.name || m) : []
            })),
            rewards: {
                start: [],
                finish: []
            },
            kappaRequired: task.kappaRequired || false,
            lightkeeperRequired: task.lightkeeperRequired || false,
            isLightkeeperPath: isLightkeeperPath
        };
    });
}

/**
 * Cache manager for quest data
 */
class QuestDataCache {
    constructor() {
        this.cacheKey = 'tarkov_quest_data';
        this.cacheTimeKey = 'tarkov_quest_data_time';
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    get() {
        const cachedData = localStorage.getItem(this.cacheKey);
        const cachedTime = localStorage.getItem(this.cacheTimeKey);

        if (!cachedData || !cachedTime) {
            return null;
        }

        const age = Date.now() - parseInt(cachedTime);
        if (age > this.cacheExpiry) {
            this.clear();
            return null;
        }

        return JSON.parse(cachedData);
    }

    set(data) {
        localStorage.setItem(this.cacheKey, JSON.stringify(data));
        localStorage.setItem(this.cacheTimeKey, Date.now().toString());
    }

    clear() {
        localStorage.removeItem(this.cacheKey);
        localStorage.removeItem(this.cacheTimeKey);
    }
}

export const questCache = new QuestDataCache();
