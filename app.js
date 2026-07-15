/* ========================================
   ALAN VAULT - MAIN APPLICATION
   Core Application Bootstrap & Management
   ======================================== */

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
    APP_NAME: 'Alan Vault',
    APP_VERSION: '2.0.0',
    STORAGE_KEYS: {
        AUTH_TOKEN: 'authToken',
        USER_DATA: 'currentUser',
        VAULT_PREFIX: 'vault_',
        THEME: 'theme',
        SETTINGS: 'settings_',
        SESSION_ID: 'session_id'
    },
    FEATURES: {
        FILE_ENCRYPTION: true,
        OFFLINE_MODE: true,
        ANALYTICS: true,
        TWO_FACTOR: false
    },
    SECURITY: {
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 hours
    },
    STORAGE: {
        FREE: 5 * 1024 * 1024 * 1024 // 5GB
    },
    API: {
        BASE_URL: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : '/api'
    }
};

// ========================================
// ALAN VAULT APP CLASS
// ========================================

class AlanVaultApp {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.components = {};
        this.listeners = [];
        this.startTime = Date.now();
        this.syncInterval = null;
        this.init();
    }
    
    async init() {
        if (this.initialized) return;
        
        console.log(`${CONFIG.APP_NAME} v${CONFIG.APP_VERSION} initializing...`);
        
        try {
            // Initialize core services
            await this.initializeServices();
            
            // Check authentication
            await this.checkAuthentication();
            
            // Initialize UI components
            this.initializeUI();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start background services
            this.startBackgroundServices();
            
            // Load user data
            await this.loadUserData();
            
            // Set page based on auth state
            this.handlePageRouting();
            
            this.initialized = true;
            console.log('Application initialized successfully');
            
            // Dispatch ready event
            this.dispatchEvent('app:ready', { 
                version: CONFIG.APP_VERSION,
                startTime: this.startTime 
            });
            
            // Show welcome message for logged in users
            if (this.currentUser) {
                this.showWelcomeMessage();
                this.startAutoSync();
            }
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    startAutoSync() {
        // Auto sync every 30 seconds
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (this.currentUser && navigator.onLine) {
                this.syncData();
            }
        }, 30000);
    }
    
    async syncData() {
        try {
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
            if (!token || !this.currentUser) return;
            
            const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${this.currentUser.id}`;
            const localData = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
            
            const response = await fetch(`${CONFIG.API.BASE_URL}/migrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ data: localData })
            });
            
            if (response.ok) {
                console.log('🔄 Data synced to server');
            }
        } catch (error) {
            console.log('Sync skipped (offline or API unavailable)');
        }
    }
    
    async initializeServices() {
        // Initialize storage service
        if (window.StorageManager) {
            this.storage = window.StorageManager;
        }
        
        // Initialize theme service
        if (window.ThemeService) {
            this.theme = window.ThemeService;
        } else if (window.themeService) {
            this.theme = window.themeService;
        }
        
        // Initialize notification service
        if (window.notify) {
            this.notifications = window.notify;
        }
        
        // Initialize encryption service
        if (window.encryptionService && CONFIG.FEATURES?.FILE_ENCRYPTION) {
            this.encryption = window.encryptionService;
        }
        
        // Initialize offline service
        if (window.OfflineService && CONFIG.FEATURES?.OFFLINE_MODE) {
            this.offline = window.OfflineService;
        }
        
        // Initialize analytics
        if (window.analytics && CONFIG.FEATURES?.ANALYTICS) {
            this.analytics = window.analytics;
            this.analytics.trackPageView();
        }
        
        // Initialize API service
        if (window.API) {
            this.api = window.API;
        }
    }
    
    async checkAuthentication() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        const loggedIn = localStorage.getItem('loggedIn') === 'true';
        
        if (token && userData && loggedIn) {
            try {
                // Try to verify token with API
                if (this.api) {
                    const response = await this.api.verifyToken();
                    if (response && response.success) {
                        this.currentUser = JSON.parse(userData);
                        this.dispatchEvent('auth:logged-in', { user: this.currentUser });
                        return;
                    }
                }
                
                // Fallback: check if token is valid locally
                const isValid = await this.verifyToken(token);
                if (isValid) {
                    this.currentUser = JSON.parse(userData);
                    this.dispatchEvent('auth:logged-in', { user: this.currentUser });
                } else {
                    this.clearAuth();
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                // If API fails, assume token is valid if it exists
                this.currentUser = JSON.parse(userData);
                this.dispatchEvent('auth:logged-in', { user: this.currentUser });
            }
        }
        
        // Check session expiry
        this.checkSessionExpiry();
    }
    
    async verifyToken(token) {
        // In production, this would make an API call
        // For now, check if token exists and session not expired
        const expiry = localStorage.getItem('session_expiry');
        if (expiry && Date.now() > parseInt(expiry)) {
            return false;
        }
        return !!token;
    }
    
    checkSessionExpiry() {
        const expiry = localStorage.getItem('session_expiry');
        if (expiry && Date.now() > parseInt(expiry)) {
            this.clearAuth();
            this.showNotification('Session expired. Please login again.', 'warning');
            if (!this.isAuthPage() && !this.isPublicPage()) {
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        }
    }
    
    clearAuth() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION_ID);
        localStorage.removeItem('session_expiry');
        localStorage.removeItem('loggedIn');
        this.currentUser = null;
        this.dispatchEvent('auth:logged-out');
        
        // Broadcast logout to other tabs
        try {
            localStorage.setItem('logout_event', Date.now().toString());
            setTimeout(() => localStorage.removeItem('logout_event'), 100);
        } catch (e) {}
    }
    
    initializeUI() {
        // Initialize sidebar toggle for mobile
        this.initSidebar();
        
        // Apply saved theme
        if (this.theme) {
            this.theme.applyTheme();
        }
        
        // Update user display
        this.updateUserDisplay();
        
        // Initialize tooltips
        this.initTooltips();
        
        // Initialize keyboard shortcuts help
        this.initKeyboardHelp();
        
        // Initialize modals
        this.initModals();
        
        // Initialize dropdowns
        this.initDropdowns();
    }
    
    initSidebar() {
        const sidebar = document.getElementById('appSidebar');
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !mobileMenuBtn?.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
    
    initTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(el => {
            const tooltipText = el.dataset.tooltip;
            if (tooltipText) {
                el.addEventListener('mouseenter', (e) => {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'custom-tooltip';
                    tooltip.textContent = tooltipText;
                    tooltip.style.cssText = `
                        position: fixed;
                        background: #1a1a2e;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 6px;
                        font-size: 12px;
                        z-index: 10000;
                        white-space: nowrap;
                        pointer-events: none;
                        border: 1px solid rgba(139,92,246,0.3);
                    `;
                    document.body.appendChild(tooltip);
                    
                    const rect = el.getBoundingClientRect();
                    tooltip.style.top = `${rect.top - 30}px`;
                    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
                    
                    el.addEventListener('mouseleave', () => tooltip.remove(), { once: true });
                });
            }
        });
    }
    
    initKeyboardHelp() {
        // Show keyboard shortcuts on ? key
        document.addEventListener('keydown', (e) => {
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.showKeyboardShortcuts();
            }
        });
    }
    
    initModals() {
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.active, .modal-overlay.active');
                if (openModal && window.closeModal) {
                    window.closeModal();
                }
            }
        });
        
        // Close modal on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                if (window.closeModal) window.closeModal();
            }
        });
    }
    
    initDropdowns() {
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                const dropdown = document.getElementById('userDropdown');
                if (dropdown) dropdown.classList.remove('show');
            }
        });
    }
    
    updateUserDisplay() {
        if (this.currentUser) {
            const usernameElements = document.querySelectorAll('#usernameDisplay, .username-display, .user-name');
            usernameElements.forEach(el => {
                if (el) el.textContent = this.currentUser.username || this.currentUser.name || 'User';
            });
            
            // Update avatar if exists
            const avatarElements = document.querySelectorAll('.user-avatar');
            avatarElements.forEach(el => {
                if (el && !el.querySelector('img')) {
                    const initial = this.currentUser.username?.charAt(0).toUpperCase() || 'U';
                    el.textContent = initial;
                }
            });
        }
    }
    
    async loadUserData() {
        if (!this.currentUser) return;
        
        // Try to load from API first
        if (this.api) {
            try {
                const [files, notes, tasks, bookmarks] = await Promise.all([
                    this.api.getFiles(),
                    this.api.getNotes(),
                    this.api.getTasks(),
                    this.api.getBookmarks()
                ]);
                
                if (files.success || notes.success || tasks.success || bookmarks.success) {
                    this.vaultData = {
                        files: files.success ? files.data.files || [] : [],
                        notes: notes.success ? notes.data.notes || [] : [],
                        tasks: tasks.success ? tasks.data.tasks || [] : [],
                        bookmarks: bookmarks.success ? bookmarks.data.bookmarks || [] : []
                    };
                    
                    // Cache to localStorage
                    const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${this.currentUser.id}`;
                    localStorage.setItem(vaultKey, JSON.stringify(this.vaultData));
                    
                    this.dispatchEvent('data:loaded', { data: this.vaultData, source: 'api' });
                    return;
                }
            } catch (error) {
                console.log('API load failed, using localStorage fallback');
            }
        }
        
        // Fallback to localStorage
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${this.currentUser.id}`;
        const vaultData = localStorage.getItem(vaultKey);
        
        if (vaultData) {
            try {
                this.vaultData = JSON.parse(vaultData);
                this.dispatchEvent('data:loaded', { data: this.vaultData, source: 'local' });
            } catch (e) {
                console.error('Failed to parse vault data:', e);
                this.vaultData = { files: [], notes: [], tasks: [], bookmarks: [] };
            }
        } else {
            this.vaultData = { files: [], notes: [], tasks: [], bookmarks: [] };
        }
        
        // Load settings
        const settingsKey = `${CONFIG.STORAGE_KEYS.SETTINGS}${this.currentUser.id}`;
        const settingsData = localStorage.getItem(settingsKey);
        if (settingsData) {
            try {
                this.settings = JSON.parse(settingsData);
            } catch (e) {
                console.error('Failed to parse settings:', e);
            }
        }
    }
    
    handlePageRouting() {
        const currentPath = window.location.pathname;
        const isAuthPage = this.isAuthPage();
        const isPublicPage = this.isPublicPage();
        const isProtectedPage = !isAuthPage && !isPublicPage && currentPath !== '/';
        
        // Redirect logic
        if (this.currentUser) {
            // User is logged in
            if (isAuthPage) {
                // Redirect to dashboard if trying to access login/signup
                window.location.href = 'dashboard.html';
            }
        } else {
            // User is not logged in
            if (isProtectedPage && !this.isOfflinePage()) {
                // Store intended URL for redirect after login
                sessionStorage.setItem('redirect_after_login', currentPath);
                window.location.href = 'login.html';
            }
        }
        
        // Update active nav item
        this.updateActiveNavItem();
    }
    
    isAuthPage() {
        const authPages = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html', 'verify-email.html'];
        return authPages.some(page => window.location.pathname.includes(page));
    }
    
    isPublicPage() {
        const publicPages = ['index.html', 'offline.html', '404.html'];
        return publicPages.some(page => window.location.pathname.includes(page)) || window.location.pathname === '/';
    }
    
    isOfflinePage() {
        return window.location.pathname.includes('offline.html');
    }
    
    updateActiveNavItem() {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        const navLinks = document.querySelectorAll('.nav-item, .sidebar-nav a');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href === currentPage) {
                link.classList.add('active');
            } else if (link.classList.contains('active')) {
                link.classList.remove('active');
            }
        });
    }
    
    setupEventListeners() {
        // Online/Offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Before unload
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
        
        // Storage events (for cross-tab sync)
        window.addEventListener('storage', (e) => this.handleStorageChange(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Handle back/forward navigation
        window.addEventListener('popstate', () => this.handlePageRouting());
        
        // Handle clicks on nav links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.startsWith(window.location.origin)) {
                const path = link.pathname;
                if (this.shouldHandleClientNavigation(path)) {
                    e.preventDefault();
                    window.location.href = path;
                }
            }
        });
    }
    
    shouldHandleClientNavigation(path) {
        if (path.includes('.pdf') || path.includes('.zip')) return false;
        return true;
    }
    
    startBackgroundServices() {
        // Session refresh interval (every hour)
        setInterval(() => {
            this.refreshSession();
        }, 60 * 60 * 1000);
        
        // Check session expiry every minute
        setInterval(() => {
            this.checkSessionExpiry();
        }, 60000);
        
        // Auto-save interval for editors
        setInterval(() => {
            this.triggerAutoSave();
        }, 30000);
        
        // Storage update interval
        setInterval(() => {
            this.updateStorageDisplay();
        }, 5000);
    }
    
    handleOnline() {
        console.log('App is online');
        this.dispatchEvent('app:online');
        this.showNotification('Connection restored!', 'success');
        
        // Sync offline queue
        if (this.offline && this.offline.syncQueue) {
            this.offline.syncQueue();
        }
        
        // Refresh data
        this.refreshData();
    }
    
    handleOffline() {
        console.log('App is offline');
        this.dispatchEvent('app:offline');
        this.showNotification('You are offline. Working in offline mode.', 'warning');
    }
    
    handleBeforeUnload(e) {
        if (this.hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    }
    
    hasUnsavedChanges() {
        if (window.noteEditor && window.noteEditor.isDirty) return true;
        if (window.taskEditor && window.taskEditor.isDirty) return true;
        return false;
    }
    
    handleStorageChange(event) {
        if (event.key === CONFIG.STORAGE_KEYS.USER_DATA || event.key === CONFIG.STORAGE_KEYS.AUTH_TOKEN) {
            if (event.newValue) {
                try {
                    this.currentUser = JSON.parse(event.newValue);
                    this.updateUserDisplay();
                    this.dispatchEvent('user:changed', { user: this.currentUser });
                } catch (e) {}
            }
        }
        
        if (event.key === 'logout_event') {
            this.clearAuth();
            if (!this.isAuthPage() && !this.isPublicPage()) {
                window.location.href = 'login.html';
            }
        }
    }
    
    handleKeyboardShortcuts(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;
        
        // Ctrl/Cmd + K - Focus search
        if (modKey && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-box, #globalSearch, #searchInput');
            if (searchInput) searchInput.focus();
        }
        
        // Ctrl/Cmd + N - New note
        if (modKey && e.key === 'n') {
            e.preventDefault();
            if (window.location.pathname.includes('notes.html') && window.noteEditor) {
                window.noteEditor.open();
            } else if (window.notesManager) {
                window.notesManager.openNoteEditor();
            }
        }
        
        // Ctrl/Cmd + T - New task
        if (modKey && e.key === 't') {
            e.preventDefault();
            if (window.tasksManager) {
                window.tasksManager.openTaskModal();
            }
        }
        
        // Ctrl/Cmd + B - Add bookmark
        if (modKey && e.key === 'b') {
            e.preventDefault();
            if (window.bookmarksManager) {
                window.bookmarksManager.openAddBookmarkModal();
            }
        }
        
        // Ctrl/Cmd + S - Save
        if (modKey && e.key === 's') {
            e.preventDefault();
            this.triggerSave();
        }
        
        // Escape - Close modals
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal.active, .modal-overlay.active');
            if (modal && window.closeModal) {
                window.closeModal();
            }
        }
        
        // Ctrl/Cmd + / - Show keyboard shortcuts
        if (modKey && e.key === '/') {
            e.preventDefault();
            this.showKeyboardShortcuts();
        }
        
        // Ctrl/Cmd + Shift + D - Toggle dark mode
        if (modKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            if (this.theme) {
                this.theme.toggleTheme();
            }
        }
        
        // Ctrl/Cmd + R - Refresh data
        if (modKey && e.key === 'r') {
            e.preventDefault();
            this.refreshData();
        }
        
        // Ctrl/Cmd + L - Logout
        if (modKey && e.key === 'l') {
            e.preventDefault();
            this.logout();
        }
        
        // Ctrl/Cmd + Shift + U - Upload file
        if (modKey && e.shiftKey && e.key === 'U') {
            e.preventDefault();
            window.location.href = 'upload.html';
        }
        
        // Ctrl/Cmd + Shift + T - Go to tasks
        if (modKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            window.location.href = 'tasks.html';
        }
        
        // Ctrl/Cmd + S - Sync data
        if (modKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            this.syncData();
            this.showNotification('Syncing data...', 'info');
        }
    }
    
    triggerSave() {
        if (window.noteEditor && window.noteEditor.currentNote) {
            window.noteEditor.saveCurrentNote();
        } else if (window.taskEditor && window.taskEditor.currentTask) {
            window.taskEditor.saveCurrentTask();
        }
    }
    
    triggerAutoSave() {
        this.dispatchEvent('app:auto-save');
        
        if (window.noteEditor && window.noteEditor.isDirty) {
            window.noteEditor.saveCurrentNote();
        }
    }
    
    async refreshSession() {
        if (this.currentUser) {
            const expiry = Date.now() + (CONFIG.SECURITY?.SESSION_TIMEOUT || 24 * 60 * 60 * 1000);
            localStorage.setItem('session_expiry', expiry);
            this.dispatchEvent('session:refreshed');
        }
    }
    
    async refreshData() {
        this.showNotification('Refreshing data...', 'info');
        
        if (this.currentUser) {
            await this.loadUserData();
            
            this.dispatchEvent('data:refresh');
            
            // Refresh specific components
            if (window.notesManager && window.notesManager.loadNotes) {
                window.notesManager.loadNotes();
                if (window.notesManager.renderNotes) window.notesManager.renderNotes();
            }
            if (window.tasksManager && window.tasksManager.loadTasks) {
                window.tasksManager.loadTasks();
                if (window.tasksManager.renderTasks) window.tasksManager.renderTasks();
            }
            if (window.bookmarksManager && window.bookmarksManager.loadBookmarks) {
                window.bookmarksManager.loadBookmarks();
                if (window.bookmarksManager.renderBookmarks) window.bookmarksManager.renderBookmarks();
            }
            if (window.folderManager && window.folderManager.loadFolders) {
                window.folderManager.loadFolders();
                if (window.folderManager.renderFolders) window.folderManager.renderFolders();
            }
            if (window.storageStats && window.storageStats.update) {
                window.storageStats.update();
            }
            if (window.dashboard && window.dashboard.loadData) {
                window.dashboard.loadData();
            }
        }
        
        this.showNotification('Data refreshed!', 'success');
    }
    
    updateStorageDisplay() {
        if (!this.currentUser) return;
        
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${this.currentUser.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        const totalSize = vault.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const usedGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
        const percent = Math.min((totalSize / (CONFIG.STORAGE.FREE)) * 100, 100);
        
        const storageText = document.getElementById('storageText');
        const storageBar = document.getElementById('storageBar');
        
        if (storageText) storageText.textContent = `${usedGB} GB / 5 GB`;
        if (storageBar) storageBar.style.width = `${percent}%`;
    }
    
    showKeyboardShortcuts() {
        const shortcuts = {
            'Ctrl/Cmd + K': 'Focus search',
            'Ctrl/Cmd + N': 'New note',
            'Ctrl/Cmd + T': 'New task',
            'Ctrl/Cmd + B': 'Add bookmark',
            'Ctrl/Cmd + S': 'Save current item',
            'Ctrl/Cmd + L': 'Logout',
            'Ctrl/Cmd + /': 'Show shortcuts',
            'Ctrl/Cmd + Shift + D': 'Toggle dark mode',
            'Ctrl/Cmd + Shift + U': 'Upload file',
            'Ctrl/Cmd + Shift + T': 'Go to tasks',
            'Ctrl/Cmd + Shift + S': 'Sync data',
            'Escape': 'Close modal',
            '?': 'Show this menu'
        };
        
        const modal = document.createElement('div');
        modal.className = 'shortcuts-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; border: 1px solid rgba(139,92,246,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="color: white;">⌨️ Keyboard Shortcuts</h3>
                    <button onclick="this.closest('.shortcuts-modal').remove()" style="background: none; border: none; color: #a1a1aa; font-size: 1.2rem; cursor: pointer;">✕</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${Object.entries(shortcuts).map(([key, description]) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <span style="font-family: monospace; background: rgba(139,92,246,0.2); padding: 0.25rem 0.75rem; border-radius: 6px; color: #8B5CF6; font-size: 0.85rem;">${key}</span>
                            <span style="color: #a1a1aa; font-size: 0.9rem;">${description}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.75rem; color: #71717a; text-align: center;">
                    <p>💡 Tip: Press <kbd style="background: rgba(139,92,246,0.2); padding: 2px 6px; border-radius: 4px; color: #8B5CF6;">?</kbd> anytime to see this menu</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    showWelcomeMessage() {
        const hour = new Date().getHours();
        let greeting = 'Good ';
        if (hour < 12) greeting += 'morning';
        else if (hour < 18) greeting += 'afternoon';
        else greeting += 'evening';
        
        setTimeout(() => {
            this.showNotification(`${greeting}, ${this.currentUser?.username || 'User'}! Welcome to Alan Vault.`, 'success');
        }, 500);
    }
    
    showNotification(message, type = 'info') {
        if (this.notifications) {
            this.notifications[type](message);
        } else if (window.notify) {
            window.notify[type](message);
        } else if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            this.showFallbackToast(message, type);
        }
    }
    
    showFallbackToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `fallback-toast ${type}`;
        toast.textContent = message;
        const colors = {
            error: '#ef4444',
            success: '#10b981',
            warning: '#f59e0b',
            info: '#4F46E5'
        };
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${colors[type] || '#4F46E5'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-size: 0.875rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
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
    
    isOnline() {
        return navigator.onLine;
    }
    
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getAppVersion() {
        return CONFIG.APP_VERSION;
    }
    
    getUptime() {
        return Date.now() - this.startTime;
    }
    
    getFormattedUptime() {
        const ms = this.getUptime();
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    
    getStorageUsage() {
        if (!this.currentUser) return { used: 0, limit: 0, percentage: 0 };
        
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${this.currentUser.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        const totalSize = vault.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const limit = CONFIG.STORAGE.FREE;
        
        return {
            used: totalSize,
            limit: limit,
            percentage: (totalSize / limit) * 100,
            usedFormatted: this.formatBytes(totalSize),
            limitFormatted: this.formatBytes(limit)
        };
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Try API logout
            if (this.api) {
                try {
                    await this.api.logout();
                } catch (e) {
                    console.log('API logout failed, using local');
                }
            }
            
            this.clearAuth();
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
                this.syncInterval = null;
            }
            window.location.href = 'login.html';
        }
    }
    
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.listeners = [];
        this.dispatchEvent('app:destroy');
        console.log('Application destroyed');
    }
}

// ========================================
// INITIALIZE APP
// ========================================

let app = null;

document.addEventListener('DOMContentLoaded', async () => {
    app = new AlanVaultApp();
    window.app = app;
});

// Also try to initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {});
} else {
    setTimeout(() => {
        if (!app) {
            app = new AlanVaultApp();
            window.app = app;
        }
    }, 100);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AlanVaultApp };
}

// Add CSS for animations if not present
if (!document.querySelector('#app-styles')) {
    const style = document.createElement('style');
    style.id = 'app-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .fallback-toast {
            animation: slideInRight 0.3s ease;
        }
        
        .custom-tooltip {
            animation: fadeIn 0.2s ease;
            pointer-events: none;
        }
        
        .shortcuts-modal kbd {
            background: rgba(139,92,246,0.2);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            color: #8B5CF6;
        }
        
        .shortcuts-modal::-webkit-scrollbar {
            width: 4px;
        }
        .shortcuts-modal::-webkit-scrollbar-track {
            background: transparent;
        }
        .shortcuts-modal::-webkit-scrollbar-thumb {
            background: rgba(139,92,246,0.3);
            border-radius: 2px;
        }
    `;
    document.head.appendChild(style);
}

console.log('🚀 Alan Vault App loaded (Supabase Ready)');
console.log('🌐 Using Supabase API with localStorage fallback');
console.log('💡 Press ? for keyboard shortcuts');