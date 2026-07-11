/* ========================================
   ALAN VAULT - STORAGE MONITOR
   Storage Usage Tracking & Alerts
   ======================================== */

class StorageMonitor {
    constructor() {
        this.storageData = {};
        this.alerts = [];
        this.thresholds = {
            warning: 75,
            critical: 90,
            danger: 95
        };
        this.init();
    }
    
    init() {
        this.loadStorageData();
        this.startMonitoring();
        this.setupEventListeners();
        this.renderStorageStats();
    }
    
    loadStorageData() {
        const saved = localStorage.getItem('storage_metrics');
        if (saved) {
            this.storageData = JSON.parse(saved);
        }
    }
    
    saveStorageData() {
        localStorage.setItem('storage_metrics', JSON.stringify(this.storageData));
    }
    
    startMonitoring() {
        // Update every 5 minutes
        setInterval(() => {
            this.updateStorageMetrics();
            this.checkThresholds();
        }, 5 * 60 * 1000);
        
        // Initial update
        this.updateStorageMetrics();
    }
    
    updateStorageMetrics() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        let totalStorage = 0;
        let userStorage = [];
        
        users.forEach(user => {
            const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
            const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
            const userTotal = vault.files.reduce((sum, f) => sum + (f.size || 0), 0);
            totalStorage += userTotal;
            userStorage.push({
                userId: user.id,
                username: user.username,
                used: userTotal,
                percentage: (userTotal / CONFIG.LIMITS.STORAGE_LIMIT) * 100
            });
        });
        
        const timestamp = new Date().toISOString();
        const snapshot = {
            timestamp: timestamp,
            totalUsed: totalStorage,
            totalLimit: CONFIG.LIMITS.STORAGE_LIMIT,
            percentage: (totalStorage / CONFIG.LIMITS.STORAGE_LIMIT) * 100,
            userBreakdown: userStorage,
            dailyChange: this.calculateDailyChange(totalStorage)
        };
        
        // Store history
        const history = this.storageData.history || [];
        history.push(snapshot);
        
        // Keep only last 30 days of data points (every 5 minutes = 288 points per day)
        if (history.length > 8640) { // 30 days
            history.shift();
        }
        
        this.storageData = {
            current: snapshot,
            history: history,
            lastUpdated: timestamp
        };
        
