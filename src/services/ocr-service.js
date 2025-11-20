/**
 * OCRService
 * Handles Tesseract.js initialization and text recognition from screenshots
 */

import { OCRResult } from '../models/ocr-result.js';

export class OCRService {
    constructor() {
        this.worker = null;
        this.isProcessing = false;
    }

    /**
     * Initialize Tesseract.js worker (lazy load)
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.worker) {
            console.log('OCR worker already initialized');
            return;
        }

        try {
            console.log('Initializing Tesseract.js worker...');
            const { createWorker } = window.Tesseract;
            
            this.worker = await createWorker('eng', 1, {
                logger: (m) => {
                    // Dispatch progress events
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        window.dispatchEvent(new CustomEvent('ocrProgress', {
                            detail: { 
                                progress, 
                                status: m.status,
                                message: `Reading text... ${progress}%`
                            }
                        }));
                    }
                }
            });

            // Configure Tesseract for game UI text
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ()-.',
                tessedit_pageseg_mode: '11', // Sparse text mode (better for game UI)
                preserve_interword_spaces: '1'
            });

            console.log('Tesseract.js worker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize OCR worker:', error);
            throw new Error('OCR engine failed to load. Please refresh the page.');
        }
    }

    /**
     * Preprocess image for better OCR accuracy
     * @param {HTMLImageElement} imageElement 
     * @returns {HTMLCanvasElement} Preprocessed canvas
     */
    static preprocessImage(imageElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = imageElement.width;
        canvas.height = imageElement.height;

        // Draw original image
        ctx.drawImage(imageElement, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Step 1: Convert to grayscale (reduces noise)
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = gray;
        }

        // Step 2: Increase contrast (improves text clarity)
        const contrastFactor = 1.5;
        for (let i = 0; i < data.length; i += 4) {
            const adjusted = ((data[i] - 128) * contrastFactor) + 128;
            data[i] = data[i + 1] = data[i + 2] = Math.max(0, Math.min(255, adjusted));
        }

        // Step 3: Optional brightness boost for dark images
        let totalBrightness = 0;
        let pixels = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
            totalBrightness += data[i];
        }
        
        const avgBrightness = totalBrightness / pixels;
        
        if (avgBrightness < 80) {
            console.log('Dark image detected, applying brightness boost');
            const brightnessFactor = 1.3;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * brightnessFactor);
                data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor);
                data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor);
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * Extract text from image using OCR
     * @param {string} imageSrc Base64 data URL
     * @param {string} screenshotId Screenshot ID for result
     * @returns {Promise<OCRResult>}
     */
    async recognizeText(imageSrc, screenshotId) {
        if (this.isProcessing) {
            throw new Error('OCR already in progress. Please wait...');
        }

        const startTime = Date.now();
        this.isProcessing = true;

        try {
            // Ensure worker is initialized
            await this.initialize();

            // Dispatch start event
            window.dispatchEvent(new CustomEvent('ocrProgress', {
                detail: { progress: 0, status: 'starting', message: 'Loading screenshot...' }
            }));

            // Load image
            const img = new Image();
            img.src = imageSrc;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to load image'));
            });

            // Dispatch preprocessing event
            window.dispatchEvent(new CustomEvent('ocrProgress', {
                detail: { progress: 10, status: 'preprocessing', message: 'Enhancing image...' }
            }));

            // Preprocess image
            const preprocessed = OCRService.preprocessImage(img);

            // Dispatch OCR start event
            window.dispatchEvent(new CustomEvent('ocrProgress', {
                detail: { progress: 20, status: 'recognizing', message: 'Starting OCR...' }
            }));

            // Run OCR
            const result = await this.worker.recognize(preprocessed);

            const processingTime = (Date.now() - startTime) / 1000; // Convert to seconds

            // Create OCRResult entity
            const ocrResult = new OCRResult({
                screenshotId: screenshotId,
                text: result.data.text,
                confidence: result.data.confidence,
                lines: result.data.lines.map(line => ({
                    text: line.text,
                    confidence: line.confidence,
                    bbox: line.bbox,
                    baseline: line.baseline
                })),
                words: result.data.words.map(word => ({
                    text: word.text,
                    confidence: word.confidence,
                    bbox: word.bbox,
                    isNumeric: /^\d+$/.test(word.text),
                    fontName: word.font_name || 'unknown',
                    fontSize: word.font_size || 0
                })),
                processingTime: processingTime,
                engineVersion: result.data.oem || '5.0.0'
            });

            console.log(`OCR complete in ${processingTime.toFixed(2)}s:`, {
                lines: ocrResult.lines.length,
                words: ocrResult.words.length,
                confidence: ocrResult.confidence
            });

            // Dispatch completion event
            window.dispatchEvent(new CustomEvent('ocrComplete', {
                detail: { result: ocrResult, processingTime }
            }));

            return ocrResult;
        } catch (error) {
            console.error('OCR processing failed:', error);
            
            // Dispatch error event
            window.dispatchEvent(new CustomEvent('ocrError', {
                detail: { error: error.message || 'OCR processing failed' }
            }));

            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Terminate the worker and free resources
     * @returns {Promise<void>}
     */
    async terminate() {
        if (this.worker) {
            try {
                await this.worker.terminate();
                this.worker = null;
                console.log('OCR worker terminated');
            } catch (error) {
                console.error('Error terminating OCR worker:', error);
            }
        }
    }

    /**
     * Check if OCR is currently processing
     * @returns {boolean}
     */
    isProcessing() {
        return this.isProcessing;
    }
}

// Singleton instance
export const ocrService = new OCRService();
