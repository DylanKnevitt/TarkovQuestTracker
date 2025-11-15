/**
 * Quest Optimizer - Finds quests with overlapping objectives
 */

export class QuestOptimizer {
    constructor(questManager) {
        this.questManager = questManager;
    }

    /**
     * Analyze quests and find overlapping objectives
     */
    analyzeOverlaps() {
        const quests = this.questManager.quests;
        const overlaps = {
            byMap: {},
            byLocation: {},
            byKillType: {},
            byItemType: {},
            multiObjective: []
        };

        quests.forEach(quest => {
            // Group by maps
            quest.objectives.forEach(obj => {
                if (obj.maps && obj.maps.length > 0) {
                    obj.maps.forEach(map => {
                        if (!overlaps.byMap[map]) overlaps.byMap[map] = [];
                        overlaps.byMap[map].push({
                            quest: quest,
                            objective: obj
                        });
                    });
                }
            });

            // Identify kill objectives
            quest.objectives.forEach(obj => {
                const desc = obj.description.toLowerCase();
                if (desc.includes('eliminate') || desc.includes('kill') || desc.includes('neutralize')) {
                    const killType = this.extractKillType(obj.description);
                    if (killType) {
                        if (!overlaps.byKillType[killType]) overlaps.byKillType[killType] = [];
                        overlaps.byKillType[killType].push({
                            quest: quest,
                            objective: obj
                        });
                    }
                }
            });

            // Identify find/collect objectives
            quest.objectives.forEach(obj => {
                const desc = obj.description.toLowerCase();
                if (desc.includes('find') || desc.includes('locate') || desc.includes('hand over') || desc.includes('obtain')) {
                    const itemType = this.extractItemType(obj.description);
                    if (itemType) {
                        if (!overlaps.byItemType[itemType]) overlaps.byItemType[itemType] = [];
                        overlaps.byItemType[itemType].push({
                            quest: quest,
                            objective: obj
                        });
                    }
                }
            });
        });

        return overlaps;
    }

    /**
     * Get optimized quest path by grouping similar objectives
     */
    getOptimizedPath(targetQuestId, playerLevel = 79) {
        const basePath = this.questManager.findPathToQuest(targetQuestId, playerLevel);
        if (!basePath || basePath.length === 0) return null;

        // Group quests by map/location
        const grouped = this.groupQuestsByLocation(basePath);

        return {
            basePath: basePath,
            grouped: grouped,
            recommendations: this.generateRecommendations(grouped)
        };
    }

    /**
     * Group quests by common locations
     */
    groupQuestsByLocation(quests) {
        const mapGroups = {};

        quests.forEach(quest => {
            const maps = new Set();
            quest.objectives.forEach(obj => {
                if (obj.maps) {
                    obj.maps.forEach(map => maps.add(map));
                }
            });

            maps.forEach(map => {
                if (!mapGroups[map]) mapGroups[map] = [];
                mapGroups[map].push(quest);
            });
        });

        // Sort by number of quests
        return Object.entries(mapGroups)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([map, quests]) => ({
                map: map,
                quests: quests,
                count: quests.length
            }));
    }

    /**
     * Find quests that can be done simultaneously
     */
    findSimultaneousQuests(playerLevel = 79, questList = null) {
        let available;

        if (questList && questList.length > 0) {
            // Use provided quest list
            available = questList.filter(q =>
                !q.completed && q.minLevel <= playerLevel
            );
        } else {
            // Use all available quests
            available = this.questManager.quests.filter(q =>
                q.unlocked && !q.completed && q.minLevel <= playerLevel
            );
        }

        const mapClusters = {};

        available.forEach(quest => {
            quest.objectives.forEach(obj => {
                if (obj.maps && obj.maps.length > 0) {
                    obj.maps.forEach(map => {
                        if (!mapClusters[map]) {
                            mapClusters[map] = {
                                map: map,
                                quests: [],
                                kills: [],
                                items: [],
                                locations: []
                            };
                        }

                        mapClusters[map].quests.push(quest);

                        const desc = obj.description.toLowerCase();
                        if (desc.includes('eliminate') || desc.includes('kill')) {
                            mapClusters[map].kills.push({ quest, objective: obj });
                        }
                        if (desc.includes('find') || desc.includes('locate') || desc.includes('place')) {
                            mapClusters[map].items.push({ quest, objective: obj });
                        }
                        if (desc.includes('mark') || desc.includes('survive')) {
                            mapClusters[map].locations.push({ quest, objective: obj });
                        }
                    });
                }
            });
        });

        // Remove duplicates and sort
        Object.keys(mapClusters).forEach(map => {
            mapClusters[map].quests = [...new Set(mapClusters[map].quests)];
        });

        return Object.values(mapClusters)
            .filter(cluster => cluster.quests.length > 1)
            .sort((a, b) => b.quests.length - a.quests.length);
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations(groupedData) {
        const recommendations = [];

        groupedData.forEach(group => {
            if (group.count >= 3) {
                recommendations.push({
                    type: 'map-focus',
                    priority: 'high',
                    message: `Focus on ${group.map}: Complete ${group.count} quests here`,
                    quests: group.quests.map(q => q.name)
                });
            } else if (group.count === 2) {
                recommendations.push({
                    type: 'map-focus',
                    priority: 'medium',
                    message: `Combine ${group.quests[0].name} and ${group.quests[1].name} on ${group.map}`,
                    quests: group.quests.map(q => q.name)
                });
            }
        });

        return recommendations;
    }

    /**
     * Extract kill type from description
     */
    extractKillType(description) {
        const desc = description.toLowerCase();
        if (desc.includes('scav')) return 'scavs';
        if (desc.includes('pmc')) return 'pmcs';
        if (desc.includes('boss') || desc.includes('raider')) return 'bosses';
        if (desc.includes('usec')) return 'usec';
        if (desc.includes('bear')) return 'bear';
        return null;
    }

    /**
     * Extract item type from description
     */
    extractItemType(description) {
        const desc = description.toLowerCase();
        if (desc.includes('intelligence')) return 'intelligence';
        if (desc.includes('food') || desc.includes('drink')) return 'provisions';
        if (desc.includes('weapon') || desc.includes('gun')) return 'weapons';
        if (desc.includes('key')) return 'keys';
        if (desc.includes('dogtag')) return 'dogtags';
        return null;
    }

    /**
     * Get map priority list based on quest concentration
     */
    getMapPriorities(quests = null) {
        const questList = quests || this.questManager.quests.filter(q => !q.completed);
        const mapCounts = {};

        questList.forEach(quest => {
            quest.objectives.forEach(obj => {
                if (obj.maps) {
                    obj.maps.forEach(map => {
                        mapCounts[map] = (mapCounts[map] || 0) + 1;
                    });
                }
            });
        });

        return Object.entries(mapCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([map, count]) => ({ map, questCount: count }));
    }
}
