/* ========================================
   ALAN VAULT - SESSION MANAGER
   Session Handling & Management
   ======================================== */

class SessionManager {
    constructor() {
        this.sessionId = null;
        this.userId = null;
        this.startTime = null;
        this.lastActivity = null;
        this.sessionTimeout = CONFIG?.SECURITY?.SESSION_TIMEOUT || 24 * 60 * 60 * 1000; // 24 hours
        this.checkInterval = null;
        this.heartbeatInterval = null;
        this.init();
    }
    
    init() {
        this.loadSession();
        this.setupListeners();
        this.startHeartbeat();
        this.startSessionMonitor();
        this.checkForMultipleSessions();
        this.setupBeforeUnload();
    }
    
    loadSession() {
        this.sessionId = localStorage.getItem(CONFIG?.STORAGE_KEYS?.SESSION_ID || 'session_id');
        const userData = localStorage.getItem(CONFIG?.STORAGE_KEYS?.USER_DATA || 'currentUser');
        
        if (userData) {
            const user = JSON.parse(userData);
            this.userId = user.id;
        }
        
        this.startTime = localStorage.getItem('session_start');
        if (!this.startTime && this.sessionId) {
            this.startTime = Date.now().toString();
            localStorage.setItem('session_start', this.startTime);
        }
        
        this.lastActivity = localStorage.getItem('last_activity');
        
        // Validate session on load
        this.validateSession();
    }
    
    validateSession() {
        const expiry = localStorage.getItem('session_expiry');
        if (expiry && Date.now() > parseInt(expiry)) {
            this.expireSession('Session expired');
            return false;
        }
        
        // Check if session token is valid (mock validation)
        const token = localStorage.getItem(CONFIG?.STORAGE_KEYS?.AUTH_TOKEN || 'auth_token');
        if (!token && this.sessionId) {
            this.clearSession();
            return false;
        }
        
        return true;
    }
    
