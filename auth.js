/* ========================================
   ALAN VAULT - AUTHENTICATION SERVICE
   User Authentication & Session Management
   ======================================== */

// ========================================
// CONFIGURATION
// ========================================

const AUTH_CONFIG = {
    STORAGE_KEYS: {
        AUTH_TOKEN: 'authToken',
        USER_DATA: 'currentUser',
        SESSION_ID: 'session_id',
        SESSION_EXPIRY: 'session_expiry',
        REMEMBER_ME: 'rememberMe',
        SAVED_EMAIL: 'saved_email',
        LOGGED_IN: 'loggedIn'
    },
    SESSION: {
        TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
        REMEMBER_ME_TIMEOUT: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    API: {
        BASE_URL: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : '/api',
        ENDPOINTS: {
            LOGIN: '/auth/login',
            SIGNUP: '/auth/signup',
            LOGOUT: '/auth/logout',
            VERIFY: '/auth/verify',
            REFRESH: '/auth/refresh',
            FORGOT_PASSWORD: '/auth/forgot-password',
            RESET_PASSWORD: '/auth/reset-password',
            CHANGE_PASSWORD: '/auth/change-password',
            VERIFY_EMAIL: '/auth/verify-email'
        }
    },
    VALIDATION: {
        PASSWORD_MIN_LENGTH: 6,
        USERNAME_MIN_LENGTH: 3,
        USERNAME_MAX_LENGTH: 20
    }
};

// ========================================
// AUTHENTICATION SERVICE CLASS
// ========================================

class AuthService {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.sessionTimer = null;
        this.refreshTimer = null;
        this.isAuthenticated = false;
        this.listeners = [];
        this.init();
    }
    
    init() {
        // Load stored session
        this.loadSession();
        
        // Setup session refresh
        this.setupSessionRefresh();
        
        // Listen for storage changes (cross-tab)
        this.setupCrossTabSync();
        
        console.log('🔐 Auth Service initialized');
        console.log('📧 User:', this.currentUser?.email || 'Not logged in');
    }
    
    // ========================================
    // SESSION MANAGEMENT
    // ========================================
    
    loadSession() {
        const token = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const userData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
        const loggedIn = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.LOGGED_IN) === 'true';
        
        if (token && userData && loggedIn) {
            try {
                this.authToken = token;
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                
                // Check session expiry
                const expiry = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY);
                if (expiry && Date.now() > parseInt(expiry)) {
                    this.logout();
                    return;
                }
                
                this.dispatchEvent('auth:session-loaded', { user: this.currentUser });
                return true;
            } catch (e) {
                console.error('Failed to load session:', e);
                this.clearSession();
                return false;
            }
        }
        
        return false;
    }
    
    saveSession(token, user, rememberMe = false) {
        this.authToken = token;
        this.currentUser = user;
        this.isAuthenticated = true;
        
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.LOGGED_IN, 'true');
        
        // Session expiry
        const timeout = rememberMe 
            ? AUTH_CONFIG.SESSION.REMEMBER_ME_TIMEOUT 
            : AUTH_CONFIG.SESSION.TIMEOUT;
        const expiry = Date.now() + timeout;
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY, expiry);
        
        if (rememberMe) {
            localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.REMEMBER_ME, 'true');
        }
        
        this.dispatchEvent('auth:login', { user, rememberMe });
        this.setupSessionRefresh();
    }
    
    clearSession() {
        this.authToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY);
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.LOGGED_IN);
        
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Broadcast logout to other tabs
        try {
            localStorage.setItem('logout_event', Date.now().toString());
            setTimeout(() => localStorage.removeItem('logout_event'), 100);
        } catch (e) {}
        
        this.dispatchEvent('auth:logout');
    }
    
    setupSessionRefresh() {
        // Refresh session every hour
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            if (this.isAuthenticated) {
                this.refreshSession();
            }
        }, 60 * 60 * 1000);
    }
    
    async refreshSession() {
        if (!this.isAuthenticated || !this.authToken) return;
        
        try {
            // Try to refresh via API
            if (this.api) {
                const response = await this.api.post(AUTH_CONFIG.API.ENDPOINTS.REFRESH);
                if (response && response.success && response.data.token) {
                    this.authToken = response.data.token;
                    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN, response.data.token);
                    this.dispatchEvent('auth:token-refreshed');
                    return;
                }
            }
            
            // Fallback: extend session locally
            const expiry = Date.now() + AUTH_CONFIG.SESSION.TIMEOUT;
            localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY, expiry);
            this.dispatchEvent('auth:session-extended');
            
        } catch (error) {
            console.error('Session refresh failed:', error);
            // If refresh fails, check if session is still valid
            this.checkSessionValidity();
        }
    }
    
    checkSessionValidity() {
        const expiry = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY);
        if (expiry && Date.now() > parseInt(expiry)) {
            this.logout();
            this.dispatchEvent('auth:session-expired');
            return false;
        }
        return true;
    }
    
    setupCrossTabSync() {
        window.addEventListener('storage', (e) => {
            if (e.key === AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN) {
                if (e.newValue) {
                    this.authToken = e.newValue;
                    this.isAuthenticated = true;
                    const userData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
                    if (userData) {
                        this.currentUser = JSON.parse(userData);
                    }
                    this.dispatchEvent('auth:cross-tab-login', { user: this.currentUser });
                } else {
                    this.clearSession();
                    this.dispatchEvent('auth:cross-tab-logout');
                }
            }
            
            if (e.key === 'logout_event') {
                this.clearSession();
                this.dispatchEvent('auth:cross-tab-logout');
            }
        });
    }
    
    // ========================================
    // AUTHENTICATION METHODS
    // ========================================
    
    async login(email, password, rememberMe = false) {
        try {
            // Try API login first
            if (this.api) {
                const response = await this.api.login(email, password);
                if (response && response.success && response.data.token) {
                    this.saveSession(response.data.token, response.data.user, rememberMe);
                    return { success: true, user: response.data.user };
                }
            }
            
            // Fallback: API may not be available, try localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);
            
            if (user) {
                const token = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const userData = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role || 'user'
                };
                
                this.saveSession(token, userData, rememberMe);
                
                // Save email for autofill
                if (rememberMe) {
                    localStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.SAVED_EMAIL, email);
                }
                
                return { success: true, user: userData };
            }
            
            return { success: false, error: 'Invalid email or password' };
            
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message || 'Login failed' };
        }
    }
    
    async signup(userData) {
        try {
            // Validate input
            const validation = this.validateSignup(userData);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }
            
            // Try API signup first
            if (this.api) {
                const response = await this.api.signup(userData);
                if (response && response.success) {
                    // Auto-login after signup if requested
                    if (userData.autoLogin) {
                        return this.login(userData.email, userData.password, false);
                    }
                    return { success: true, message: 'Account created successfully' };
                }
            }
            
            // Fallback: localStorage signup
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            // Check if email already exists
            if (users.find(u => u.email === userData.email)) {
                return { success: false, error: 'Email already registered' };
            }
            
            // Check if username already exists
            if (users.find(u => u.username === userData.username)) {
                return { success: false, error: 'Username already taken' };
            }
            
            const newUser = {
                id: 'user_' + Date.now(),
                username: userData.username,
                email: userData.email,
                password: userData.password,
                role: 'user',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            
            // Create vault for user
            const vaultKey = `vault_${newUser.id}`;
            localStorage.setItem(vaultKey, JSON.stringify({
                files: [],
                notes: [],
                tasks: [],
                bookmarks: []
            }));
            
            // Create settings
            const settingsKey = `settings_${newUser.id}`;
            localStorage.setItem(settingsKey, JSON.stringify({
                theme: 'dark',
                compactMode: false,
                emailNotifications: true,
                pushNotifications: true,
                taskReminders: true,
                sessionTimeout: '60'
            }));
            
            // Create profile
            const profileKey = `profile_${newUser.id}`;
            localStorage.setItem(profileKey, JSON.stringify({
                fullName: userData.username,
                username: userData.username,
                email: userData.email,
                memberSince: new Date().toLocaleDateString()
            }));
            
            // Auto-login
            if (userData.autoLogin !== false) {
                const token = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const user = {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role
                };
                this.saveSession(token, user, false);
                return { success: true, user: user };
            }
            
            return { success: true, message: 'Account created successfully' };
            
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message || 'Signup failed' };
        }
    }
    
    async logout() {
        try {
            // Try API logout
            if (this.api) {
                await this.api.logout();
            }
        } catch (error) {
            console.error('API logout error:', error);
        }
        
        // Clear local session
        this.clearSession();
        
        // Redirect to login
        if (window.location.pathname !== '/login.html' && 
            !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        
        return { success: true };
    }
    
    async verifyToken() {
        if (!this.authToken) {
            return { valid: false };
        }
        
        try {
            // Try API verification
            if (this.api) {
                const response = await this.api.get(AUTH_CONFIG.API.ENDPOINTS.VERIFY);
                if (response && response.success) {
                    return { valid: true, user: response.data.user };
                }
            }
            
            // Fallback: check local validity
            const expiry = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY);
            if (expiry && Date.now() < parseInt(expiry)) {
                return { valid: true, user: this.currentUser };
            }
            
            return { valid: false };
            
        } catch (error) {
            console.error('Token verification error:', error);
            // If API fails, check local expiry
            const expiry = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY);
            if (expiry && Date.now() < parseInt(expiry) && this.currentUser) {
                return { valid: true, user: this.currentUser };
            }
            return { valid: false };
        }
    }
    
    async forgotPassword(email) {
        try {
            if (this.api) {
                const response = await this.api.post(AUTH_CONFIG.API.ENDPOINTS.FORGOT_PASSWORD, { email });
                if (response && response.success) {
                    return { success: true, message: 'Password reset email sent' };
                }
            }
            
            // Fallback: check if email exists locally
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email);
            if (!user) {
                return { success: false, error: 'Email not found' };
            }
            
            return { success: true, message: 'Password reset instructions sent to your email (demo)' };
            
        } catch (error) {
            console.error('Forgot password error:', error);
            return { success: false, error: error.message || 'Request failed' };
        }
    }
    
    async resetPassword(token, newPassword) {
        try {
            if (this.api) {
                const response = await this.api.post(AUTH_CONFIG.API.ENDPOINTS.RESET_PASSWORD, { token, newPassword });
                if (response && response.success) {
                    return { success: true };
                }
            }
            
            return { success: true, message: 'Password reset successfully (demo)' };
            
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message || 'Password reset failed' };
        }
    }
    
    async changePassword(currentPassword, newPassword) {
        try {
            if (this.api) {
                const response = await this.api.post(AUTH_CONFIG.API.ENDPOINTS.CHANGE_PASSWORD, { 
                    currentPassword, 
                    newPassword 
                });
                if (response && response.success) {
                    return { success: true };
                }
            }
            
            // Fallback: check current password locally
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.id === this.currentUser?.id);
            if (!user || user.password !== currentPassword) {
                return { success: false, error: 'Current password is incorrect' };
            }
            
            user.password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));
            return { success: true, message: 'Password changed successfully' };
            
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, error: error.message || 'Password change failed' };
        }
    }
    
    // ========================================
    // VALIDATION METHODS
    // ========================================
    
    validateSignup(userData) {
        const { username, email, password, confirmPassword } = userData;
        
        // Username validation
        if (!username || username.length < AUTH_CONFIG.VALIDATION.USERNAME_MIN_LENGTH) {
            return { valid: false, error: `Username must be at least ${AUTH_CONFIG.VALIDATION.USERNAME_MIN_LENGTH} characters` };
        }
        if (username.length > AUTH_CONFIG.VALIDATION.USERNAME_MAX_LENGTH) {
            return { valid: false, error: `Username must be less than ${AUTH_CONFIG.VALIDATION.USERNAME_MAX_LENGTH} characters` };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
        }
        
        // Email validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { valid: false, error: 'Please enter a valid email address' };
        }
        
        // Password validation
        if (!password || password.length < AUTH_CONFIG.VALIDATION.PASSWORD_MIN_LENGTH) {
            return { valid: false, error: `Password must be at least ${AUTH_CONFIG.VALIDATION.PASSWORD_MIN_LENGTH} characters` };
        }
        
        // Confirm password
        if (confirmPassword !== undefined && password !== confirmPassword) {
            return { valid: false, error: 'Passwords do not match' };
        }
        
        return { valid: true };
    }
    
    // ========================================
    // USER METHODS
    // ========================================
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getAuthToken() {
        return this.authToken;
    }
    
    isLoggedIn() {
        return this.isAuthenticated && this.checkSessionValidity();
    }
    
    hasRole(role) {
        if (!this.currentUser) return false;
        if (role === 'admin') {
            return this.currentUser.role === 'admin' || this.currentUser.role === 'super-admin';
        }
        return this.currentUser.role === role;
    }
    
    isAdmin() {
        return this.hasRole('admin');
    }
    
    // ========================================
    // EVENT SYSTEM
    // ========================================
    
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
        
        this.listeners.forEach(listener => {
            if (listener.event === eventName) {
                listener.callback(detail);
            }
        });
    }
    
    on(eventName, callback) {
        this.listeners.push({ event: eventName, callback });
        return this;
    }
    
    off(eventName, callback) {
        this.listeners = this.listeners.filter(l => 
            !(l.event === eventName && l.callback === callback)
        );
        return this;
    }
    
    // ========================================
    // UTILITY METHODS
    // ========================================
    
    getSessionTimeRemaining() {
        const expiry = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY);
        if (!expiry) return 0;
        
        const remaining = parseInt(expiry) - Date.now();
        return Math.max(0, remaining);
    }
    
    getSessionTimeRemainingFormatted() {
        const ms = this.getSessionTimeRemaining();
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    
    // ========================================
    // API SETTER
    // ========================================
    
    setApi(apiInstance) {
        this.api = apiInstance;
        console.log('🔗 API service attached to Auth');
    }
}

