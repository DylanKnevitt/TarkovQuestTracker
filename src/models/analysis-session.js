/**
 * AnalysisSession Model
 * Complete OCR workflow state from upload to tracker update
 */

export const SessionStatus = {
    UPLOADED: 'uploaded',
    PROCESSING: 'processing',
    REVIEW: 'review',
    READY: 'ready',
    UPDATED: 'updated',
    ERROR: 'error',
    CANCELLED: 'cancelled'
};

export class AnalysisSession {
    constructor({
        id = crypto.randomUUID(),
        screenshot,
        ocrResult = null,
        detectedItems = [],
        recommendations = [],
        corrections = [],
        status = SessionStatus.UPLOADED,
        confirmedItems = [],
        trackerUpdated = false,
        createdAt = Date.now(),
        analyzedAt = null,
        confirmedAt = null,
        updatedAt = null,
        fromCache = false,
        error = null
    }) {
        this.id = id;
        this.screenshot = screenshot;
        this.ocrResult = ocrResult;
        this.detectedItems = detectedItems;
        this.recommendations = recommendations;
        this.corrections = corrections;
        this.status = status;
        this.confirmedItems = confirmedItems;
        this.trackerUpdated = trackerUpdated;
        this.createdAt = createdAt;
        this.analyzedAt = analyzedAt;
        this.confirmedAt = confirmedAt;
        this.updatedAt = updatedAt;
        this.fromCache = fromCache;
        this.error = error;
    }

    /**
     * Check if status transition is valid
     * @param {string} newStatus 
     * @returns {boolean}
     */
    canTransitionTo(newStatus) {
        const validTransitions = {
            [SessionStatus.UPLOADED]: [SessionStatus.PROCESSING, SessionStatus.CANCELLED],
            [SessionStatus.PROCESSING]: [SessionStatus.REVIEW, SessionStatus.ERROR],
            [SessionStatus.REVIEW]: [SessionStatus.READY, SessionStatus.CANCELLED],
            [SessionStatus.READY]: [SessionStatus.UPDATED, SessionStatus.ERROR],
            [SessionStatus.UPDATED]: [],
            [SessionStatus.ERROR]: [SessionStatus.PROCESSING],
            [SessionStatus.CANCELLED]: []
        };

        return validTransitions[this.status]?.includes(newStatus) || false;
    }

    /**
     * Transition to new status
     * @param {string} newStatus 
     * @throws {Error} If transition is invalid
     */
    transitionTo(newStatus) {
        if (!this.canTransitionTo(newStatus)) {
            throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
        }
        this.status = newStatus;
    }

    /**
     * Set OCR result and transition to REVIEW
     * @param {OCRResult} ocrResult 
     * @param {Array<DetectedItem>} detectedItems 
     * @param {Array<Recommendation>} recommendations 
     */
    setOCRResult(ocrResult, detectedItems, recommendations) {
        this.ocrResult = ocrResult;
        this.detectedItems = detectedItems;
        this.recommendations = recommendations;
        this.analyzedAt = Date.now();
        this.transitionTo(SessionStatus.REVIEW);
    }

    /**
     * Add a correction
     * @param {ItemCorrection} correction 
     */
    addCorrection(correction) {
        this.corrections.push(correction);
    }

    /**
     * Confirm items for tracker update
     */
    confirmItems() {
        // Filter out removed items
        this.confirmedItems = this.detectedItems.filter(item => !item.removed);
        this.confirmedAt = Date.now();
        this.transitionTo(SessionStatus.READY);
    }

    /**
     * Mark tracker as updated
     */
    markTrackerUpdated() {
        this.trackerUpdated = true;
        this.updatedAt = Date.now();
        this.transitionTo(SessionStatus.UPDATED);
    }

    /**
     * Set error state
     * @param {Error} error 
     */
    setError(error) {
        this.error = error.message || String(error);
        this.status = SessionStatus.ERROR;
    }

    /**
     * Get summary statistics
     * @returns {Object}
     */
    getSummary() {
        return {
            itemsDetected: this.detectedItems.length,
            itemsConfirmed: this.confirmedItems.length,
            correctionsApplied: this.corrections.length,
            averageConfidence: this.getAverageConfidence(),
            processingTime: this.analyzedAt ? (this.analyzedAt - this.createdAt) / 1000 : null,
            status: this.status
        };
    }

    /**
     * Calculate average confidence of detected items
     * @returns {number}
     */
    getAverageConfidence() {
        if (this.detectedItems.length === 0) return 0;
        const sum = this.detectedItems.reduce((acc, item) => {
            return acc + item.getCombinedConfidence();
        }, 0);
        return Math.round(sum / this.detectedItems.length);
    }

    /**
     * Validate session state
     * @returns {Array<string>} Array of validation errors
     */
    validate() {
        const errors = [];

        if (this.status === SessionStatus.REVIEW && !this.ocrResult) {
            errors.push('REVIEW status requires OCR result.');
        }

        if (this.status === SessionStatus.READY && this.confirmedItems.length === 0) {
            errors.push('READY status requires confirmed items.');
        }

        if (this.analyzedAt && this.analyzedAt < this.createdAt) {
            errors.push('Analyzed timestamp must be after created timestamp.');
        }

        if (this.confirmedAt && this.confirmedAt < this.analyzedAt) {
            errors.push('Confirmed timestamp must be after analyzed timestamp.');
        }

        return errors;
    }

    /**
     * Create a plain object representation
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            screenshot: this.screenshot?.toJSON ? this.screenshot.toJSON() : this.screenshot,
            ocrResult: this.ocrResult?.toJSON ? this.ocrResult.toJSON() : this.ocrResult,
            detectedItems: this.detectedItems.map(item => 
                item.toJSON ? item.toJSON() : item
            ),
            recommendations: this.recommendations,
            corrections: this.corrections,
            status: this.status,
            confirmedItems: this.confirmedItems.map(item => 
                item.toJSON ? item.toJSON() : item
            ),
            trackerUpdated: this.trackerUpdated,
            createdAt: this.createdAt,
            analyzedAt: this.analyzedAt,
            confirmedAt: this.confirmedAt,
            updatedAt: this.updatedAt,
            fromCache: this.fromCache,
            error: this.error
        };
    }

    /**
     * Create AnalysisSession from JSON object
     * @param {Object} json 
     * @returns {AnalysisSession}
     */
    static fromJSON(json) {
        return new AnalysisSession(json);
    }
}
