/* ========================================
   ALAN VAULT - OFFLINE MANAGER
   Offline Support & Sync Queue
   ======================================== */

class OfflineService {
    constructor() {
        this.queue = [];
        this.cache = new Map();
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.init();
    }
    
    async init() {
        this.loadQueue();
        this.loadCache();
        this.setupEventListeners();
        
        // Register service worker for offline support
        if ('serviceWorker' in navigator && CONFIG.FEATURES.PWA_ENABLED) {
            this.registerServiceWorker();
        }
        
        // Pre-cache critical assets
        this.precacheAssets();
    }
    
    setupEventListeners() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('ServiceWorker registered:', registration);
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateNotification();
                    }
                });
            });
        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
        }
    }
    
    precacheAssets() {
        const assetsToCache = [
            '/',
            '/index.html',
            '/dashboard.html',
            '/css/main.css',
            '/js/app.js',
            '/manifest.json'
        ];
        
        caches.open('alan-vault-v1').then(cache => {
            cache.addAll(assetsToCache);
        });
    }
    
    handleOnline() {
        console.log('App is online, syncing...');
        this.isOnline = true;
        this.syncQueue();
        this.dispatchEvent('online');
        this.showNotification('Connection restored! Syncing data...', 'success');
    }
    
    handleOffline() {
        console.log('App is offline');
        this.isOnline = false;
        this.dispatchEvent('offline');
        this.showNotification('You are offline. Changes will sync when connection returns.', 'warning');
    }
    
    addToQueue(operation) {
        const queuedOperation = {
            id: this.generateId(),
            ...operation,
            timestamp: Date.now(),
            retryCount: 0
        };
        
        this.queue.push(queuedOperation);
        this.saveQueue();
        this.dispatchEvent('queue:updated', { size: this.queue.length });
        
        // Try to sync immediately if online
        if (this.isOnline) {
            this.syncQueue();
        }
        
        return queuedOperation.id;
    }
    
    async syncQueue() {
        if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
            return;
        }
        
        this.syncInProgress = true;
        this.dispatchEvent('sync:start', { count: this.queue.length });
        
        const failedOperations = [];
        
        for (const operation of this.queue) {
            try {
                await this.processOperation(operation);
                this.removeFromQueue(operation.id);
                this.dispatchEvent('sync:success', { operation });
            } catch (error) {
                console.error(`Operation failed: ${operation.type}`, error);
                operation.retryCount++;
                failedOperations.push(operation);
                
                this.dispatchEvent('sync:failed', { operation, error });
            }
        }
        
        this.queue = failedOperations;
        this.saveQueue();
        
        this.syncInProgress = false;
        this.dispatchEvent('sync:complete', { remaining: this.queue.length });
        
        if (this.queue.length === 0) {
            this.showNotification('All changes synced!', 'success');
        }
    }
    
    async processOperation(operation) {
        const { type, data } = operation;
        
        switch (type) {
            case 'upload_file':
                await this.processFileUpload(data);
                break;
            case 'delete_file':
                await this.processFileDelete(data);
                break;
            case 'create_note':
                await this.processNoteCreate(data);
                break;
            case 'update_note':
                await this.processNoteUpdate(data);
                break;
            case 'delete_note':
                await this.processNoteDelete(data);
                break;
            case 'create_task':
                await this.processTaskCreate(data);
                break;
            case 'update_task':
                await this.processTaskUpdate(data);
                break;
            case 'delete_task':
                await this.processTaskDelete(data);
                break;
            case 'create_bookmark':
                await this.processBookmarkCreate(data);
                break;
            case 'delete_bookmark':
                await this.processBookmarkDelete(data);
                break;
            default:
                console.warn('Unknown operation type:', type);
        }
    }
    
    async processFileUpload(data) {
        // In production, send to API
        console.log('Processing file upload:', data);
        
        // Simulate API call
        await this.sleep(1000);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"files":[]}');
        
        vault.files.push(data.file);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
        
        // Update cache
        this.addToCache(`file_${data.file.id}`, data.file);
    }
    
    async processFileDelete(data) {
        console.log('Processing file delete:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"files":[]}');
        
        vault.files = vault.files.filter(f => f.id !== data.fileId);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
        
        // Remove from cache
        this.removeFromCache(`file_${data.fileId}`);
    }
    
    async processNoteCreate(data) {
        console.log('Processing note create:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"notes":[]}');
        
        vault.notes.push(data.note);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
        
        this.addToCache(`note_${data.note.id}`, data.note);
    }
    
    async processNoteUpdate(data) {
        console.log('Processing note update:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"notes":[]}');
        
        const index = vault.notes.findIndex(n => n.id === data.noteId);
        if (index !== -1) {
            vault.notes[index] = { ...vault.notes[index], ...data.updates };
            localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
            this.addToCache(`note_${data.noteId}`, vault.notes[index]);
        }
    }
    
    async processNoteDelete(data) {
        console.log('Processing note delete:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"notes":[]}');
        
        vault.notes = vault.notes.filter(n => n.id !== data.noteId);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
        
        this.removeFromCache(`note_${data.noteId}`);
    }
    
    async processTaskCreate(data) {
        console.log('Processing task create:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"tasks":[]}');
        
        vault.tasks.push(data.task);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
        
        this.addToCache(`task_${data.task.id}`, data.task);
    }
    
    async processTaskUpdate(data) {
        console.log('Processing task update:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"tasks":[]}');
        
        const index = vault.tasks.findIndex(t => t.id === data.taskId);
        if (index !== -1) {
            vault.tasks[index] = { ...vault.tasks[index], ...data.updates };
            localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
            this.addToCache(`task_${data.taskId}`, vault.tasks[index]);
        }
    }
    
    async processTaskDelete(data) {
        console.log('Processing task delete:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"tasks":[]}');
        
        vault.tasks = vault.tasks.filter(t => t.id !== data.taskId);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
        
        this.removeFromCache(`task_${data.taskId}`);
    }
    
    async processBookmarkCreate(data) {
        console.log('Processing bookmark create:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"bookmarks":[]}');
        
        vault.bookmarks.push(data.bookmark);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
        
        this.addToCache(`bookmark_${data.bookmark.id}`, data.bookmark);
    }
    
    async processBookmarkDelete(data) {
        console.log('Processing bookmark delete:', data);
        await this.sleep(500);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vault = JSON.parse(localStorage.getItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`) || '{"bookmarks":[]}');
        
        vault.bookmarks = vault.bookmarks.filter(b => b.id !== data.bookmarkId);
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`, JSON.stringify(vault));
        
        this.removeFromCache(`bookmark_${data.bookmarkId}`);
    }
    
    addToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        this.saveCache();
    }
    
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached) {
            // Check if cache is still valid (24 hours)
            if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
                return cached.data;
            } else {
                this.cache.delete(key);
                this.saveCache();
            }
        }
        return null;
    }
    
    removeFromCache(key) {
        this.cache.delete(key);
        this.saveCache();
    }
    
    loadQueue() {
        const savedQueue = localStorage.getItem(CONFIG.STORAGE_KEYS.OFFLINE_QUEUE);
        if (savedQueue) {
            this.queue = JSON.parse(savedQueue);
        }
    }
    
    saveQueue() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.queue));
    }
    
    loadCache() {
        const savedCache = localStorage.getItem('offline_cache');
        if (savedCache) {
            const cacheObj = JSON.parse(savedCache);
            this.cache = new Map(Object.entries(cacheObj));
        }
    }
    
    saveCache() {
        const cacheObj = Object.fromEntries(this.cache);
        localStorage.setItem('offline_cache', JSON.stringify(cacheObj));
    }
    
    removeFromQueue(operationId) {
        this.queue = this.queue.filter(op => op.id !== operationId);
        this.saveQueue();
    }
    
    generateId() {
        return 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    dispatchEvent(event, data) {
        const domEvent = new CustomEvent(`offline:${event}`, { detail: data });
        document.dispatchEvent(domEvent);
    }
    
    showNotification(message, type) {
        if (window.notify) {
            window.notify[type](message);
        }
    }
    
    showUpdateNotification() {
        if (window.notify) {
            window.notify.info('New version available! Refresh to update.', 'Update Available');
        }
    }
    
    getQueueSize() {
        return this.queue.length;
    }
    
    getCacheSize() {
        return this.cache.size;
    }
    
    hasPending() {
        return this.queue.length > 0;
    }
    
    clearQueue() {
        this.queue = [];
        this.saveQueue();
        this.dispatchEvent('queue:cleared');
    }
    
    clearCache() {
        this.cache.clear();
        this.saveCache();
    }
}

// Initialize offline service
const offlineService = new OfflineService();
window.OfflineService = offlineService;