// ========================================
// CREATE AUTH SERVICE INSTANCE
// ========================================

const Auth = new AuthService();

// If API service exists, attach it
if (window.API) {
    Auth.setApi(window.API);
}

// Wait for API to be loaded if not yet available
document.addEventListener('api:ready', () => {
    if (window.API) {
        Auth.setApi(window.API);
    }
});

// ========================================
// EXPORT
// ========================================

window.Auth = Auth;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, Auth };
}

// ========================================
// DEBUG INFO
// ========================================

console.log('🔐 Auth Service loaded (Supabase Ready)');
console.log('📧 Logged in:', Auth.isLoggedIn());
console.log('👤 User:', Auth.getCurrentUser()?.username || 'None');
console.log('🌐 Using API with localStorage fallback');

// ========================================
// AUTO-LOGOUT ON SESSION EXPIRY
// ========================================

// Check session expiry every minute
setInterval(() => {
    if (Auth.isLoggedIn()) {
        const expiry = localStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.SESSION_EXPIRY);
        if (expiry && Date.now() > parseInt(expiry)) {
            console.warn('⚠️ Session expired, logging out...');
            Auth.logout();
            
            // Show notification if available
            if (window.notify) {
                window.notify.warning('Session expired. Please login again.');
            } else if (window.showToast) {
                window.showToast('Session expired. Please login again.', 'warning');
            }
        }
    }
}, 60000);