        this.saveStorageData();
        this.renderStorageStats();
        this.renderStorageChart();
    }
    
    calculateDailyChange(currentTotal) {
        const history = this.storageData.history || [];
        if (history.length === 0) return 0;
        
        const yesterday = history[history.length - 288]; // 24 hours ago (288 data points)
        if (yesterday) {
            return currentTotal - yesterday.totalUsed;
        }
        return 0;
    }
    
    checkThresholds() {
        const percentage = this.storageData.current?.percentage || 0;
        const currentAlerts = this.alerts.filter(a => a.resolved === false);
        
        if (percentage >= this.thresholds.danger && !currentAlerts.some(a => a.type === 'danger')) {
            this.addAlert('danger', `Storage at ${percentage.toFixed(1)}% - Immediate action required`);
        } else if (percentage >= this.thresholds.critical && !currentAlerts.some(a => a.type === 'critical')) {
            this.addAlert('critical', `Storage at ${percentage.toFixed(1)}% - Critical level reached`);
        } else if (percentage >= this.thresholds.warning && !currentAlerts.some(a => a.type === 'warning')) {
            this.addAlert('warning', `Storage at ${percentage.toFixed(1)}% - Consider cleaning up`);
        }
    }
    
    addAlert(level, message) {
        const alert = {
            id: this.generateId(),
            level: level,
            message: message,
            timestamp: new Date().toISOString(),
            resolved: false
        };
        
        this.alerts.unshift(alert);
        this.saveAlerts();
        this.renderAlerts();
        
        if (window.notify) {
            const notifyType = level === 'danger' ? 'error' : (level === 'critical' ? 'warning' : 'info');
            window.notify[notifyType](message, 'Storage Alert');
        }
        
        this.addToLog(level === 'danger' ? 'error' : 'warning', 'storage', `Storage alert: ${message}`);
    }
    
    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = new Date().toISOString();
            this.saveAlerts();
            this.renderAlerts();
        }
    }
    
    saveAlerts() {
        localStorage.setItem('storage_alerts', JSON.stringify(this.alerts));
    }
    
    loadAlerts() {
        const saved = localStorage.getItem('storage_alerts');
        if (saved) {
            this.alerts = JSON.parse(saved);
        }
    }
    
    getTopUsers(limit = 5) {
        const users = this.storageData.current?.userBreakdown || [];
        return users.sort((a, b) => b.used - a.used).slice(0, limit);
    }
    
    getStorageTrend() {
        const history = this.storageData.history || [];
        if (history.length < 2) return { trend: 'stable', change: 0 };
        
        const lastWeek = history.slice(-336); // Last 7 days (288 * 7 = 2016, but simplified)
        const startSize = lastWeek[0]?.totalUsed || 0;
        const endSize = lastWeek[lastWeek.length - 1]?.totalUsed || 0;
        const change = endSize - startSize;
        const percentChange = startSize > 0 ? (change / startSize) * 100 : 0;
        
        let trend = 'stable';
        if (percentChange > 5) trend = 'increasing';
        else if (percentChange < -5) trend = 'decreasing';
        
        return { trend, change, percentChange };
    }
    
    getEstimatedDaysUntilFull() {
        const trend = this.getStorageTrend();
        if (trend.trend !== 'increasing') return null;
        
        const current = this.storageData.current?.totalUsed || 0;
        const remaining = CONFIG.LIMITS.STORAGE_LIMIT - current;
        const dailyIncrease = trend.change / 7; // Average daily increase over last week
        
        if (dailyIncrease <= 0) return null;
        
        const days = remaining / dailyIncrease;
        return Math.floor(days);
    }
    
    getRecommendations() {
        const recommendations = [];
        const percentage = this.storageData.current?.percentage || 0;
        
        if (percentage > 80) {
            recommendations.push({
                title: 'Clean up old files',
                description: 'Files older than 1 year can be archived',
                action: 'Review old files'
            });
        }
        
        if (percentage > 85) {
            recommendations.push({
                title: 'Compress large files',
                description: 'Some files can be compressed to save space',
                action: 'Optimize storage'
            });
        }
        
        const topUsers = this.getTopUsers(3);
        if (topUsers.length > 0 && percentage > 70) {
            recommendations.push({
                title: 'Review top users',
                description: `${topUsers[0].username} is using ${this.formatBytes(topUsers[0].used)}`,
                action: 'Manage users'
            });
        }
        
        return recommendations;
    }
    
    renderStorageStats() {
        const current = this.storageData.current;
        if (!current) return;
        
        const elements = {
            totalStorage: document.getElementById('totalStorage'),
            storagePercentage: document.getElementById('storagePercentage'),
            storageBar: document.getElementById('storageBar'),
            storageUsed: document.getElementById('storageUsed'),
            storageFree: document.getElementById('storageFree'),
            dailyChange: document.getElementById('dailyChange'),
            daysRemaining: document.getElementById('daysRemaining')
        };
        
        if (elements.totalStorage) {
            elements.totalStorage.textContent = this.formatBytes(current.totalUsed);
        }
        
        if (elements.storagePercentage) {
            elements.storagePercentage.textContent = `${current.percentage.toFixed(1)}%`;
        }
        
        if (elements.storageBar) {
            elements.storageBar.style.width = `${Math.min(current.percentage, 100)}%`;
            
            // Change color based on percentage
            if (current.percentage >= 90) {
                elements.storageBar.style.background = '#ef4444';
            } else if (current.percentage >= 75) {
                elements.storageBar.style.background = '#f59e0b';
            } else {
                elements.storageBar.style.background = 'linear-gradient(90deg, #4F46E5, #8B5CF6)';
            }
        }
        
        if (elements.storageUsed) {
            elements.storageUsed.textContent = this.formatBytes(current.totalUsed);
        }
        
        if (elements.storageFree) {
            const free = CONFIG.LIMITS.STORAGE_LIMIT - current.totalUsed;
            elements.storageFree.textContent = this.formatBytes(free);
        }
        
        if (elements.dailyChange) {
            const change = this.calculateDailyChange(current.totalUsed);
            elements.dailyChange.textContent = `${change > 0 ? '+' : ''}${this.formatBytes(Math.abs(change))}/day`;
            elements.dailyChange.style.color = change > 0 ? '#ef4444' : '#10b981';
        }
        
        if (elements.daysRemaining) {
            const days = this.getEstimatedDaysUntilFull();
            if (days !== null && days < 30) {
                elements.daysRemaining.textContent = `~${days} days`;
                elements.daysRemaining.style.color = days < 7 ? '#ef4444' : '#f59e0b';
            } else {
                elements.daysRemaining.textContent = '> 30 days';
            }
        }
        
        // Render top users
        this.renderTopUsers();
        
        // Render recommendations
        this.renderRecommendations();
    }
    
    renderTopUsers() {
        const container = document.getElementById('topUsersList');
        if (!container) return;
        
        const topUsers = this.getTopUsers(5);
        
        if (topUsers.length === 0) {
            container.innerHTML = '<p style="color: #71717a;">No data available</p>';
            return;
        }
        
        container.innerHTML = topUsers.map(user => `
            <div class="top-user-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            ">
                <div>
                    <div style="font-weight: 500;">${this.escapeHtml(user.username)}</div>
                    <div style="font-size: 0.7rem; color: #71717a;">${user.percentage.toFixed(1)}% of limit</div>
                </div>
                <div style="font-weight: 600; color: #8B5CF6;">${this.formatBytes(user.used)}</div>
            </div>
        `).join('');
    }
    
    renderRecommendations() {
        const container = document.getElementById('storageRecommendations');
        if (!container) return;
        
        const recommendations = this.getRecommendations();
        
        if (recommendations.length === 0) {
            container.innerHTML = '<p style="color: #10b981;">✓ Storage usage is healthy</p>';
            return;
        }
        
        container.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item" style="
                padding: 0.75rem;
                background: rgba(245,158,11,0.1);
                border-radius: 12px;
                margin-bottom: 0.5rem;
            ">
                <div style="font-weight: 500;">💡 ${rec.title}</div>
                <div style="font-size: 0.75rem; color: #a1a1aa;">${rec.description}</div>
                <button onclick="window.storageMonitor.handleRecommendation('${rec.action}')" style="
                    margin-top: 0.5rem;
                    padding: 0.25rem 0.75rem;
                    background: rgba(245,158,11,0.2);
                    border: none;
                    border-radius: 6px;
                    color: #f59e0b;
                    cursor: pointer;
                    font-size: 0.7rem;
                ">${rec.action}</button>
            </div>
        `).join('');
    }
    
    renderStorageChart() {
        const canvas = document.getElementById('storageTrendChart');
        if (!canvas) return;
        
        const history = this.storageData.history || [];
        if (history.length === 0) return;
        
        // Get last 30 data points (approximately last 2.5 hours at 5-min intervals)
        const recentData = history.slice(-30);
        
        const labels = recentData.map(d => new Date(d.timestamp).toLocaleTimeString());
        const data = recentData.map(d => (d.totalUsed / CONFIG.LIMITS.STORAGE_LIMIT) * 100);
        
        if (window.storageChart) {
            window.storageChart.destroy();
        }
        
        if (window.Chart) {
            const ctx = canvas.getContext('2d');
            window.storageChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Storage Usage (%)',
                        data: data,
                        borderColor: '#8B5CF6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#a1a1aa' }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.raw.toFixed(1)}%`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#a1a1aa', callback: (v) => `${v}%` }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#a1a1aa', maxRotation: 45, autoSkip: true }
                        }
                    }
                }
            });
        }
    }
    
    renderAlerts() {
        const container = document.getElementById('storageAlerts');
        if (!container) return;
        
        const activeAlerts = this.alerts.filter(a => !a.resolved);
        
        if (activeAlerts.length === 0) {
            container.innerHTML = '<p style="color: #10b981;">✓ No active alerts</p>';
            return;
        }
        
        container.innerHTML = activeAlerts.map(alert => `
            <div class="alert-item" style="
                padding: 0.75rem;
                background: ${alert.level === 'danger' ? 'rgba(239,68,68,0.1)' : alert.level === 'critical' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)'};
                border-left: 3px solid ${alert.level === 'danger' ? '#ef4444' : alert.level === 'critical' ? '#f59e0b' : '#3b82f6'};
                border-radius: 8px;
                margin-bottom: 0.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div>
                    <div style="font-weight: 500;">${this.escapeHtml(alert.message)}</div>
                    <div style="font-size: 0.7rem; color: #71717a;">${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
                <button onclick="window.storageMonitor.resolveAlert('${alert.id}')" style="
                    padding: 0.25rem 0.5rem;
                    background: rgba(16,185,129,0.2);
                    border: none;
                    border-radius: 6px;
                    color: #10b981;
                    cursor: pointer;
                ">Dismiss</button>
            </div>
        `).join('');
    }
    
    handleRecommendation(action) {
        if (action === 'Review old files') {
            window.location.href = 'vault.html?filter=old';
        } else if (action === 'Optimize storage') {
            window.location.href = 'settings.html?tab=storage';
        } else if (action === 'Manage users') {
            window.location.href = 'admin.html?tab=users';
        }
    }
    
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshStorage');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateStorageMetrics();
                if (window.notify) window.notify.success('Storage data refreshed');
            });
        }
    }
    
    addToLog(level, type, action, details) {
        if (window.logManager) {
            window.logManager.addLog(level, type, action, details);
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    generateId() {
        return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize storage monitor
const storageMonitor = new StorageMonitor();
window.storageMonitor = storageMonitor;