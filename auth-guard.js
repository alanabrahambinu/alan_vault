/* ========================================
   ALAN VAULT - AUTH GUARD
   Route Protection & Access Control
   ======================================== */

class AuthGuard {
    constructor() {
        this.protectedRoutes = [
            '/dashboard.html',
            '/vault.html',
            '/upload.html',
            '/notes.html',
            '/tasks.html',
            '/bookmarks.html',
            '/analytics.html',
            '/settings.html',
            '/profile.html',
            '/activity.html',
            '/search.html'
        ];
        
        this.adminRoutes = [
            '/admin.html',
            '/users.html',
            '/logs.html',
            '/reports.html'
        ];
        
        this.publicRoutes = [
            '/',
            '/index.html',
            '/login.html',
            '/signup.html',
            '/forgot-password.html',
            '/reset-password.html',
            '/verify-email.html',
            '/offline.html',
            '/404.html'
        ];
        
        this.init();
    }
    
    init() {
        this.checkAuthentication();
        this.setupAutoLogout();
        this.setupActivityDetection();
        this.checkSessionValidity();
        this.setupRouteInterception();
    }
    
    checkAuthentication() {
        const currentPath = window.location.pathname;
        const isProtected = this.isProtectedRoute(currentPath);
        const isAdminRoute = this.isAdminRoute(currentPath);
        
        if (isProtected || isAdminRoute) {
            const isAuthenticated = this.isAuthenticated();
            
            if (!isAuthenticated) {
                this.redirectToLogin('session_expired');
                return;
            }
            
            // Check token validity
            if (!this.isTokenValid()) {
                this.redirectToLogin('token_invalid');
                return;
            }
            
            // Check admin access
            if (isAdminRoute && !this.isAdmin()) {
                this.redirectToDashboard('unauthorized');
                return;
            }
            
            // Refresh session
            this.refreshSession();
        }
        
        // Redirect to dashboard if already logged in on public pages
        if (this.isPublicRoute(currentPath) && this.isAuthenticated() && currentPath !== '/offline.html') {
            const redirectTo = sessionStorage.getItem('redirect_after_login') || '/dashboard.html';
            sessionStorage.removeItem('redirect_after_login');
            window.location.href = redirectTo;
        }
    }
    
    isProtectedRoute(path) {
        return this.protectedRoutes.some(route => path.includes(route));
    }
    
    isAdminRoute(path) {
        return this.adminRoutes.some(route => path.includes(route));
    }
    
    isPublicRoute(path) {
        return this.publicRoutes.some(route => path === route || path === route + '/');
    }
    
    isAuthenticated() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        const loggedIn = localStorage.getItem('loggedIn') === 'true';
        
        return !!(token && user && loggedIn);
    }
    
    isTokenValid() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const expiry = localStorage.getItem('session_expiry');
        
        if (!token) return false;
        
        if (expiry && Date.now() > parseInt(expiry)) {
            this.clearSession();
            return false;
        }
        
        return true;
    }
    
    isAdmin() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        if (!userData) return false;
        
        const user = JSON.parse(userData);
        return user.role === 'admin' || user.isAdmin === true;
    }
    
    async checkSessionValidity() {
        // Check with server (simulated)
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        
        if (token) {
            try {
                // In production, verify token with backend
                const isValid = await this.verifyTokenWithServer(token);
                if (!isValid) {
                    this.clearSession();
                    this.redirectToLogin('session_invalid');
                }
            } catch (error) {
                console.error('Session verification failed:', error);
            }
        }
    }
    
    async verifyTokenWithServer(token) {
        // Simulate server verification
        await this.sleep(100);
        return true; // In production, make actual API call
    }
    
    refreshSession() {
        const expiry = Date.now() + CONFIG.SECURITY.SESSION_TIMEOUT;
        localStorage.setItem('session_expiry', expiry);
        
        // Update last activity
        localStorage.setItem('last_activity', Date.now().toString());
    }
    
    setupAutoLogout() {
        let inactivityTimer;
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                this.handleInactivity();
            }, CONFIG.SECURITY.SESSION_TIMEOUT);
        };
        
        // Reset timer on user activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });
        
        resetTimer();
    }
    
    handleInactivity() {
        if (this.isAuthenticated()) {
            this.showInactivityWarning();
        }
    }
    
    showInactivityWarning() {
        const warning = document.createElement('div');
        warning.className = 'inactivity-warning';
        warning.innerHTML = `
            <div style="position: fixed; bottom: 20px; right: 20px; background: #f59e0b; color: white; padding: 16px; border-radius: 12px; z-index: 10000; max-width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <p style="margin-bottom: 12px;">⚠️ You will be logged out due to inactivity.</p>
                <div style="display: flex; gap: 8px;">
                    <button id="stayLoggedIn" style="padding: 6px 12px; background: white; color: #f59e0b; border: none; border-radius: 6px; cursor: pointer;">Stay Logged In</button>
                    <button id="logoutNow" style="padding: 6px 12px; background: rgba(255,255,255,0.2); border: none; border-radius: 6px; color: white; cursor: pointer;">Logout</button>
                </div>
            </div>
        `;
        document.body.appendChild(warning);
        
        document.getElementById('stayLoggedIn').onclick = () => {
            this.refreshSession();
            warning.remove();
        };
        
        document.getElementById('logoutNow').onclick = () => {
            warning.remove();
            this.performLogout();
        };
        
        // Auto logout after 30 seconds
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
                this.performLogout();
            }
        }, 30000);
    }
    
    setupActivityDetection() {
        // Track page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                localStorage.setItem('last_active_tab', Date.now().toString());
            } else {
                const lastActive = localStorage.getItem('last_active_tab');
                if (lastActive && Date.now() - parseInt(lastActive) > 30 * 60 * 1000) {
                    this.checkSessionValidity();
                }
            }
        });
    }
    
    setupRouteInterception() {
        // Intercept navigation to protected routes
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.checkAuthentication();
        };
        
        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this.checkAuthentication();
        };
        
        window.addEventListener('popstate', () => {
            this.checkAuthentication();
        });
    }
    
    redirectToLogin(reason = '') {
        const currentPath = window.location.pathname;
        
        // Store intended redirect
        if (!this.isPublicRoute(currentPath)) {
            sessionStorage.setItem('redirect_after_login', currentPath);
        }
        
        if (reason) {
            sessionStorage.setItem('logout_reason', reason);
        }
        
        window.location.href = '/login.html';
    }
    
    redirectToDashboard(reason = '') {
        if (reason) {
            this.showNotification('You do not have permission to access this page.', 'error');
        }
        window.location.href = '/dashboard.html';
    }
    
    async performLogout() {
        this.clearSession();
        
        // Show logout message
        this.showNotification('Session expired. Please login again.', 'warning');
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
    }
    
    clearSession() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION_ID);
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('session_expiry');
        sessionStorage.clear();
    }
    
    showNotification(message, type) {
        if (window.notify) {
            window.notify[type](message);
        } else {
            alert(message);
        }
    }
    
    getUser() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    }
    
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize auth guard
const authGuard = new AuthGuard();
window.authGuard = authGuard;