/**
 * ItemCorrection Model
 * 
 * Represents a user correction to an OCR-detected item.
 */

export class ItemCorrection {
    constructor(originalItem, correctedItem, quantity) {
        this.id = this.generateId();
        this.originalItem = originalItem;
        this.correctedItem = correctedItem;
        this.quantity = quantity || correctedItem.quantity || 1;
        this.timestamp = new Date().toISOString();
    }

    generateId() {
        return `correction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate correction data
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.originalItem) {
            errors.push('Original item is required');
        }

        if (!this.correctedItem) {
            errors.push('Corrected item is required');
        }

        if (!this.quantity || this.quantity < 1) {
            errors.push('Quantity must be at least 1');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Create ItemCorrection from plain object
     * @param {Object} data - Plain object data
     * @returns {ItemCorrection}
     */
    static fromObject(data) {
        const correction = new ItemCorrection(
            data.originalItem,
            data.correctedItem,
            data.quantity
        );
        correction.id = data.id;
        correction.timestamp = data.timestamp;
        return correction;
    }

    /**
     * Convert to plain object for storage
     * @returns {Object}
     */
    toObject() {
        return {
            id: this.id,
            originalItem: this.originalItem,
            correctedItem: this.correctedItem,
            quantity: this.quantity,
            timestamp: this.timestamp
        };
    }
}
