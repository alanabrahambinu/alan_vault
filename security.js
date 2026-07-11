/* ========================================
   ALAN VAULT - SECURITY SETTINGS
   Security Preferences & Session Management
   ======================================== */

class SecurityManager {
    constructor() {
        this.settings = {
            twoFactorEnabled: false,
            sessionTimeout: 60, // minutes
            loginNotifications: true,
            deviceManagement: true,
            ipWhitelist: [],
            lastPasswordChange: null
        };
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.renderSecurityInfo();
    }
    
    loadSettings() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const securityKey = `security_${user.id}`;
        const saved = localStorage.getItem(securityKey);
        
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    saveSettings() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const securityKey = `security_${user.id}`;
        localStorage.setItem(securityKey, JSON.stringify(this.settings));
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        
        document.dispatchEvent(new CustomEvent('security:updated', {
            detail: { key, value }
        }));
    }
    
    renderSecurityInfo() {
        // Last password change
        if (this.settings.lastPasswordChange) {
            const lastChangeEl = document.getElementById('lastPasswordChange');
            if (lastChangeEl) {
                const days = Math.floor((Date.now() - new Date(this.settings.lastPasswordChange)) / (1000 * 60 * 60 * 24));
                lastChangeEl.textContent = `${days} days ago`;
            }
        }
        
        // Two-factor status
        const twoFactorStatus = document.getElementById('twoFactorStatus');
        if (twoFactorStatus) {
            twoFactorStatus.textContent = this.settings.twoFactorEnabled ? 'Enabled' : 'Disabled';
            twoFactorStatus.style.color = this.settings.twoFactorEnabled ? '#10b981' : '#71717a';
        }
    }
    
    async recordLoginAttempt(email, success, ip = null) {
        const loginRecord = {
            email: email,
            timestamp: new Date().toISOString(),
            success: success,
            ip: ip || 'client-side',
            userAgent: navigator.userAgent
        };
        
        const history = JSON.parse(localStorage.getItem('login_history') || '[]');
        history.unshift(loginRecord);
        
        // Keep only last 50 records
        if (history.length > 50) history.pop();
        
        localStorage.setItem('login_history', JSON.stringify(history));
        
        // Send notification for suspicious login
        if (success && this.settings.loginNotifications) {
            this.sendLoginNotification(email);
        }
    }
    
    sendLoginNotification(email) {
        if (window.notify) {
            window.notify.info(`New login detected on ${new Date().toLocaleString()}`, 'Security Alert');
        }
    }
    
    getLoginHistory() {
        return JSON.parse(localStorage.getItem('login_history') || '[]');
    }
    
    getActiveSessions() {
        const sessions = JSON.parse(localStorage.getItem('active_sessions') || '[]');
        return sessions;
    }
    
    revokeSession(sessionId) {
        let sessions = JSON.parse(localStorage.getItem('active_sessions') || '[]');
        sessions = sessions.filter(s => s.id !== sessionId);
        localStorage.setItem('active_sessions', JSON.stringify(sessions));
        
        this.showNotification('Session revoked', 'success');
    }
    
    revokeAllSessions() {
        localStorage.removeItem('active_sessions');
        this.showNotification('All sessions revoked', 'success');
    }
    
    setupEventListeners() {
        // Two-factor toggle
        const twoFactorToggle = document.getElementById('twoFactorToggle');
        if (twoFactorToggle) {
            twoFactorToggle.checked = this.settings.twoFactorEnabled;
            twoFactorToggle.addEventListener('change', (e) => {
                if (e.target.checked && window.twoFactorAuth) {
                    window.twoFactorAuth.setup2FA();
                } else if (window.twoFactorAuth) {
                    window.twoFactorAuth.disable2FA();
                }
                this.updateSetting('twoFactorEnabled', e.target.checked);
            });
        }
        
        // Session timeout
        const sessionTimeout = document.getElementById('sessionTimeout');
        if (sessionTimeout) {
            sessionTimeout.value = this.settings.sessionTimeout;
            sessionTimeout.addEventListener('change', (e) => {
                this.updateSetting('sessionTimeout', parseInt(e.target.value));
            });
        }
        
        // Login notifications        const loginNotifications = document.getElementById('loginNotifications');
        if (loginNotifications) {
            loginNotifications.checked = this.settings.loginNotifications;
            loginNotifications.addEventListener('change', (e) => {
                this.updateSetting('loginNotifications', e.target.checked);
            });
        }
    }
    
    showNotification(message, type) {
        if (window.notify) {
            window.notify[type](message);
        }
    }
}

// Initialize security manager
const securityManager = new SecurityManager();
window.securityManager = securityManager;