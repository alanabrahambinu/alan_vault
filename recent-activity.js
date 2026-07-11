/* ========================================
   ALAN VAULT - RECENT ACTIVITY MANAGER
   Activity Tracking & Display
   ======================================== */

class RecentActivityManager {
    constructor() {
        this.activities = [];
        this.maxActivities = 50;
        this.init();
    }
    
    init() {
        this.loadActivities();
        this.setupEventListeners();
        this.startAutoCleanup();
    }
    
    loadActivities() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const activitiesKey = `activities_${user.id}`;
        const saved = localStorage.getItem(activitiesKey);
        
        if (saved) {
            this.activities = JSON.parse(saved);
        } else {
            this.generateMockActivities();
        }
        
        this.render();
    }
    
    generateMockActivities() {
        const mockActivities = [];
        const now = new Date();
        
        const actions = [
            { type: 'file', action: 'uploaded', icon: '📄', items: ['report.pdf', 'invoice.docx', 'presentation.pptx'] },
            { type: 'note', action: 'created', icon: '📝', items: ['Meeting Notes', 'Project Ideas', 'Todo List'] },
            { type: 'task', action: 'completed', icon: '✅', items: ['Review code', 'Update documentation', 'Fix bug'] },
            { type: 'bookmark', action: 'added', icon: '🔗', items: ['GitHub', 'Stack Overflow', 'MDN Docs'] }
        ];
        
        for (let i = 0; i < 20; i++) {
            const action = actions[Math.floor(Math.random() * actions.length)];
            const item = action.items[Math.floor(Math.random() * action.items.length)];
            const date = new Date(now);
            date.setHours(now.getHours() - i);
            
            mockActivities.push({
                id: `act_${Date.now()}_${i}`,
                type: action.type,
                action: action.action,
                icon: action.icon,
                name: item,
                date: date.toISOString(),
                metadata: {}
            });
        }
        
        this.activities = mockActivities;
        this.saveActivities();
    }
    
    addActivity(type, action, name, metadata = {}) {
        const activity = {
            id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: type,
            action: action,
            icon: this.getIconForType(type),
            name: name,
            date: new Date().toISOString(),
            metadata: metadata,
            userId: this.getUserId()
        };
        
        this.activities.unshift(activity);
        
        // Limit activities
        if (this.activities.length > this.maxActivities) {
            this.activities = this.activities.slice(0, this.maxActivities);
        }
        
        this.saveActivities();
        this.render();
        this.dispatchEvent(activity);
        
        return activity;
    }
    
    getIconForType(type) {
        const icons = {
            file: '📄',
            note: '📝',
            task: '✅',
            bookmark: '🔗',
            folder: '📁',
            user: '👤',
            settings: '⚙️'
        };
        return icons[type] || '📌';
    }
    
    getUserId() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        return user.id;
    }
    
    saveActivities() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const activitiesKey = `activities_${user.id}`;
        localStorage.setItem(activitiesKey, JSON.stringify(this.activities));
    }
    
    render() {
        const container = document.getElementById('recentActivityList');
        if (!container) return;
        
        if (this.activities.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <p>No recent activity</p>
                    <p style="font-size: 0.875rem;">Start by uploading files or creating notes</p>
                </div>
            `;
            return;
        }
        
        // Group activities by date
        const grouped = this.groupByDate(this.activities);
        
        container.innerHTML = Object.entries(grouped).map(([dateLabel, activities]) => `
            <div class="activity-group" style="margin-bottom: 1.5rem;">
                <div class="activity-date" style="
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.75rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                ">${dateLabel}</div>
                <div class="activity-items">
                    ${activities.map(activity => this.renderActivityItem(activity)).join('')}
                </div>
            </div>
        `).join('');
    }
    
    renderActivityItem(activity) {
        return `
            <div class="activity-item" data-id="${activity.id}" onclick="window.recentActivity.handleActivityClick('${activity.type}', '${activity.id}')" style="
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
                        ${this.getActionText(activity)}
                    </div>
                    <div class="activity-time" style="font-size: 0.7rem; color: var(--text-tertiary);">
                        ${this.formatTime(activity.date)}
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
        `;
    }
    
    getActionText(activity) {
        const templates = {
            file: `${activity.action} ${activity.name}`,
            note: `${activity.action} "${activity.name}"`,
            task: `${activity.action} task: ${activity.name}`,
            bookmark: `${activity.action} bookmark: ${activity.name}`,
            folder: `${activity.action} folder: ${activity.name}`
        };
        return templates[activity.type] || `${activity.action} ${activity.name}`;
    }
    
    groupByDate(activities) {
        const groups = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        activities.forEach(activity => {
            const activityDate = new Date(activity.date);
            let label;
            
            if (activityDate.toDateString() === today.toDateString()) {
                label = 'Today';
            } else if (activityDate.toDateString() === yesterday.toDateString()) {
                label = 'Yesterday';
            } else if (today.getTime() - activityDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
                label = activityDate.toLocaleDateString('en-US', { weekday: 'long' });
            } else {
                label = activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            
            if (!groups[label]) groups[label] = [];
            groups[label].push(activity);
        });
        
        return groups;
    }
    
    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    handleActivityClick(type, id) {
        // Navigate to appropriate page
        const routes = {
            file: 'vault.html',
            note: 'notes.html',
            task: 'tasks.html',
            bookmark: 'bookmarks.html',
            folder: 'vault.html'
        };
        
        const route = routes[type] || 'dashboard.html';
        window.location.href = route;
    }
    
    setupEventListeners() {
        // Listen for various actions to add activities
        document.addEventListener('file:uploaded', (e) => {
            this.addActivity('file', 'uploaded', e.detail.fileName);
        });
        
        document.addEventListener('file:deleted', (e) => {
            this.addActivity('file', 'deleted', e.detail.fileName);
        });
        
        document.addEventListener('note:created', (e) => {
            this.addActivity('note', 'created', e.detail.noteTitle);
        });
        
        document.addEventListener('note:updated', (e) => {
            this.addActivity('note', 'updated', e.detail.noteTitle);
        });
        
        document.addEventListener('note:deleted', (e) => {
            this.addActivity('note', 'deleted', e.detail.noteTitle);
        });
        
        document.addEventListener('task:created', (e) => {
            this.addActivity('task', 'created', e.detail.taskTitle);
        });
        
        document.addEventListener('task:completed', (e) => {
            this.addActivity('task', 'completed', e.detail.taskTitle);
        });
        
        document.addEventListener('task:deleted', (e) => {
            this.addActivity('task', 'deleted', e.detail.taskTitle);
        });
        
        document.addEventListener('bookmark:added', (e) => {
            this.addActivity('bookmark', 'added', e.detail.bookmarkTitle);
        });
        
        document.addEventListener('bookmark:deleted', (e) => {
            this.addActivity('bookmark', 'deleted', e.detail.bookmarkTitle);
        });
        
        document.addEventListener('folder:created', (e) => {
            this.addActivity('folder', 'created', e.detail.folderName);
        });
        
        // Listen for vault updates
        document.addEventListener('vault:updated', () => {
            this.loadActivities();
        });
    }
    
    dispatchEvent(activity) {
        const event = new CustomEvent('activity:added', { detail: activity });
        document.dispatchEvent(event);
    }
    
    startAutoCleanup() {
        // Clean up old activities every day
        setInterval(() => {
            this.cleanupOldActivities();
        }, 24 * 60 * 60 * 1000);
    }
    
    cleanupOldActivities() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        this.activities = this.activities.filter(a => new Date(a.date) > thirtyDaysAgo);
        this.saveActivities();
        this.render();
    }
    
    getActivities(filter = {}) {
        let filtered = [...this.activities];
        
        if (filter.type) {
            filtered = filtered.filter(a => a.type === filter.type);
        }
        
        if (filter.fromDate) {
            filtered = filtered.filter(a => new Date(a.date) >= new Date(filter.fromDate));
        }
        
        if (filter.toDate) {
            filtered = filtered.filter(a => new Date(a.date) <= new Date(filter.toDate));
        }
        
        if (filter.limit) {
            filtered = filtered.slice(0, filter.limit);
        }
        
        return filtered;
    }
    
    clearActivities() {
        this.activities = [];
        this.saveActivities();
        this.render();
    }
}

// Initialize recent activity manager
const recentActivity = new RecentActivityManager();
window.recentActivity = recentActivity;