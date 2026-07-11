/* ========================================
   ALAN VAULT - LOGOUT HANDLER
   Session Termination & Cleanup
   ======================================== */

class LogoutHandler {
    constructor() {
        this.logoutBtn = document.getElementById('logoutBtn');
        this.init();
    }
    
    init() {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }
        
        // Auto logout on session expiry
        this.checkSessionExpiry();
        
        // Listen for logout events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === CONFIG.STORAGE_KEYS.AUTH_TOKEN && !e.newValue) {
                this.handleCrossTabLogout();
            }
        });
    }
    
    async handleLogout(e) {
        e.preventDefault();
        
        // Show confirmation for manual logout
        const confirmed = await this.showConfirmation();
        if (!confirmed) return;
        
        await this.performLogout();
    }
    
    async showConfirmation() {
        // Create custom confirmation dialog
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'logout-confirm-modal';
            modal.innerHTML = `
                <div class="modal-overlay" style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                    <div class="modal-content" style="background: #1a1a2e; border-radius: 16px; padding: 24px; max-width: 400px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🚪</div>
                        <h3>Logout Confirmation</h3>
                        <p style="color: #a1a1aa; margin: 16px 0;">Are you sure you want to logout?</p>
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button id="cancelLogout" style="padding: 8px 24px; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: white; cursor: pointer;">Cancel</button>
                            <button id="confirmLogout" style="padding: 8px 24px; background: #ef4444; border: none; border-radius: 8px; color: white; cursor: pointer;">Logout</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            document.getElementById('cancelLogout').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            document.getElementById('confirmLogout').onclick = () => {
                modal.remove();
                resolve(true);
            };
        });
    }
    
    async performLogout() {
        this.showLoader(true);
        
        // Track logout event
        this.trackLogoutEvent();
        
        // Simulate API call
        await this.sleep(500);
        
        // Clear all session data
        this.clearSessionData();
        
        // Clear sensitive data from memory
        this.clearMemoryCache();
        
        // Show success message
        this.showSuccessMessage();
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
    
    clearSessionData() {
        // Remove authentication tokens
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION_ID);
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('session_expiry');
        
        // Clear sensitive session data
        sessionStorage.clear();
        
        // Clear remember me if not checked
        if (!localStorage.getItem('rememberMe')) {
            localStorage.removeItem('saved_email');
        }
        
        // Dispatch logout event
        document.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Notify other tabs
        localStorage.setItem('logout_event', Date.now().toString());
        setTimeout(() => {
            localStorage.removeItem('logout_event');
        }, 100);
    }
    
    clearMemoryCache() {
        // Clear any sensitive data stored in memory
        if (window.currentUser) {
            window.currentUser = null;
        }
        
        if (window.app && window.app.currentUser) {
            window.app.currentUser = null;
        }
        
        // Clear any cached data
        const keysToKeep = ['users', 'theme', 'search_history'];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !keysToKeep.includes(key) && !key.startsWith('vault_')) {
                // Keep non-sensitive data
            }
        }
    }
    
    trackLogoutEvent() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        
        const logoutEvent = {
            userId: user.id,
            timestamp: new Date().toISOString(),
            sessionDuration: this.getSessionDuration(),
            userAgent: navigator.userAgent
        };
        
        // Store in logout history
        const history = JSON.parse(localStorage.getItem('logout_history') || '[]');
        history.unshift(logoutEvent);
        
        if (history.length > 20) history.pop();
        localStorage.setItem('logout_history', JSON.stringify(history));
        
        // Track with analytics
        if (window.analytics) {
            window.analytics.trackEvent('auth', 'logout', user.id);
        }
    }
    
    getSessionDuration() {
        const loginTime = localStorage.getItem('login_time');
        if (loginTime) {
            return Date.now() - parseInt(loginTime);
        }
        return 0;
    }
    
    checkSessionExpiry() {
        const expiry = localStorage.getItem('session_expiry');
        if (expiry && Date.now() > parseInt(expiry)) {
            this.performAutoLogout();
        }
    }
    
    async performAutoLogout() {
        this.showLoader(true);
        await this.sleep(300);
        this.clearSessionData();
        window.location.href = 'login.html?expired=true';
    }
    
    handleCrossTabLogout() {
        // Show notification that user was logged out from another tab
        const notification = document.createElement('div');
        notification.className = 'session-expired-toast';
        notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; animation: slideInRight 0.3s ease;">
                You have been logged out from another tab.
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
    
    showLoader(show) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.toggle('hidden', !show);
        }
    }
    
    showSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'logout-success-toast';
        message.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000; animation: slideInRight 0.3s ease;">
                ✓ Logged out successfully!
            </div>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 2000);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize logout handler
document.addEventListener('DOMContentLoaded', () => {
    window.logoutHandler = new LogoutHandler();
});