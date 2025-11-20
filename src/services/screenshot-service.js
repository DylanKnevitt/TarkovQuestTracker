/**
 * ScreenshotService
 * Handles file upload, validation, preview generation, and image loading for OCR
 */

import { Screenshot, ScreenshotStatus } from '../models/screenshot.js';

export class ScreenshotService {
    /**
     * Validate uploaded file
     * @param {File} file 
     * @returns {boolean}
     * @throws {Error} If validation fails
     */
    static validateFile(file) {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload PNG or JPG format.');
        }

        if (file.size > maxSize) {
            throw new Error('File too large. Maximum size is 10MB. Try lower resolution.');
        }

        return true;
    }

    /**
     * Generate preview thumbnail
     * @param {File} file 
     * @param {number} maxWidth 
     * @param {number} maxHeight 
     * @returns {Promise<string>} Preview data URL
     */
    static async generatePreview(file, maxWidth = 400, maxHeight = 300) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target.result;
            };

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate dimensions maintaining aspect ratio
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };

            img.onerror = () => reject(new Error('Failed to load image for preview'));
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Load full image for OCR processing
     * @param {File} file 
     * @returns {Promise<string>} Full image data URL
     */
    static async loadImageForOCR(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to load image'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get image dimensions
     * @param {string} dataURL 
     * @returns {Promise<{width: number, height: number}>}
     */
    static async getImageDimensions(dataURL) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataURL;
        });
    }

    /**
     * Create Screenshot entity from file
     * @param {File} file 
     * @returns {Promise<Screenshot>}
     */
    static async createScreenshotEntity(file) {
        try {
            // Validate file
            this.validateFile(file);

            // Load full image
            const dataURL = await this.loadImageForOCR(file);

            // Get dimensions
            const dimensions = await this.getImageDimensions(dataURL);

            // Generate preview
            const thumbnailURL = await this.generatePreview(file);

            // Create Screenshot entity
            const screenshot = new Screenshot({
                filename: file.name,
                fileSize: file.size,
                fileType: file.type,
                dimensions: dimensions,
                dataURL: dataURL,
                thumbnailURL: thumbnailURL,
                status: ScreenshotStatus.UPLOADED
            });

            // Validate screenshot
            const errors = screenshot.validate();
            if (errors.length > 0) {
                throw new Error(errors.join(', '));
            }

            return screenshot;
        } catch (error) {
            console.error('Failed to create screenshot entity:', error);
            throw error;
        }
    }

    /**
     * Check if image needs brightness boost (too dark)
     * @param {HTMLImageElement} img 
     * @returns {boolean}
     */
    static needsBrightnessBoost(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Sample center region
        const sampleSize = Math.min(img.width, img.height, 100);
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        
        const startX = (img.width - sampleSize) / 2;
        const startY = (img.height - sampleSize) / 2;
        
        ctx.drawImage(img, startX, startY, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize);
        
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;
        
        let totalBrightness = 0;
        let pixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
            pixels++;
        }
        
        const avgBrightness = totalBrightness / pixels;
        return avgBrightness < 80; // Dark image threshold
    }
}
