/* ========================================
   ALAN VAULT - SYSTEM LOGS
   Activity Logging & Audit Trail
   ======================================== */

class LogManager {
    constructor() {
        this.logs = [];
        this.filters = {
            level: 'all',
            type: 'all',
            dateRange: 'all',
            search: ''
        };
        this.init();
    }
    
    init() {
        this.loadLogs();
        this.setupEventListeners();
        this.renderLogs();
        this.startAutoCleanup();
    }
    
    loadLogs() {
        const saved = localStorage.getItem('system_logs');
        if (saved) {
            this.logs = JSON.parse(saved);
        } else {
            this.generateSampleLogs();
        }
    }
    
    saveLogs() {
        localStorage.setItem('system_logs', JSON.stringify(this.logs));
        this.dispatchEvent('logs:updated', { count: this.logs.length });
    }
    
    generateSampleLogs() {
        const sampleLogs = [
            { id: this.generateId(), level: 'info', type: 'auth', action: 'User logged in', details: 'Successful login from 192.168.1.1', userId: '1', userEmail: 'admin@alanvault.com', timestamp: new Date().toISOString() },
            { id: this.generateId(), level: 'success', type: 'file', action: 'File uploaded', details: 'document.pdf (2.5 MB)', userId: '1', userEmail: 'admin@alanvault.com', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { id: this.generateId(), level: 'warning', type: 'security', action: 'Failed login attempt', details: 'Invalid password for user@example.com', timestamp: new Date(Date.now() - 7200000).toISOString() },
            { id: this.generateId(), level: 'error', type: 'system', action: 'API error', details: '500 Internal Server Error on /api/files', timestamp: new Date(Date.now() - 86400000).toISOString() }
        ];
        this.logs = sampleLogs;
        this.saveLogs();
    }
    
    addLog(level, type, action, details = '', metadata = {}) {
        const currentUser = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        
        const log = {
            id: this.generateId(),
            level: level, // info, success, warning, error
            type: type, // auth, file, note, task, system, security
            action: action,
            details: details,
            userId: currentUser.id || null,
            userEmail: currentUser.email || null,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            metadata: metadata
        };
        
        this.logs.unshift(log);
        
        // Keep only last 10,000 logs
        if (this.logs.length > 10000) {
            this.logs = this.logs.slice(0, 10000);
        }
        
        this.saveLogs();
        this.renderLogs();
        
        // Also log to console
        console.log(`[${level.toUpperCase()}] ${action}: ${details}`);
        
        return log;
    }
    
    getFilteredLogs() {
        let filtered = [...this.logs];
        
        // Filter by level
        if (this.filters.level !== 'all') {
            filtered = filtered.filter(l => l.level === this.filters.level);
        }
        
        // Filter by type
        if (this.filters.type !== 'all') {
            filtered = filtered.filter(l => l.type === this.filters.type);
        }
        
        // Filter by date range
        if (this.filters.dateRange !== 'all') {
            const now = new Date();
            const ranges = {
                today: new Date(now.setHours(0, 0, 0, 0)),
                yesterday: new Date(now.setDate(now.getDate() - 1)),
                week: new Date(now.setDate(now.getDate() - 7)),
                month: new Date(now.setMonth(now.getMonth() - 1))
            };
            
            if (ranges[this.filters.dateRange]) {
                filtered = filtered.filter(l => new Date(l.timestamp) >= ranges[this.filters.dateRange]);
            }
        }
        
        // Filter by search
        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(l => 
                l.action.toLowerCase().includes(search) ||
                l.details.toLowerCase().includes(search) ||
                (l.userEmail && l.userEmail.toLowerCase().includes(search))
            );
        }
        
        return filtered;
    }
    
    getLogStats() {
        const total = this.logs.length;
        const info = this.logs.filter(l => l.level === 'info').length;
        const success = this.logs.filter(l => l.level === 'success').length;
        const warning = this.logs.filter(l => l.level === 'warning').length;
        const error = this.logs.filter(l => l.level === 'error').length;
        
        const byType = {
            auth: this.logs.filter(l => l.type === 'auth').length,
            file: this.logs.filter(l => l.type === 'file').length,
            note: this.logs.filter(l => l.type === 'note').length,
            task: this.logs.filter(l => l.type === 'task').length,
            system: this.logs.filter(l => l.type === 'system').length,
            security: this.logs.filter(l => l.type === 'security').length
        };
        
        return { total, info, success, warning, error, byType };
    }
    
    clearLogs() {
        if (confirm('Clear all logs? This action cannot be undone.')) {
            this.logs = [];
            this.saveLogs();
            this.renderLogs();
            this.showNotification('Logs cleared', 'success');
        }
    }
    
