/**
 * Screenshot Model
 * Represents an uploaded screenshot file with metadata
 */

export const ScreenshotStatus = {
    UPLOADED: 'uploaded',
    ANALYZING: 'analyzing',
    ANALYZED: 'analyzed',
    ERROR: 'error',
    CACHED: 'cached'
};

export class Screenshot {
    constructor({
        id = crypto.randomUUID(),
        filename,
        fileSize,
        fileType,
        dimensions,
        uploadedAt = Date.now(),
        dataURL,
        thumbnailURL,
        hash = null,
        status = ScreenshotStatus.UPLOADED
    }) {
        this.id = id;
        this.filename = filename;
        this.fileSize = fileSize;
        this.fileType = fileType;
        this.dimensions = dimensions;
        this.uploadedAt = uploadedAt;
        this.dataURL = dataURL;
        this.thumbnailURL = thumbnailURL;
        this.hash = hash;
        this.status = status;
    }

    /**
     * Validate screenshot properties
     * @returns {Array<string>} Array of validation errors (empty if valid)
     */
    validate() {
        const errors = [];
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        const minWidth = 1280;
        const minHeight = 720;

        if (!validTypes.includes(this.fileType)) {
            errors.push('Invalid file type. Use PNG or JPG.');
        }

        if (this.fileSize > maxSize) {
            errors.push('File too large. Maximum 10MB.');
        }

        if (this.dimensions.width < minWidth || this.dimensions.height < minHeight) {
            errors.push(`Resolution too low. Minimum ${minWidth}x${minHeight}.`);
        }

        if (!this.dataURL || !this.dataURL.startsWith('data:image/')) {
            errors.push('Invalid image data.');
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
            filename: this.filename,
            fileSize: this.fileSize,
            fileType: this.fileType,
            dimensions: this.dimensions,
            uploadedAt: this.uploadedAt,
            dataURL: this.dataURL,
            thumbnailURL: this.thumbnailURL,
            hash: this.hash,
            status: this.status
        };
    }

    /**
     * Create Screenshot from JSON object
     * @param {Object} json 
     * @returns {Screenshot}
     */
    static fromJSON(json) {
        return new Screenshot(json);
    }
}
