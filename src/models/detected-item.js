/**
 * DetectedItem Model
 * Item matched from OCR text against game database
 */

export class DetectedItem {
    constructor({
        id = crypto.randomUUID(),
        ocrResultId,
        originalText,
        matchedItemId,
        matchedItemName,
        matchConfidence,
        ocrConfidence,
        quantity = 1,
        boundingBox,
        alternatives = [],
        corrected = false,
        correctedBy = null,
        correctedAt = null,
        removed = false
    }) {
        this.id = id;
        this.ocrResultId = ocrResultId;
        this.originalText = originalText;
        this.matchedItemId = matchedItemId;
        this.matchedItemName = matchedItemName;
        this.matchConfidence = matchConfidence;
        this.ocrConfidence = ocrConfidence;
        this.quantity = quantity;
        this.boundingBox = boundingBox;
        this.alternatives = alternatives;
        this.corrected = corrected;
        this.correctedBy = correctedBy;
        this.correctedAt = correctedAt;
        this.removed = removed;
    }

    /**
     * Calculate combined confidence from match and OCR confidence
     * @returns {number} Combined confidence (0-100)
     */
    getCombinedConfidence() {
        return Math.round((this.matchConfidence * 0.7) + (this.ocrConfidence * 0.3));
    }

    /**
     * Check if item has low confidence
     * @returns {boolean}
     */
    hasLowConfidence() {
        return this.getCombinedConfidence() < 70;
    }

    /**
     * Validate detected item
     * @returns {Array<string>} Array of validation errors
     */
    validate() {
        const errors = [];

        if (this.matchConfidence < 50) {
            errors.push('Match confidence below threshold (50%).');
        }

        if (this.quantity < 1) {
            errors.push('Quantity must be at least 1.');
        }

        if (this.corrected && !this.correctedBy) {
            errors.push('Corrected items must have correction source.');
        }

        return errors;
    }

    /**
     * Mark item as corrected by user
     * @param {string} itemId New correct item ID
     * @param {string} itemName New correct item name
     * @param {number} quantity New quantity (optional)
     */
    correctItem(itemId, itemName, quantity = null) {
        this.matchedItemId = itemId;
        this.matchedItemName = itemName;
        this.matchConfidence = 100; // User correction is 100% confident
        this.corrected = true;
        this.correctedBy = 'user';
        this.correctedAt = Date.now();
        
        if (quantity !== null) {
            this.quantity = quantity;
        }
    }

    /**
     * Mark item as removed (false positive)
     */
    remove() {
        this.removed = true;
    }

    /**
     * Create a plain object representation
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            ocrResultId: this.ocrResultId,
            originalText: this.originalText,
            matchedItemId: this.matchedItemId,
            matchedItemName: this.matchedItemName,
            matchConfidence: this.matchConfidence,
            ocrConfidence: this.ocrConfidence,
            combinedConfidence: this.getCombinedConfidence(),
            quantity: this.quantity,
            boundingBox: this.boundingBox,
            alternatives: this.alternatives,
            corrected: this.corrected,
            correctedBy: this.correctedBy,
            correctedAt: this.correctedAt,
            removed: this.removed
        };
    }

    /**
     * Create DetectedItem from JSON object
     * @param {Object} json 
     * @returns {DetectedItem}
     */
    static fromJSON(json) {
        return new DetectedItem(json);
    }
}