    setupListeners() {
        // Track user activity
        const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart', 'focus'];
        events.forEach(event => {
            window.addEventListener(event, () => this.updateActivity());
        });
        
        // Track page visibility
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.onTabVisible();
                this.updateActivity();
            } else {
                this.onTabHidden();
            }
        });
        
        // Listen for session events from other tabs
        window.addEventListener('storage', (e) => {
            this.handleStorageChange(e);
        });
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    updateActivity() {
        const now = Date.now();
        this.lastActivity = now;
        localStorage.setItem('last_activity', now.toString());
        
        // Refresh session expiry
        const expiry = now + this.sessionTimeout;
        localStorage.setItem('session_expiry', expiry);
        
        this.dispatchEvent('session:activity', { timestamp: now });
    }
    
    startHeartbeat() {
        // Send heartbeat every 5 minutes
        this.heartbeatInterval = setInterval(() => {
            if (this.isSessionActive()) {
                this.sendHeartbeat();
            }
        }, 5 * 60 * 1000);
    }
    
    startSessionMonitor() {
        // Check session expiry every minute
        this.checkInterval = setInterval(() => {
            this.checkSessionExpiry();
        }, 60 * 1000);
    }
    
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            this.recordSessionEnd();
        });
    }
    
    async sendHeartbeat() {
        if (!this.sessionId) return;
        
        const heartbeatData = {
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            page: window.location.pathname,
            referrer: document.referrer,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
        };
        
        // Store heartbeat locally
        this.saveHeartbeat(heartbeatData);
        
        // In production, send to server
        if (navigator.onLine) {
            try {
                await this.sendToServer(heartbeatData);
            } catch (error) {
                console.log('Heartbeat send failed, stored locally');
            }
        }
        
        // Dispatch event
        this.dispatchEvent('session:heartbeat', heartbeatData);
    }
    
    saveHeartbeat(heartbeatData) {
        const heartbeats = JSON.parse(localStorage.getItem('session_heartbeats') || '[]');
        heartbeats.push(heartbeatData);
        
        // Keep only last 50 heartbeats
        while (heartbeats.length > 50) heartbeats.shift();
        
        localStorage.setItem('session_heartbeats', JSON.stringify(heartbeats));
    }
    
    async sendToServer(heartbeatData) {
        // Mock API call - replace with actual endpoint
        console.log('Heartbeat sent:', heartbeatData);
        
        // In production:
        // const response = await fetch('/api/session/heartbeat', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(heartbeatData)
        // });
        // return response.json();
    }
    
    checkSessionExpiry() {
        const expiry = localStorage.getItem('session_expiry');
        
        if (expiry && Date.now() > parseInt(expiry)) {
            this.expireSession('Session timeout');
            return false;
        }
        
        // Check for inactivity timeout
        const lastActivity = localStorage.getItem('last_activity');
        if (lastActivity && Date.now() - parseInt(lastActivity) > this.sessionTimeout) {
            this.expireSession('Inactivity timeout');
            return false;
        }
        
        return true;
    }
    
    expireSession(reason) {
        console.log('Session expired:', reason);
        
        // Record session end
        this.recordSessionEnd(reason);
        
        // Clear session data
        this.clearSession();
        
        // Dispatch event
        this.dispatchEvent('session:expired', { reason });
        
        // Show notification if not on login page
        if (!window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('signup.html')) {
            this.showExpiryNotification(reason);
        }
        
        // Redirect to login
        setTimeout(() => {
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html?expired=true';
            }
        }, 2000);
    }
    
    clearSession() {
        // Remove session data
        localStorage.removeItem(CONFIG?.STORAGE_KEYS?.SESSION_ID || 'session_id');
        localStorage.removeItem('session_start');
        localStorage.removeItem('session_expiry');
        localStorage.removeItem('last_activity');
        localStorage.removeItem('session_heartbeats');
        
        // Don't remove auth token here - let auth system handle it
        
        this.sessionId = null;
        this.userId = null;
        this.startTime = null;
        this.lastActivity = null;
        
        this.dispatchEvent('session:cleared');
    }
    
    recordSessionEnd(reason = 'normal') {
        const sessionEnd = {
            sessionId: this.sessionId,
            userId: this.userId,
            startTime: this.startTime,
            endTime: Date.now(),
            duration: this.startTime ? Date.now() - parseInt(this.startTime) : 0,
            reason: reason,
            userAgent: navigator.userAgent
        };
        
        const sessions = JSON.parse(localStorage.getItem('session_history') || '[]');
        sessions.push(sessionEnd);
        
        // Keep only last 20 sessions
        while (sessions.length > 20) sessions.shift();
        
        localStorage.setItem('session_history', JSON.stringify(sessions));
        
        this.dispatchEvent('session:ended', sessionEnd);
    }
    
    showExpiryNotification(reason) {
        const notification = document.createElement('div');
        notification.className = 'session-expired-toast';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 16px;
                border-radius: 12px;
                z-index: 10000;
                max-width: 350px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                animation: slideInRight 0.3s ease;
            ">
                <p>⚠️ ${reason}</p>
                <p style="font-size: 14px; margin-top: 8px;">Please login again to continue.</p>
                <button id="reloginBtn" style="
                    margin-top: 12px;
                    padding: 6px 12px;
                    background: white;
                    color: #ef4444;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">Login Again</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        document.getElementById('reloginBtn')?.addEventListener('click', () => {
            window.location.href = 'login.html?expired=true';
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    onTabVisible() {
        console.log('Tab became visible');
        this.updateActivity();
        this.checkSessionValidity();
        
        // Sync session across tabs
        this.syncSession();
        
        this.dispatchEvent('session:tab-visible');
    }
    
    onTabHidden() {
        this.dispatchEvent('session:tab-hidden');
    }
    
    handleOnline() {
        console.log('Browser online');
        this.updateActivity();
        this.syncSession();
        this.sendPendingHeartbeats();
        
        this.dispatchEvent('session:online');
    }
    
    handleOffline() {
        console.log('Browser offline');
        this.dispatchEvent('session:offline');
    }
    
    async sendPendingHeartbeats() {
        const heartbeats = JSON.parse(localStorage.getItem('session_heartbeats') || '[]');
        const pending = heartbeats.filter(h => !h.synced);
        
        for (const heartbeat of pending) {
            try {
                await this.sendToServer(heartbeat);
                heartbeat.synced = true;
            } catch (error) {
                console.error('Failed to sync heartbeat:', error);
            }
        }
        
        localStorage.setItem('session_heartbeats', JSON.stringify(heartbeats));
    }
    
    handleStorageChange(event) {
        if (event.key === 'session_expiry') {
            if (!event.newValue) {
                // Session cleared in another tab
                this.handleCrossTabSessionClear();
            } else if (event.newValue !== event.oldValue) {
                // Session updated in another tab
                this.syncSession();
            }
        }
        
        if (event.key === 'logout_event') {
            this.handleCrossTabLogout();
        }
        
        if (event.key === 'session_update') {
            this.syncSession();
        }
    }
    
    handleCrossTabSessionClear() {
        console.log('Session cleared in another tab');
        
        this.clearSession();
        this.dispatchEvent('session:cross-tab-clear');
        
        const notification = document.createElement('div');
        notification.className = 'cross-tab-logout';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f59e0b;
                color: white;
                padding: 16px;
                border-radius: 12px;
                z-index: 10000;
                max-width: 350px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <p>⚠️ You have been logged out from another tab.</p>
                <button id="refreshPage" style="
                    margin-top: 12px;
                    padding: 6px 12px;
                    background: white;
                    color: #f59e0b;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">Refresh</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        document.getElementById('refreshPage')?.addEventListener('click', () => {
            window.location.reload();
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
                window.location.reload();
            }
        }, 10000);
    }
    
    handleCrossTabLogout() {
        this.clearSession();
        this.dispatchEvent('session:cross-tab-logout');
        
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
    
    syncSession() {
        // Sync session data from localStorage
        const newSessionId = localStorage.getItem(CONFIG?.STORAGE_KEYS?.SESSION_ID || 'session_id');
        const newExpiry = localStorage.getItem('session_expiry');
        const newStartTime = localStorage.getItem('session_start');
        
        if (newSessionId !== this.sessionId) {
            this.sessionId = newSessionId;
            this.dispatchEvent('session:synced', { sessionId: this.sessionId });
        }
        
        if (newExpiry) {
            localStorage.setItem('session_expiry', newExpiry);
        }
        
        if (newStartTime) {
            this.startTime = newStartTime;
        }
    }
    
    checkForMultipleSessions() {
        const sessions = JSON.parse(localStorage.getItem('active_sessions') || '[]');
        const currentSession = {
            id: this.sessionId,
            startTime: this.startTime,
            userAgent: navigator.userAgent,
            tabId: this.getTabId(),
            page: window.location.pathname,
            lastActive: Date.now()
        };
        
        // Check if session exists
        const existingIndex = sessions.findIndex(s => s.id === this.sessionId);
        if (existingIndex !== -1) {
            sessions[existingIndex] = currentSession;
        } else {
            sessions.push(currentSession);
        }
        
        // Keep only last 10 sessions
        while (sessions.length > 10) sessions.shift();
        
        localStorage.setItem('active_sessions', JSON.stringify(sessions));
        
        // Check for duplicate sessions
        const duplicateSessions = sessions.filter(s => s.id === this.sessionId && s.tabId !== this.getTabId());
        if (duplicateSessions.length > 0) {
            this.dispatchEvent('session:duplicate-detected', { count: duplicateSessions.length });
        }
        
        // Notify other tabs
        localStorage.setItem('session_update', Date.now().toString());
        setTimeout(() => {
            localStorage.removeItem('session_update');
        }, 100);
    }
    
    getTabId() {
        let tabId = sessionStorage.getItem('tab_id');
        if (!tabId) {
            tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
            sessionStorage.setItem('tab_id', tabId);
        }
        return tabId;
    }
    
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            startTime: this.startTime,
            duration: this.startTime ? this.getSessionDuration() : 0,
            lastActivity: this.lastActivity,
            isActive: this.isSessionActive(),
            tabId: this.getTabId(),
            userAgent: navigator.userAgent
        };
    }
    
    isSessionActive() {
        return !!(this.sessionId && this.checkSessionExpiry());
    }
    
    getSessionDuration() {
        if (!this.startTime) return 0;
        return Date.now() - parseInt(this.startTime);
    }
    
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    getSessionStats() {
        const sessions = JSON.parse(localStorage.getItem('session_history') || '[]');
        const totalSessions = sessions.length;
        const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / (totalSessions || 1);
        const lastSession = sessions[sessions.length - 1];
        
        return {
            totalSessions: totalSessions,
            averageDuration: this.formatDuration(avgDuration),
            currentSessionDuration: this.formatDuration(this.getSessionDuration()),
            lastSessionDate: lastSession ? new Date(lastSession.endTime).toLocaleString() : null,
            activeSessions: JSON.parse(localStorage.getItem('active_sessions') || '[]').length
        };
    }
    
    async terminateSession() {
        console.log('Terminating session');
        
        // Send logout event
        const logoutData = {
            sessionId: this.sessionId,
            userId: this.userId,
            timestamp: Date.now(),
            duration: this.getSessionDuration(),
            reason: 'manual'
        };
        
        // Record session end
        this.recordSessionEnd('manual');
        
        // Store logout record
        const logouts = JSON.parse(localStorage.getItem('session_logouts') || '[]');
        logouts.push(logoutData);
        while (logouts.length > 20) logouts.shift();
        localStorage.setItem('session_logouts', JSON.stringify(logouts));
        
        // Clear session
        this.clearSession();
        
        // Notify other tabs
        localStorage.setItem('logout_event', Date.now().toString());
        setTimeout(() => {
            localStorage.removeItem('logout_event');
        }, 100);
        
        // Dispatch event
        this.dispatchEvent('session:terminated', logoutData);
        
        // Remove from active sessions
        const sessions = JSON.parse(localStorage.getItem('active_sessions') || '[]');
        const filteredSessions = sessions.filter(s => s.id !== this.sessionId);
        localStorage.setItem('active_sessions', JSON.stringify(filteredSessions));
    }
    
    refreshSession() {
        const newExpiry = Date.now() + this.sessionTimeout;
        localStorage.setItem('session_expiry', newExpiry);
        this.updateActivity();
        
        this.dispatchEvent('session:refreshed', { expiry: newExpiry });
        
        return newExpiry;
    }
    
    extendSession(minutes = 60) {
        const newExpiry = Date.now() + (minutes * 60 * 1000);
        localStorage.setItem('session_expiry', newExpiry);
        this.updateActivity();
        
        this.dispatchEvent('session:extended', { minutes, newExpiry });
        
        return newExpiry;
    }
    
    getRemainingTime() {
        const expiry = localStorage.getItem('session_expiry');
        if (!expiry) return 0;
        
        const remaining = parseInt(expiry) - Date.now();
        return Math.max(0, remaining);
    }
    
    getFormattedRemainingTime() {
        return this.formatDuration(this.getRemainingTime());
    }
    
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    // Cleanup method
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.dispatchEvent('session:destroyed');
    }
}

// Initialize session manager
const sessionManager = new SessionManager();
window.sessionManager = sessionManager;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SessionManager };
}