/**
 * Authentication UI Component
 * 
 * Handles display and interaction for user authentication (login/signup/logout).
 * Integrates with AuthService for all authentication operations.
 */

import { authService } from '../services/auth-service.js';

export class AuthUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentUser = null;

        if (!this.container) {
            console.error(`Auth UI container #${containerId} not found`);
            return;
        }

        this.init();
    }

    /**
     * Initialize auth UI and set up auth state listener
     */
    async init() {
        // Check if auth is available
        if (!authService.isAvailable()) {
            this.renderDisabled();
            return;
        }

        // Get current user
        this.currentUser = await authService.getCurrentUser();

        // Render initial state
        this.render();

        // Listen for auth state changes
        authService.onAuthStateChange((user) => {
            this.currentUser = user;
            this.render();
        });
    }

    /**
     * Render auth UI based on current state
     */
    render() {
        if (!this.container) return;

        if (this.currentUser && this.currentUser.isAuthenticated()) {
            this.renderAuthenticated();
        } else {
            this.renderUnauthenticated();
        }
    }

    /**
     * Render UI when user is authenticated
     */
    renderAuthenticated() {
        this.container.innerHTML = `
      <div class="auth-status authenticated">
        <span class="user-email">${this.currentUser.email}</span>
        <button id="logout-btn" class="btn btn-secondary">Sign Out</button>
      </div>
    `;

        // Attach event listeners
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    /**
     * Render UI when user is not authenticated
     */
    renderUnauthenticated() {
        this.container.innerHTML = `
      <div class="auth-status unauthenticated">
        <button id="show-auth-modal-btn" class="btn btn-primary">Sign Upin</button>
      </div>
      
      <div id="auth-modal" class="auth-modal hidden">
        <div class="auth-modal-content">
          <button id="close-modal-btn" class="close-modal">&times;</button>
          
          <h2 class="auth-title">Sign Upin</h2>
          
          <form id="auth-form" class="auth-form">
            <div class="form-group">
              <label for="auth-email">Email</label>
              <input 
                type="email" 
                id="auth-email" 
                placeholder="your@email.com" 
                required 
                autocomplete="email"
              />
            </div>
            
            <div class="form-group">
              <label for="auth-password">Password</label>
              <input 
                type="password" 
                id="auth-password" 
                placeholder="••••••••" 
                required 
                autocomplete="current-password"
              />
              <small class="form-hint">Minimum 6 characters</small>
            </div>
            
            <div id="auth-error" class="auth-error hidden"></div>
            
            <button type="submit" class="btn btn-primary btn-block" id="auth-submit-btn">
              Sign Upin
            </button>
          </form>
        </div>
      </div>
    `;

        // Attach event listeners
        this.attachModalListeners();
    }

    /**
     * Render disabled state when Supabase not configured
     */
    renderDisabled() {
        this.container.innerHTML = `
      <div class="auth-status disabled">
        <span class="auth-disabled-text">Cloud sync unavailable (LocalStorage only)</span>
      </div>
    `;
    }

    /**
     * Attach event listeners for modal interactions
     */
    attachModalListeners() {
        const showModalBtn = document.getElementById('show-auth-modal-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const modal = document.getElementById('auth-modal');
        const authForm = document.getElementById('auth-form');

        if (showModalBtn) {
            showModalBtn.addEventListener('click', () => this.showModal());
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.hideModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }

        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    /**
     * Show authentication modal
     */
    showModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Focus email input
            const emailInput = document.getElementById('auth-email');
            if (emailInput) {
                setTimeout(() => emailInput.focus(), 100);
            }
        }
    }

    /**
     * Hide authentication modal
     */
    hideModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.clearError();
        }
    }

    /**
     * Handle form submission (auto sign in or sign up)
     */
    async handleSubmit(e) {
        e.preventDefault();

        const email = document.getElementById('auth-email')?.value.trim();
        const password = document.getElementById('auth-password')?.value;
        const submitBtn = document.getElementById('auth-submit-btn');

        // Validate inputs
        if (!email || !password) {
            this.showError('Please enter email and password');
            return;
        }

        // Validate email format
        if (!authService.constructor.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        // Validate password
        const passwordValidation = authService.constructor.validatePassword(password);
        if (!passwordValidation.valid) {
            this.showError(passwordValidation.message);
            return;
        }

        // Disable submit button during request
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing upin...';
        }

        try {
            // Try to sign in first
            let result = await authService.signIn(email, password);

            // If sign in fails with invalid credentials, try to sign up
            if (result.error && result.error.message?.includes('Invalid login credentials')) {
                console.log('User not found, creating new account...');
                result = await authService.signUp(email, password);
            }

            if (result.error) {
                this.showError(this.formatAuthError(result.error));
            } else {
                // Success - modal will close via auth state change
                this.hideModal();
                console.log('Authentication successful:', result.user.email);
            }
        } catch (err) {
            console.error('Auth error:', err);
            this.showError('An unexpected error occurred. Please try again.');
        } finally {
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Upin';
            }
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        const { error } = await authService.signOut();

        if (error) {
            console.error('Logout error:', error);
            alert('Failed to sign out. Please try again.');
        } else {
            console.log('User signed out successfully');
        }
    }

    /**
     * Show error message in modal
     */
    showError(message) {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    /**
     * Clear error message
     */
    clearError() {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.add('hidden');
        }
    }

    /**
     * Format Supabase auth error for display
     */
    formatAuthError(error) {
        const message = error.message || error.toString();

        // Common error mappings
        if (message.includes('Invalid login credentials')) {
            return 'Invalid email or password';
        }
        if (message.includes('Email not confirmed')) {
            return 'Please check your email and confirm your account';
        }
        if (message.includes('User already registered')) {
            return 'Account created successfully! Please check your email to confirm.';
        }
        if (message.includes('Password should be at least 6 characters')) {
            return 'Password must be at least 6 characters';
        }

        return message;
    }
}
