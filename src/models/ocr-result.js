/**
 * OCRResult Model
 * Raw output from Tesseract.js OCR processing
 */

export class OCRResult {
    constructor({
        screenshotId,
        text,
        confidence,
        lines = [],
        words = [],
        processedAt = Date.now(),
        processingTime,
        engineVersion = '5.0.0'
    }) {
        this.screenshotId = screenshotId;
        this.text = text;
        this.confidence = confidence;
        this.lines = lines;
        this.words = words;
        this.processedAt = processedAt;
        this.processingTime = processingTime;
        this.engineVersion = engineVersion;
    }

    /**
     * Validate OCR result
     * @returns {Array<string>} Array of validation errors
     */
    validate() {
        const errors = [];

        if (this.confidence < 0 || this.confidence > 100) {
            errors.push('Confidence must be between 0-100.');
        }

        if (!this.lines || this.lines.length === 0) {
            errors.push('OCR result must contain at least one line.');
        }

        if (this.processingTime <= 0) {
            errors.push('Processing time must be positive.');
        }

        return errors;
    }

    /**
     * Check if result has low confidence (potential quality issue)
     * @returns {boolean}
     */
    hasLowConfidence() {
        return this.confidence < 30;
    }

    /**
     * Get average line confidence
     * @returns {number}
     */
    getAverageLineConfidence() {
        if (!this.lines || this.lines.length === 0) return 0;
        const sum = this.lines.reduce((acc, line) => acc + (line.confidence || 0), 0);
        return sum / this.lines.length;
    }

    /**
     * Create a plain object representation
     * @returns {Object}
     */
    toJSON() {
        return {
            screenshotId: this.screenshotId,
            text: this.text,
            confidence: this.confidence,
            lines: this.lines,
            words: this.words,
            processedAt: this.processedAt,
            processingTime: this.processingTime,
            engineVersion: this.engineVersion
        };
    }

    /**
     * Create OCRResult from JSON object
     * @param {Object} json 
     * @returns {OCRResult}
     */
    static fromJSON(json) {
        return new OCRResult(json);
    }
}