    exportLogs(format = 'json') {
        const exportData = {
            logs: this.getFilteredLogs(),
            exportDate: new Date().toISOString(),
            totalCount: this.logs.length,
            filteredCount: this.getFilteredLogs().length
        };
        
        let content, mimeType, extension;
        
        if (format === 'json') {
            content = JSON.stringify(exportData, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else if (format === 'csv') {
            const headers = ['Timestamp', 'Level', 'Type', 'Action', 'Details', 'User', 'User Agent'];
            const rows = exportData.logs.map(log => [
                log.timestamp,
                log.level,
                log.type,
                log.action,
                log.details,
                log.userEmail || 'System',
                log.userAgent || ''
            ]);
            content = [headers, ...rows].map(row => row.join(',')).join('\n');
            mimeType = 'text/csv';
            extension = 'csv';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_export_${new Date().toISOString().split('T')[0]}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Logs exported successfully', 'success');
    }
    
    setFilter(filterType, value) {
        this.filters[filterType] = value;
        this.renderLogs();
    }
    
    searchLogs(query) {
        this.filters.search = query;
        this.renderLogs();
    }
    
    renderLogs() {
        const container = document.getElementById('logsContainer');
        if (!container) return;
        
        const filteredLogs = this.getFilteredLogs();
        const stats = this.getLogStats();
        
        this.updateStats(stats);
        
        if (filteredLogs.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: #71717a;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <p>No logs found</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredLogs.map(log => `
            <div class="log-entry log-level-${log.level}" style="
                padding: 0.75rem;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                display: flex;
                gap: 1rem;
                align-items: flex-start;
                transition: background 0.3s;
            " onmouseenter="this.style.background='rgba(139,92,246,0.05)'" onmouseleave="this.style.background='transparent'">
                <div class="log-level" style="
                    width: 80px;
                    font-size: 0.7rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 50px;
                    text-align: center;
                    background: ${this.getLevelColor(log.level)}20;
                    color: ${this.getLevelColor(log.level)};
                ">${log.level.toUpperCase()}</div>
                
                <div class="log-type" style="
                    width: 70px;
                    font-size: 0.7rem;
                    color: #71717a;
                ">${log.type}</div>
                
                <div class="log-content" style="flex: 1;">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${this.escapeHtml(log.action)}</div>
                    <div style="font-size: 0.75rem; color: #a1a1aa;">${this.escapeHtml(log.details)}</div>
                    ${log.userEmail ? `<div style="font-size: 0.7rem; color: #71717a; margin-top: 0.25rem;">👤 ${this.escapeHtml(log.userEmail)}</div>` : ''}
                </div>
                
                <div class="log-time" style="
                    font-size: 0.7rem;
                    color: #71717a;
                    white-space: nowrap;
                ">${this.formatTime(log.timestamp)}</div>
            </div>
        `).join('');
    }
    
    updateStats(stats) {
        const elements = {
            totalLogs: document.getElementById('totalLogs'),
            infoLogs: document.getElementById('infoLogs'),
            successLogs: document.getElementById('successLogs'),
            warningLogs: document.getElementById('warningLogs'),
            errorLogs: document.getElementById('errorLogs'),
            authLogs: document.getElementById('authLogs'),
            fileLogs: document.getElementById('fileLogs'),
            systemLogs: document.getElementById('systemLogs')
        };
        
        if (elements.totalLogs) elements.totalLogs.textContent = stats.total;
        if (elements.infoLogs) elements.infoLogs.textContent = stats.info;
        if (elements.successLogs) elements.successLogs.textContent = stats.success;
        if (elements.warningLogs) elements.warningLogs.textContent = stats.warning;
        if (elements.errorLogs) elements.errorLogs.textContent = stats.error;
        if (elements.authLogs) elements.authLogs.textContent = stats.byType.auth;
        if (elements.fileLogs) elements.fileLogs.textContent = stats.byType.file;
        if (elements.systemLogs) elements.systemLogs.textContent = stats.byType.system;
    }
    
    getLevelColor(level) {
        const colors = {
            info: '#3b82f6',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        return colors[level] || '#6B7280';
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
    
    startAutoCleanup() {
        // Clean up logs older than 90 days
        setInterval(() => {
            const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
            const beforeCount = this.logs.length;
            
            this.logs = this.logs.filter(log => new Date(log.timestamp).getTime() > ninetyDaysAgo);
            
            if (this.logs.length !== beforeCount) {
                this.saveLogs();
                this.renderLogs();
                console.log(`Auto-cleaned ${beforeCount - this.logs.length} old logs`);
            }
        }, 24 * 60 * 60 * 1000);
    }
    
    setupEventListeners() {
        // Level filters
        document.querySelectorAll('.log-level-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                const level = filter.dataset.level;
                this.setFilter('level', level);
                
                document.querySelectorAll('.log-level-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
            });
        });
        
        // Type filters
        document.querySelectorAll('.log-type-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                const type = filter.dataset.type;
                this.setFilter('type', type);
                
                document.querySelectorAll('.log-type-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
            });
        });
        
        // Date range filters
        document.querySelectorAll('.log-date-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                const range = filter.dataset.range;
                this.setFilter('dateRange', range);
                
                document.querySelectorAll('.log-date-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
            });
        });
        
        // Search input
        const searchInput = document.getElementById('logSearch');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchLogs(e.target.value);
                }, 300);
            });
        }
        
        // Clear logs button
        const clearLogsBtn = document.getElementById('clearLogsBtn');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => this.clearLogs());
        }
        
        // Export buttons
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => this.exportLogs('json'));
        
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportLogs('csv'));
    }
    
    generateId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    showNotification(message, type) {
        if (window.notify) {
            window.notify[type](message);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize log manager
const logManager = new LogManager();
window.logManager = logManager;