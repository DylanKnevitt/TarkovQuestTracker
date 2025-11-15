/**
 * Quest data model and utility functions
 */
import { storageService } from '../services/storage-service.js';

export class Quest {
    constructor(data) {
        Object.assign(this, data);
        this.completed = false;
        this.unlocked = this.minLevel <= 1 && this.prerequisites.length === 0;
    }

    isAvailable(playerLevel, completedQuests) {
        if (playerLevel < this.minLevel) return false;

        return this.prerequisites.every(prereqId =>
            completedQuests.includes(prereqId)
        );
    }

    getDependencies(allQuests) {
        return this.prerequisites.map(id =>
            allQuests.find(q => q.id === id)
        ).filter(Boolean);
    }

    getDependents(allQuests) {
        return allQuests.filter(q =>
            q.prerequisites.includes(this.id)
        );
    }
}

export class QuestManager {
    constructor() {
        this.quests = [];
        this.completedQuests = new Set();
        // Load progress will be called async after initialization
    }

    async initialize() {
        await this.loadProgress();
    }

    setQuests(questData) {
        this.quests = questData.map(data => new Quest(data));
        this.updateUnlockedStatus();
    }

    getQuestById(id) {
        return this.quests.find(q => q.id === id);
    }

    getQuestsByTrader(trader) {
        return this.quests.filter(q =>
            q.trader.toLowerCase() === trader.toLowerCase()
        );
    }

    getQuestsByLevel(minLevel, maxLevel) {
        return this.quests.filter(q =>
            q.minLevel >= minLevel && q.minLevel <= maxLevel
        );
    }

    searchQuests(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.quests.filter(q =>
            q.name.toLowerCase().includes(term) ||
            q.objectives.some(obj => obj.description.toLowerCase().includes(term))
        );
    }

    async toggleComplete(questId) {
        const quest = this.getQuestById(questId);
        if (!quest) return;

        const wasCompleted = this.completedQuests.has(questId);

        if (wasCompleted) {
            this.completedQuests.delete(questId);
            quest.completed = false;
            await storageService.markIncomplete(questId);
        } else {
            this.completedQuests.add(questId);
            quest.completed = true;
            await storageService.markComplete(questId);
        }

        this.updateUnlockedStatus();
    }

    updateUnlockedStatus(playerLevel = 79) {
        this.quests.forEach(quest => {
            quest.unlocked = quest.isAvailable(
                playerLevel,
                Array.from(this.completedQuests)
            );
        });
    }

    /**
     * Find the optimal path to a target quest
     */
    findPathToQuest(targetQuestId, playerLevel = 1) {
        const target = this.getQuestById(targetQuestId);
        if (!target) return null;

        const path = [];
        const visited = new Set(this.completedQuests);

        const buildPath = (questId) => {
            if (visited.has(questId)) return;

            const quest = this.getQuestById(questId);
            if (!quest) return;

            // First, add all prerequisites
            quest.prerequisites.forEach(prereqId => {
                buildPath(prereqId);
            });

            // Then add this quest
            if (!visited.has(questId)) {
                path.push(quest);
                visited.add(questId);
            }
        };

        buildPath(targetQuestId);

        // Filter by player level and sort by level
        return path
            .filter(q => q.minLevel <= playerLevel)
            .sort((a, b) => a.minLevel - b.minLevel);
    }

    /**
     * Get quests on the path to Lightkeeper
     */
    getLightkeeperPath() {
        // Key quests on path to Lightkeeper
        const lightkeeperQuests = this.quests.filter(q =>
            q.lightkeeperRequired ||
            q.trader === 'lightkeeper' ||
            q.name.includes('Capturing Outposts') ||
            q.name.includes('Burn the Evidence') ||
            q.name.includes('Meeting Place') ||
            q.name === 'The Huntsman Path - Relentless'
        );

        // Find all prerequisites for these quests
        const pathQuests = new Set();

        const addQuestAndPrereqs = (quest) => {
            if (!quest || pathQuests.has(quest.id)) return;

            pathQuests.add(quest.id);
            quest.prerequisites.forEach(prereqId => {
                const prereq = this.getQuestById(prereqId);
                addQuestAndPrereqs(prereq);
            });
        };

        lightkeeperQuests.forEach(q => addQuestAndPrereqs(q));

        return Array.from(pathQuests)
            .map(id => this.getQuestById(id))
            .filter(Boolean)
            .sort((a, b) => a.minLevel - b.minLevel);
    }

    /**
     * Find specific named quests
     */
    findQuestByName(name) {
        return this.quests.find(q =>
            q.name.toLowerCase() === name.toLowerCase()
        );
    }

    getCompletionStats() {
        const total = this.quests.length;
        const completed = this.completedQuests.size;
        const kappaRequired = this.quests.filter(q => q.kappaRequired).length;
        const kappaCompleted = this.quests.filter(q =>
            q.kappaRequired && this.completedQuests.has(q.id)
        ).length;

        return {
            total,
            completed,
            percentage: Math.round((completed / total) * 100),
            kappaRequired,
            kappaCompleted,
            kappaPercentage: Math.round((kappaCompleted / kappaRequired) * 100)
        };
    }

    async loadProgress() {
        // Load progress from storage service (merges LocalStorage + Supabase)
        const progress = await storageService.loadProgress();
        
        // Convert progress object to Set of completed quest IDs
        this.completedQuests = new Set(
            Object.keys(progress).filter(questId => progress[questId]?.completed)
        );

        // Update quest objects with completion status
        this.quests.forEach(quest => {
            quest.completed = this.completedQuests.has(quest.id);
        });

        this.updateUnlockedStatus();
    }

    async resetProgress() {
        // Mark all quests as incomplete
        const resetPromises = Array.from(this.completedQuests).map(questId =>
            storageService.markIncomplete(questId)
        );
        await Promise.all(resetPromises);

        this.completedQuests.clear();
        this.quests.forEach(q => q.completed = false);
        this.updateUnlockedStatus();
    }
}
