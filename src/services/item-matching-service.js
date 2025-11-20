/**
 * ItemMatchingService
 * Fuzzy matches OCR text against Tarkov item database using Fuse.js
 */

import { DetectedItem } from '../models/detected-item.js';

export class ItemMatchingService {
    constructor(itemDatabase) {
        if (!itemDatabase || itemDatabase.length === 0) {
            throw new Error('Item database is required for matching');
        }

        this.itemDatabase = itemDatabase;
        
        // Initialize Fuse.js for fuzzy search
        this.fuse = new window.Fuse(itemDatabase, {
            keys: [
                { name: 'name', weight: 0.7 },      // Primary match field
                { name: 'shortName', weight: 0.3 }  // Fallback for abbreviations
            ],
            threshold: 0.4,              // 0=perfect match, 1=match anything
            distance: 100,               // Max search distance for matches
            minMatchCharLength: 3,       // Ignore very short strings
            ignoreLocation: true,        // Don't penalize match position
            includeScore: true,          // Return similarity score
            findAllMatches: false,       // Return best match only (faster)
            useExtendedSearch: false,    // Simpler matching algorithm
            isCaseSensitive: false       // Case-insensitive matching
        });

        console.log(`ItemMatchingService initialized with ${itemDatabase.length} items`);
    }

    /**
     * Extract quantity from text (e.g., "Graphics card x5" -> 5)
     * @param {string} text 
     * @returns {number} Quantity (default 1)
     */
    extractQuantity(text) {
        // Look for patterns like "x5", "x 5", "(5)", "5x"
        const patterns = [
            /x\s*(\d+)/i,       // "x5" or "x 5"
            /(\d+)\s*x/i,       // "5x" or "5 x"
            /\((\d+)\)/,        // "(5)"
            /×\s*(\d+)/         // "×5" (multiplication symbol)
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const quantity = parseInt(match[1]);
                if (quantity > 0 && quantity <= 999) {
                    return quantity;
                }
            }
        }

