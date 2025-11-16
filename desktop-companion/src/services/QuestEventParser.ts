/**
 * Quest Event Parser
 * Parses Tarkov log files for quest-related events
 * Based on research.md findings from TarkovMonitor
 */

export enum QuestEventType {
    TaskStarted = 10,
    TaskFailed = 11,
    TaskFinished = 12,
}

export interface QuestEvent {
    eventType: QuestEventType;
    questId: string;
    templateId: string;
    timestamp: Date;
    rawMessage?: any;
}

export class QuestEventParser {
    /**
     * Parse log content for quest events
     * Returns array of quest events found in the log content
     */
    static parseLogContent(content: string): QuestEvent[] {
        const events: QuestEvent[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const event = this.parseLogLine(line);
            if (event) {
                events.push(event);
            }
        }

        return events;
    }

    /**
     * Parse a single log line for quest events
     * Pattern: Got notification | ChatMessageReceived | {JSON}
     */
    static parseLogLine(line: string): QuestEvent | null {
        // Check if line contains quest notification pattern
        if (!line.includes('Got notification') || !line.includes('ChatMessageReceived')) {
            return null;
        }

        try {
            // Extract JSON from log line
            // Pattern: "...Got notification | ChatMessageReceived | {...}"
            const jsonMatch = line.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return null;
            }

            const notification = JSON.parse(jsonMatch[0]);

            // Check MessageType: 10=TaskStarted, 11=TaskFailed, 12=TaskFinished
            if (![10, 11, 12].includes(notification.MessageType)) {
                return null;
            }

            // Extract quest ID from templateId
            // Format: "questId arg1 arg2 ..."
            const templateId = notification.message?.templateId;
            if (!templateId) {
                return null;
            }

            const questId = templateId.split(' ')[0];

            // Extract timestamp from log line
            // Pattern: "YYYY-MM-DD HH:MM:SS.mmm|..."
            const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})/);
            const timestamp = timestampMatch
                ? new Date(timestampMatch[1])
                : new Date();

            return {
                eventType: notification.MessageType as QuestEventType,
                questId,
                templateId,
                timestamp,
                rawMessage: notification.message,
            };
        } catch (error) {
            console.error('Failed to parse log line:', error);
            return null;
        }
    }

    /**
     * Get event type name
     */
    static getEventTypeName(eventType: QuestEventType): string {
        switch (eventType) {
            case QuestEventType.TaskStarted:
                return 'Started';
            case QuestEventType.TaskFailed:
                return 'Failed';
            case QuestEventType.TaskFinished:
                return 'Completed';
            default:
                return 'Unknown';
        }
    }

    /**
     * Filter events by type
     */
    static filterByType(events: QuestEvent[], eventType: QuestEventType): QuestEvent[] {
        return events.filter(e => e.eventType === eventType);
    }

    /**
     * Get completed quests from events
     */
    static getCompletedQuests(events: QuestEvent[]): string[] {
        return events
            .filter(e => e.eventType === QuestEventType.TaskFinished)
            .map(e => e.questId);
    }

    /**
     * Get failed quests from events
     */
    static getFailedQuests(events: QuestEvent[]): string[] {
        return events
            .filter(e => e.eventType === QuestEventType.TaskFailed)
            .map(e => e.questId);
    }

    /**
     * Deduplicate events (keep most recent)
     */
    static deduplicateEvents(events: QuestEvent[]): QuestEvent[] {
        const eventMap = new Map<string, QuestEvent>();

        for (const event of events) {
            const key = `${event.questId}-${event.eventType}`;
            const existing = eventMap.get(key);

            if (!existing || event.timestamp > existing.timestamp) {
                eventMap.set(key, event);
            }
        }

        return Array.from(eventMap.values());
    }
}
