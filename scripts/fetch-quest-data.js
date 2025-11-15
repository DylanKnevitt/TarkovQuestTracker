#!/usr/bin/env node

/**
 * Script to fetch and save quest data from Tarkov API
 * Usage: node scripts/fetch-quest-data.js
 */

const fs = require('fs');
const path = require('path');

const API_ENDPOINT = 'https://api.tarkov.dev/graphql';

const query = `
    query {
        tasks {
            id
            name
            trader {
                normalizedName
            }
            minPlayerLevel
            experience
            wikiLink
            taskRequirements {
                task {
                    id
                    name
                }
                status
            }
            traderLevelRequirements {
                trader {
                    normalizedName
                }
                level
            }
            objectives {
                id
                type
                description
                optional
                maps {
                    normalizedName
                }
            }
            startRewards {
                traderStanding {
                    trader {
                        normalizedName
                    }
                    standing
                }
            }
            finishRewards {
                traderStanding {
                    trader {
                        normalizedName
                    }
                    standing
                }
            }
            kappaRequired
            lightkeeperRequired
        }
    }
`;

async function fetchQuestData() {
    console.log('Fetching quest data from Tarkov API...');

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            throw new Error('Failed to fetch quest data');
        }

        const quests = data.data.tasks;
        console.log(`Successfully fetched ${quests.length} quests`);

        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Save to file
        const outputPath = path.join(dataDir, 'quests.json');
        fs.writeFileSync(outputPath, JSON.stringify(quests, null, 2));
        console.log(`Quest data saved to: ${outputPath}`);

        // Generate stats
        const stats = {
            total: quests.length,
            byTrader: {},
            kappaRequired: quests.filter(q => q.kappaRequired).length,
            lightkeeperRequired: quests.filter(q => q.lightkeeperRequired).length,
            lastUpdated: new Date().toISOString()
        };

        quests.forEach(quest => {
            const trader = quest.trader?.normalizedName || 'unknown';
            stats.byTrader[trader] = (stats.byTrader[trader] || 0) + 1;
        });

        console.log('\nQuest Statistics:');
        console.log('================');
        console.log(`Total Quests: ${stats.total}`);
        console.log(`Kappa Required: ${stats.kappaRequired}`);
        console.log(`Lightkeeper Required: ${stats.lightkeeperRequired}`);
        console.log('\nBy Trader:');
        Object.entries(stats.byTrader).sort((a, b) => b[1] - a[1]).forEach(([trader, count]) => {
            console.log(`  ${trader}: ${count}`);
        });

        return quests;
    } catch (error) {
        console.error('Error fetching quest data:', error);
        process.exit(1);
    }
}

fetchQuestData();
