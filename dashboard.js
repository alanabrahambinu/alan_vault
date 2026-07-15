/* ========================================
   ALAN VAULT - DASHBOARD CONTROLLER
   Main Dashboard Logic & Data Management
   ======================================== */

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
    STORAGE_KEYS: {
        USER_DATA: 'currentUser',
        VAULT_PREFIX: 'vault_',
        THEME: 'theme',
        SETTINGS: 'settings_'
    },
    LIMITS: {
        STORAGE_LIMIT: 5 * 1024 * 1024 * 1024, // 5GB
        MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    },
    API: {
        BASE_URL: window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api'
    }
};

// ========================================
// DASHBOARD CONTROLLER CLASS
// ========================================

class DashboardController {
    constructor() {
        this.currentUser = null;
        this.vaultData = null;
        this.charts = {};
        this.autoRefreshInterval = null;
        this.init();
    }
    
    async init() {
        // Check authentication - try Supabase token first
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        
        if (!token || !user) {
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = JSON.parse(user);
        await this.loadData();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.updateUserDisplay();
        this.updateDateTime();
    }
    
    async loadData() {
        try {
            const token = localStorage.getItem('authToken');
            const userId = this.currentUser.id;
            
            // Try to load from Supabase API first
            try {
                const [filesData, notesData, tasksData, bookmarksData] = await Promise.all([
                    this.fetchFromAPI('/api/files/list', token),
                    this.fetchFromAPI('/api/notes/list', token),
                    this.fetchFromAPI('/api/tasks/list', token),
                    this.fetchFromAPI('/api/bookmarks/list', token)
                ]);
                
                this.vaultData = {
                    files: filesData.files || [],
                    notes: notesData.notes || [],
                    tasks: tasksData.tasks || [],
                    bookmarks: bookmarksData.bookmarks || []
                };
                
                // Update localStorage cache
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${userId}`;
                localStorage.setItem(vaultKey, JSON.stringify(this.vaultData));
                
            } catch (apiError) {
                console.log('API fetch failed, using localStorage fallback:', apiError.message);
                
                // Fallback to localStorage
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${userId}`;
                const data = localStorage.getItem(vaultKey);
                
                if (data) {
                    this.vaultData = JSON.parse(data);
                } else {
                    this.vaultData = {
                        files: [],
                        notes: [],
                        tasks: [],
                        bookmarks: []
                    };
                }
            }
            
            // Update all dashboard components
            this.updateStats();
            this.renderQuickActions();
            this.loadRecentActivity();
            this.loadCharts();
            this.updateStorageStats();
            
            // Dispatch event
            document.dispatchEvent(new CustomEvent('dashboard:loaded', { 
                detail: { data: this.vaultData }
            }));
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    async fetchFromAPI(endpoint, token) {
        const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
    }
    
    updateStats() {
        // Update statistics counters with animation
        this.animateCounter('totalFiles', this.vaultData.files.length);
        this.animateCounter('totalNotes', this.vaultData.notes.length);
        this.animateCounter('totalTasks', this.vaultData.tasks.filter(t => !t.completed).length);
        this.animateCounter('completedTasks', this.vaultData.tasks.filter(t => t.completed).length);
        this.animateCounter('totalBookmarks', this.vaultData.bookmarks.length);
        
        // Update completion rate
        const totalTasks = this.vaultData.tasks.length;
        const completedTasks = this.vaultData.tasks.filter(t => t.completed).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        this.animateCounter('completionRate', completionRate, '%');
        
        // Update storage used
        const totalSize = this.vaultData.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const usedGB = (totalSize / (1024 * 1024 * 1024)).toFixed(1);
        const storageUsedEl = document.getElementById('storageUsed');
        if (storageUsedEl) {
            storageUsedEl.textContent = `${usedGB} GB`;
        }
        
        // Update progress bar
        const percentUsed = (totalSize / CONFIG.LIMITS.STORAGE_LIMIT) * 100;
        const storageBar = document.getElementById('storageBar');
        if (storageBar) {
            storageBar.style.width = `${Math.min(percentUsed, 100)}%`;
        }
    }
    
    animateCounter(elementId, targetValue, suffix = '') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * this.easeOutCubic(progress));
            
            element.textContent = currentValue + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
    }
    
    updateUserDisplay() {
        const usernameElements = document.querySelectorAll('#usernameDisplay, .user-name, .welcome-name');
        usernameElements.forEach(el => {
            if (el) el.textContent = this.currentUser.username || this.currentUser.name || 'User';
        });
        
        // Update welcome message based on time of day
        const welcomeEl = document.getElementById('welcomeMessage');
        if (welcomeEl) {
            const hour = new Date().getHours();
            let greeting = '';
            if (hour < 12) greeting = 'Good morning';
            else if (hour < 18) greeting = 'Good afternoon';
            else greeting = 'Good evening';
            
            welcomeEl.textContent = `${greeting}, ${this.currentUser.username || 'User'}!`;
        }
    }
    
    updateDateTime() {
        const update = () => {
            const now = new Date();
            const dateTimeEl = document.getElementById('currentDateTime');
            if (dateTimeEl) {
                dateTimeEl.textContent = now.toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        };
        
        update();
        setInterval(update, 60000);
    }
    
    renderQuickActions() {
        const actionsContainer = document.getElementById('quickActions');
        if (!actionsContainer) return;
        
        const actions = [
            { icon: '📤', label: 'Upload File', action: () => window.location.href = 'upload.html', color: '#4F46E5' },
            { icon: '📝', label: 'New Note', action: () => window.location.href = 'notes.html?new=true', color: '#8B5CF6' },
            { icon: '✅', label: 'New Task', action: () => window.location.href = 'tasks.html?new=true', color: '#10b981' },
            { icon: '🔗', label: 'Add Bookmark', action: () => window.location.href = 'bookmarks.html?new=true', color: '#f59e0b' },
            { icon: '📁', label: 'New Folder', action: () => this.createFolder(), color: '#3b82f6' },
            { icon: '🔍', label: 'Search', action: () => document.getElementById('globalSearch')?.focus(), color: '#ec4899' },
            { icon: '🔄', label: 'Sync', action: () => this.syncData(), color: '#8B5CF6' }
        ];
        
        actionsContainer.innerHTML = actions.map(action => `
            <div class="quick-action-card" data-action="${action.label}" style="
                background: linear-gradient(135deg, ${action.color}20, ${action.color}10);
                border: 1px solid ${action.color}30;
                border-radius: 16px;
                padding: 1rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                min-width: 100px;
            ">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${action.icon}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary, #a1a1aa);">${action.label}</div>
            </div>
        `).join('');
        
        // Add click handlers
        document.querySelectorAll('.quick-action-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                const action = actions[index];
                if (action && action.action) {
                    action.action();
                }
            });
            
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
        });
    }
    
    async syncData() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            this.showNotification('Please login first', 'error');
            return;
        }
        
        try {
            this.showNotification('Syncing data...', 'info');
            
            // Get local data
            const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${this.currentUser.id}`;
            const localData = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
            
            // Send to server
            const response = await fetch('/api/migrate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ data: localData })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(`Sync complete! ${result.count || 0} items synced.`, 'success');
                await this.loadData();
            } else {
                this.showNotification(result.error || 'Sync failed', 'error');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.showNotification('Sync failed. Please try again.', 'error');
        }
    }
    
    createFolder() {
        const folderName = prompt('Enter folder name:');
        if (folderName && folderName.trim()) {
            // Dispatch event for vault page to handle
            document.dispatchEvent(new CustomEvent('create:folder', { 
                detail: { name: folderName.trim() }
            }));
            this.showNotification('Folder created successfully!', 'success');
        }
    }
    
    async loadRecentActivity() {
        const container = document.getElementById('recentActivityList');
        if (!container) return;
        
        // Combine all activities
        const activities = [
            ...this.vaultData.files.map(f => ({ ...f, type: 'file', icon: '📄', action: 'uploaded', name: f.name, date: f.date || f.uploaded_at || f.created_at })),
            ...this.vaultData.notes.map(n => ({ ...n, type: 'note', icon: '📝', action: 'updated', name: n.title, date: n.updated || n.updated_at || n.created_at })),
            ...this.vaultData.tasks.map(t => ({ ...t, type: 'task', icon: '✅', action: t.completed ? 'completed' : 'created', name: t.title, date: t.updated || t.updated_at || t.created_at || t.created })),
            ...this.vaultData.bookmarks.map(b => ({ ...b, type: 'bookmark', icon: '🔗', action: 'added', name: b.title, date: b.created || b.created_at }))
        ];
        
        // Sort by date (newest first)
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentActivities = activities.slice(0, 10);
        
        if (recentActivities.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-tertiary, #71717a);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <p>No recent activity</p>
                    <p style="font-size: 0.875rem;">Start by uploading files or creating notes</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recentActivities.map(activity => `
            <div class="activity-item" onclick="window.location.href='${activity.type}s.html'" style="
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                background: rgba(255, 255, 255, 0.02);
                border-radius: 12px;
                transition: all 0.3s;
                cursor: pointer;
                margin-bottom: 0.5rem;
            ">
                <div class="activity-icon" style="
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, rgba(79,70,229,0.2), rgba(139,92,246,0.2));
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                ">${activity.icon}</div>
                <div class="activity-content" style="flex: 1;">
                    <div class="activity-title" style="font-weight: 500; margin-bottom: 0.25rem;">
                        ${activity.action} ${this.escapeHtml(activity.name || 'Untitled')}
                    </div>
                    <div class="activity-time" style="font-size: 0.7rem; color: var(--text-tertiary, #71717a);">
                        ${this.formatRelativeTime(activity.date)}
                    </div>
                </div>
                <div class="activity-type" style="
                    font-size: 0.7rem;
                    padding: 0.25rem 0.5rem;
                    background: rgba(139,92,246,0.1);
                    border-radius: 50px;
                    color: #8B5CF6;
                ">${activity.type}</div>
            </div>
        `).join('');
    }
    
    loadCharts() {
        if (window.chartManager) {
            window.chartManager.initCharts(this.vaultData);
        }
    }
    
    updateStorageStats() {
        if (window.storageStats) {
            window.storageStats.update(this.vaultData);
        }
    }
    
    formatRelativeTime(dateString) {
        if (!dateString) return 'Just now';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Just now';
        
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }
    
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        // Search input
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + R - Refresh dashboard
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.refresh();
            }
            // Ctrl/Cmd + S - Sync data
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.syncData();
            }
        });
        
        // Listen for data updates
        document.addEventListener('vault:updated', () => {
            this.loadData();
        });
    }
    
    async handleSearch(query) {
        if (!query.trim()) return;
        
        if (window.searchEngine) {
            const results = window.searchEngine.search(query, { limit: 5 });
            this.showSearchResults(results);
        } else {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
    }
    
    showSearchResults(results) {
        // Implement search results dropdown
        console.log('Search results:', results);
    }
    
    startAutoRefresh() {
        // Auto refresh every 30 seconds
        this.autoRefreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                this.refresh();
            }
        }, 30000);
    }
    
    async refresh() {
        this.showNotification('Refreshing dashboard...', 'info');
        await this.loadData();
        this.showNotification('Dashboard updated!', 'success');
    }
    
    showNotification(message, type) {
        if (window.notify && window.notify[type]) {
            window.notify[type](message);
        } else if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    }
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardController();
});

// Handle logout
window.logoutUser = function() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loggedIn');
    window.location.href = 'login.html';
};

console.log('📊 Dashboard controller loaded (Supabase Ready)');
console.log('🌐 Using Supabase API with local fallback');
console.log('💡 Quick actions: Ctrl+R to refresh, Ctrl+S to sync');