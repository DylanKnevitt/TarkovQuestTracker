/**
 * Wiki Modal Service
 * Manages full-screen wiki modal with history tracking and breadcrumbs
 */

export class WikiModal {
    constructor() {
        this.modal = document.getElementById('wiki-modal');
        this.iframe = document.getElementById('wiki-iframe');
        this.breadcrumb = document.getElementById('wiki-breadcrumb');
        this.backBtn = document.getElementById('wiki-back');
        this.forwardBtn = document.getElementById('wiki-forward');
        this.closeBtn = document.getElementById('wiki-close');

        this.history = [];
        this.currentIndex = -1;
        this.recentPages = this.loadRecentPages();

        this.init();
    }

    init() {
        // Close button
        this.closeBtn.addEventListener('click', () => this.close());

        // Navigation buttons
        this.backBtn.addEventListener('click', () => this.goBack());
        this.forwardBtn.addEventListener('click', () => this.goForward());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('active')) return;

            if (e.key === 'Escape') {
                this.close();
            } else if (e.altKey && e.key === 'ArrowLeft') {
                this.goBack();
            } else if (e.altKey && e.key === 'ArrowRight') {
                this.goForward();
            }
        });

        // Track iframe navigation
        this.iframe.addEventListener('load', () => {
            if (this.iframe.src && this.iframe.src !== 'about:blank') {
                this.iframe.classList.add('loaded');
                this.updateBreadcrumb();
            }
        });
    }

    open(url, title = '') {
        if (!url) return;

        // Remove loaded class while loading new page
        this.iframe.classList.remove('loaded');

        // Add to history
        this.currentIndex++;
        this.history = this.history.slice(0, this.currentIndex);
        this.history.push({ url, title });

        // Load page
        this.iframe.src = url;

        // Show modal
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Update recent pages
        this.addToRecentPages(url, title);

        // Update navigation buttons
        this.updateNavigationButtons();
        this.updateBreadcrumb();
    }

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        this.iframe.classList.remove('loaded');
        this.iframe.src = 'about:blank';
    }

    goBack() {
        if (this.currentIndex > 0) {
            this.iframe.classList.remove('loaded');
            this.currentIndex--;
            const page = this.history[this.currentIndex];
            this.iframe.src = page.url;
            this.updateNavigationButtons();
            this.updateBreadcrumb();
        }
    }

    goForward() {
        if (this.currentIndex < this.history.length - 1) {
            this.iframe.classList.remove('loaded');
            this.currentIndex++;
            const page = this.history[this.currentIndex];
            this.iframe.src = page.url;
            this.updateNavigationButtons();
            this.updateBreadcrumb();
        }
    }

    updateNavigationButtons() {
        this.backBtn.disabled = this.currentIndex <= 0;
        this.forwardBtn.disabled = this.currentIndex >= this.history.length - 1;
    }

    updateBreadcrumb() {
        if (this.history.length === 0) {
            this.breadcrumb.innerHTML = '<span>No page loaded</span>';
            return;
        }

        const currentPage = this.history[this.currentIndex];

        // Show last 3 pages in breadcrumb
        const startIndex = Math.max(0, this.currentIndex - 2);
        const visibleHistory = this.history.slice(startIndex, this.currentIndex + 1);

        this.breadcrumb.innerHTML = visibleHistory.map((page, index) => {
            const isLast = startIndex + index === this.currentIndex;
            const displayTitle = page.title || this.extractPageTitle(page.url);

            if (isLast) {
                return `<span class="breadcrumb-item" style="font-weight: 600;">${displayTitle}</span>`;
            } else {
                return `
                    <a href="#" class="breadcrumb-item" data-index="${startIndex + index}">${displayTitle}</a>
                    <span class="breadcrumb-separator">›</span>
                `;
            }
        }).join('');

        // Add click handlers to breadcrumb links
        this.breadcrumb.querySelectorAll('.breadcrumb-item[data-index]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetIndex = parseInt(e.target.dataset.index);
                this.navigateToIndex(targetIndex);
            });
        });
    }

    navigateToIndex(index) {
        if (index >= 0 && index < this.history.length) {
            this.iframe.classList.remove('loaded');
            this.currentIndex = index;
            const page = this.history[this.currentIndex];
            this.iframe.src = page.url;
            this.updateNavigationButtons();
            this.updateBreadcrumb();
        }
    }

    extractPageTitle(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            const lastPart = pathParts[pathParts.length - 1] || 'Wiki';
            return decodeURIComponent(lastPart).replace(/_/g, ' ');
        } catch {
            return 'Wiki Page';
        }
    }

    addToRecentPages(url, title) {
        const displayTitle = title || this.extractPageTitle(url);

        // Remove duplicate if exists
        this.recentPages = this.recentPages.filter(page => page.url !== url);

        // Add to front
        this.recentPages.unshift({ url, title: displayTitle });

        // Keep only last 5
        this.recentPages = this.recentPages.slice(0, 5);

        // Save to localStorage
        this.saveRecentPages();

        // Update UI
        this.renderRecentPages();
    }

    loadRecentPages() {
        try {
            const saved = localStorage.getItem('wiki_recent_pages');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    saveRecentPages() {
        try {
            localStorage.setItem('wiki_recent_pages', JSON.stringify(this.recentPages));
        } catch (err) {
            console.error('Failed to save recent wiki pages:', err);
        }
    }

    renderRecentPages() {
        const container = document.getElementById('recent-wiki-links');
        const section = document.getElementById('recent-wiki-section');

        if (this.recentPages.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        container.innerHTML = this.recentPages.map(page => `
            <a href="#" class="recent-wiki-link" data-url="${page.url}" title="${page.title}">
                ${page.title}
            </a>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.recent-wiki-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = e.target.dataset.url;
                const title = e.target.textContent.trim();
                this.open(url, title);
            });
        });
    }

    clearHistory() {
        this.history = [];
        this.currentIndex = -1;
        this.updateNavigationButtons();
        this.updateBreadcrumb();
    }

    clearRecentPages() {
        this.recentPages = [];
        this.saveRecentPages();
        this.renderRecentPages();
    }
}

// Singleton instance
export const wikiModal = new WikiModal();