        return 1; // Default quantity
    }

    /**
     * Preprocess OCR text for better matching
     * @param {string} text 
     * @returns {string} Cleaned text
     */
    preprocessText(text) {
        return text
            .trim()
            .replace(/x\s*\d+/gi, '')       // Remove quantity indicators
            .replace(/×\s*\d+/g, '')        // Remove × quantity
            .replace(/\(\d+\)/g, '')        // Remove (quantity)
            .replace(/\d+\s*x/gi, '')       // Remove leading quantity
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/[^\w\s()-]/g, '')     // Remove special chars except hyphens
            .trim();
    }

    /**
     * Match single OCR text line to item database
     * @param {string} ocrText 
     * @returns {Object|null} Match result or null
     */
    matchItem(ocrText) {
        // Extract quantity
        const quantity = this.extractQuantity(ocrText);
        
        // Clean text for matching
        const cleanText = this.preprocessText(ocrText);

        // Skip very short strings
        if (cleanText.length < 3) {
            return null;
        }

        // Search with fuzzy matching
        const results = this.fuse.search(cleanText);

        if (results.length === 0) {
            return null;
        }

        // Get best match
        const bestMatch = results[0];
        
        // Convert Fuse score (0=perfect, 1=worst) to confidence percentage
        const confidence = Math.round((1 - bestMatch.score) * 100);

        // Reject very low confidence matches
        if (confidence < 50) {
            return null;
        }

        return {
            originalText: ocrText,
            matchedItem: bestMatch.item,
            matchedItemId: bestMatch.item.id,
            matchedItemName: bestMatch.item.name,
            confidence: confidence,
            quantity: quantity,
            alternatives: results.slice(1, 4).map(r => ({
                itemId: r.item.id,
                itemName: r.item.name,
                confidence: Math.round((1 - r.score) * 100)
            }))
        };
    }

    /**
     * Match all OCR lines to items
     * @param {OCRResult} ocrResult 
     * @returns {Array<DetectedItem>} Detected items
     */
    matchAllItems(ocrResult) {
        const detectedItems = [];

        // Dispatch matching start event
        window.dispatchEvent(new CustomEvent('ocrProgress', {
            detail: { 
                progress: 90, 
                status: 'matching', 
                message: 'Matching items in database...' 
            }
        }));

        // Process each line of OCR text
        for (const line of ocrResult.lines) {
            const lineText = line.text.trim();

            // Skip empty or very short lines
            if (lineText.length < 3) continue;

            const match = this.matchItem(lineText);

            if (match) {
                const detectedItem = new DetectedItem({
                    ocrResultId: ocrResult.screenshotId,
                    originalText: match.originalText,
                    matchedItemId: match.matchedItemId,
                    matchedItemName: match.matchedItemName,
                    matchConfidence: match.confidence,
                    ocrConfidence: line.confidence,
                    quantity: match.quantity,
                    boundingBox: line.bbox,
                    alternatives: match.alternatives
                });

                detectedItems.push(detectedItem);
            }
        }

        console.log(`Matched ${detectedItems.length} items from ${ocrResult.lines.length} OCR lines`);

        // Deduplicate items
        return this.deduplicateItems(detectedItems);
    }

    /**
     * Remove duplicate detections of the same item
     * @param {Array<DetectedItem>} items 
     * @returns {Array<DetectedItem>} Deduplicated items
     */
    deduplicateItems(items) {
        const itemMap = new Map();

        for (const item of items) {
            const existing = itemMap.get(item.matchedItemId);

            if (!existing) {
                // First detection of this item
                itemMap.set(item.matchedItemId, item);
            } else {
                // Item already detected - keep highest confidence
                if (item.getCombinedConfidence() > existing.getCombinedConfidence()) {
                    itemMap.set(item.matchedItemId, item);
                } else if (item.quantity > existing.quantity) {
                    // Keep higher quantity
                    existing.quantity = item.quantity;
                }
            }
        }

        const deduplicated = Array.from(itemMap.values());
        
        if (deduplicated.length < items.length) {
            console.log(`Deduplicated ${items.length} items to ${deduplicated.length}`);
        }

        return deduplicated;
    }

    /**
     * Search for items by name (for autocomplete)
     * @param {string} query 
     * @param {number} limit 
     * @returns {Array<Object>} Search results
     */
    searchItems(query, limit = 10) {
        if (!query || query.length < 2) {
            return [];
        }

        const results = this.fuse.search(query, { limit });

        return results.map(r => ({
            id: r.item.id,
            name: r.item.name,
            shortName: r.item.shortName,
            confidence: Math.round((1 - r.score) * 100),
            iconLink: r.item.iconLink
        }));
    }

    /**
     * Get item by ID
     * @param {string} itemId 
     * @returns {Object|null} Item or null
     */
    getItemById(itemId) {
        return this.itemDatabase.find(item => item.id === itemId) || null;
    }

    /**
     * Get statistics about matching results
     * @param {Array<DetectedItem>} items 
     * @returns {Object} Statistics
     */
    getMatchingStats(items) {
        if (items.length === 0) {
            return {
                totalItems: 0,
                averageConfidence: 0,
                highConfidenceCount: 0,
                mediumConfidenceCount: 0,
                lowConfidenceCount: 0
            };
        }

        const confidences = items.map(item => item.getCombinedConfidence());
        const avgConfidence = Math.round(
            confidences.reduce((sum, c) => sum + c, 0) / confidences.length
        );

        return {
            totalItems: items.length,
            averageConfidence: avgConfidence,
            highConfidenceCount: items.filter(item => item.getCombinedConfidence() >= 80).length,
            mediumConfidenceCount: items.filter(item => {
                const conf = item.getCombinedConfidence();
                return conf >= 60 && conf < 80;
            }).length,
            lowConfidenceCount: items.filter(item => item.getCombinedConfidence() < 60).length
        };
    }
}
