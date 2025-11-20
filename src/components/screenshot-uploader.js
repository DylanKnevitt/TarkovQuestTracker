/**
 * ScreenshotUploader Component
 * 
 * Provides drag-and-drop and file picker interface for uploading inventory screenshots.
 * Handles file validation, preview generation, and error display.
 */

import { ScreenshotService } from '../services/screenshot-service.js';

export class ScreenshotUploader {
    constructor(container, onUploadSuccess) {
        this.container = container;
        this.onUploadSuccess = onUploadSuccess;
        this.screenshotService = new ScreenshotService();
        this.currentScreenshot = null;
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="screenshot-uploader">
                <div class="upload-area" id="uploadArea">
                    <div class="upload-icon">📷</div>
                    <h3>Upload Inventory Screenshot</h3>
                    <p>Drag and drop your screenshot here, or click to browse</p>
                    <p class="upload-hint">Supported formats: PNG, JPG (max 10MB)</p>
                    <input type="file" id="fileInput" accept="image/png,image/jpeg,image/jpg" hidden />
                    <button class="btn-browse" id="browseBtn">Browse Files</button>
                </div>
                
                <div class="upload-preview hidden" id="uploadPreview">
                    <h3>Preview</h3>
                    <div class="preview-card">
                        <img id="previewImage" alt="Screenshot preview" />
                        <div class="preview-info">
                            <p class="preview-filename" id="previewFilename"></p>
                            <p class="preview-size" id="previewSize"></p>
                        </div>
                        <div class="preview-actions">
                            <button class="btn-secondary" id="removeBtn">Remove</button>
                            <button class="btn-primary" id="analyzeBtn">Analyze Screenshot</button>
                        </div>
                    </div>
                </div>
                
                <div class="upload-error hidden" id="uploadError">
                    <div class="error-message"></div>
                </div>

                <div class="screenshot-tips">
                    <button class="btn-link" id="showTipsBtn">📋 Tips for better OCR results</button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const uploadArea = this.container.querySelector('#uploadArea');
        const fileInput = this.container.querySelector('#fileInput');
        const browseBtn = this.container.querySelector('#browseBtn');
        const removeBtn = this.container.querySelector('#removeBtn');
        const analyzeBtn = this.container.querySelector('#analyzeBtn');
        const showTipsBtn = this.container.querySelector('#showTipsBtn');

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file) {
                await this.handleFileUpload(file);
            }
        });

        // Click to browse
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        // File picker
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.handleFileUpload(file);
            }
        });

        // Remove preview
        removeBtn.addEventListener('click', () => {
            this.clearPreview();
            fileInput.value = '';
        });

        // Analyze button
        analyzeBtn.addEventListener('click', () => {
            if (this.currentScreenshot && this.onUploadSuccess) {
                this.onUploadSuccess(this.currentScreenshot);
            }
        });

        // Show tips modal
        showTipsBtn.addEventListener('click', () => {
            this.showTipsModal();
        });
    }

    async handleFileUpload(file) {
        this.hideError();
        
        try {
            // Validate file
            const validation = this.screenshotService.validateFile(file);
            if (!validation.valid) {
                this.showError(validation.error);
                return;
            }

            // Create screenshot object
            const screenshot = await this.screenshotService.createScreenshot(file);
            this.currentScreenshot = screenshot;

            // Generate and show preview
            await this.showPreview(screenshot);
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Failed to process screenshot. Please try again.');
        }
    }

    async showPreview(screenshot) {
        const previewContainer = this.container.querySelector('#uploadPreview');
        const uploadArea = this.container.querySelector('#uploadArea');
        const previewImage = this.container.querySelector('#previewImage');
        const previewFilename = this.container.querySelector('#previewFilename');
        const previewSize = this.container.querySelector('#previewSize');

        // Generate preview if not already done
        if (!screenshot.previewDataUrl) {
            screenshot.previewDataUrl = await this.screenshotService.generatePreview(screenshot);
        }

        // Display preview
        previewImage.src = screenshot.previewDataUrl;
        previewFilename.textContent = screenshot.filename;
        previewSize.textContent = this.formatFileSize(screenshot.size);

        // Show preview, hide upload area
        uploadArea.classList.add('hidden');
        previewContainer.classList.remove('hidden');
    }

    clearPreview() {
        const previewContainer = this.container.querySelector('#uploadPreview');
        const uploadArea = this.container.querySelector('#uploadArea');

        previewContainer.classList.add('hidden');
        uploadArea.classList.remove('hidden');
        
        this.currentScreenshot = null;
    }

    showError(message) {
        const errorContainer = this.container.querySelector('#uploadError');
        const errorMessage = errorContainer.querySelector('.error-message');
        
        errorMessage.textContent = message;
        errorContainer.classList.remove('hidden');
    }

    hideError() {
        const errorContainer = this.container.querySelector('#uploadError');
        errorContainer.classList.add('hidden');
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    showTipsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal screenshot-tips-modal">
                <div class="modal-header">
                    <h2>📋 Tips for Better OCR Results</h2>
                    <button class="modal-close" id="closeTipsModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tip-section">
                        <h3>🖼️ Image Quality</h3>
                        <ul>
                            <li><strong>Use high resolution:</strong> 1080p or higher recommended</li>
                            <li><strong>Good lighting:</strong> In-game brightness should be medium-high</li>
                            <li><strong>Clean UI:</strong> Close any overlapping menus or tooltips</li>
                        </ul>
                    </div>
                    
                    <div class="tip-section">
                        <h3>📸 Screenshot Format</h3>
                        <ul>
                            <li><strong>PNG preferred:</strong> Better text clarity than JPG</li>
                            <li><strong>Full inventory view:</strong> Capture entire stash or container</li>
                            <li><strong>Grid mode:</strong> Grid view works better than list view</li>
                        </ul>
                    </div>
                    
                    <div class="tip-section">
                        <h3>✅ Best Practices</h3>
                        <ul>
                            <li><strong>One container at a time:</strong> Don't mix multiple containers</li>
                            <li><strong>Hover off items:</strong> Don't have tooltips showing</li>
                            <li><strong>Review results:</strong> Always check OCR detections before updating tracker</li>
                            <li><strong>Correct mistakes:</strong> Use the correction tool for misidentified items</li>
                        </ul>
                    </div>
                    
                    <div class="tip-section tip-warning">
                        <h3>⚠️ Common Issues</h3>
                        <ul>
                            <li><strong>Low resolution:</strong> OCR may fail to read item names</li>
                            <li><strong>Motion blur:</strong> Take screenshots while stationary</li>
                            <li><strong>UI overlap:</strong> Other UI elements can confuse OCR</li>
                            <li><strong>Similar names:</strong> Items with similar names may be misidentified</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" id="gotItBtn">Got it!</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        const closeModal = () => {
            modal.remove();
        };

        modal.querySelector('#closeTipsModal').addEventListener('click', closeModal);
        modal.querySelector('#gotItBtn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    reset() {
        this.clearPreview();
        this.hideError();
        this.currentScreenshot = null;
        const fileInput = this.container.querySelector('#fileInput');
        if (fileInput) fileInput.value = '';
    }
}
