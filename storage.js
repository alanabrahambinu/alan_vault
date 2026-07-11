/* ========================================
   ALAN VAULT - STORAGE STATISTICS
   Storage Usage Tracking & Visualization
   ======================================== */

class StorageStatsManager {
    constructor() {
        this.storageLimit = CONFIG.LIMITS.STORAGE_LIMIT;
        this.updateInterval = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startAutoUpdate();
    }
    
    update(vaultData) {
        this.vaultData = vaultData || this.getVaultData();
        this.calculateStats();
        this.renderStats();
        this.updateStorageBar();
        this.checkStorageAlerts();
    }
    
    getVaultData() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        return JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
    }
    
    calculateStats() {
        // Calculate total size
        this.totalSize = this.vaultData.files.reduce((sum, f) => sum + (f.size || 0), 0);
        
        // Calculate by file type
        this.byType = {
            documents: 0,
            images: 0,
            videos: 0,
            audio: 0,
            archives: 0,
            other: 0
        };
        
        this.vaultData.files.forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                this.byType.documents += file.size;
            } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                this.byType.images += file.size;
            } else if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) {
                this.byType.videos += file.size;
            } else if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
                this.byType.audio += file.size;
            } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                this.byType.archives += file.size;
            } else {
                this.byType.other += file.size;
            }
        });
        
        // Calculate percentages
        this.usedPercent = (this.totalSize / this.storageLimit) * 100;
        this.remainingPercent = 100 - this.usedPercent;
        this.remainingSpace = this.storageLimit - this.totalSize;
        
        // Format sizes
        this.formatted = {
            total: this.formatBytes(this.totalSize),
            used: this.formatBytes(this.totalSize),
            remaining: this.formatBytes(this.remainingSpace),
            limit: this.formatBytes(this.storageLimit),
            byType: {
                documents: this.formatBytes(this.byType.documents),
                images: this.formatBytes(this.byType.images),
                videos: this.formatBytes(this.byType.videos),
                audio: this.formatBytes(this.byType.audio),
                archives: this.formatBytes(this.byType.archives),
                other: this.formatBytes(this.byType.other)
            }
        };
    }
    
    renderStats() {
        // Update storage display elements
        const elements = {
            storageUsed: document.getElementById('storageUsed'),
            storageTotal: document.getElementById('storageTotal'),
            storageRemaining: document.getElementById('storageRemaining'),
            storagePercent: document.getElementById('storagePercent')
        };
        
        if (elements.storageUsed) elements.storageUsed.textContent = this.formatted.used;
        if (elements.storageTotal) elements.storageTotal.textContent = this.formatted.limit;
        if (elements.storageRemaining) elements.storageRemaining.textContent = this.formatted.remaining;
        if (elements.storagePercent) elements.storagePercent.textContent = `${this.usedPercent.toFixed(1)}%`;
        
        // Render file type breakdown
        this.renderTypeBreakdown();
        
        // Render storage history chart
        this.renderStorageHistory();
    }
    
    renderTypeBreakdown() {
        const container = document.getElementById('storageBreakdown');
        if (!container) return;
        
        const types = [
            { name: 'Documents', size: this.byType.documents, percent: (this.byType.documents / this.totalSize) * 100, icon: '📄', color: '#4F46E5' },
            { name: 'Images', size: this.byType.images, percent: (this.byType.images / this.totalSize) * 100, icon: '🖼️', color: '#8B5CF6' },
            { name: 'Videos', size: this.byType.videos, percent: (this.byType.videos / this.totalSize) * 100, icon: '🎬', color: '#10b981' },
            { name: 'Audio', size: this.byType.audio, percent: (this.byType.audio / this.totalSize) * 100, icon: '🎵', color: '#f59e0b' },
            { name: 'Archives', size: this.byType.archives, percent: (this.byType.archives / this.totalSize) * 100, icon: '📦', color: '#ef4444' },
            { name: 'Other', size: this.byType.other, percent: (this.byType.other / this.totalSize) * 100, icon: '📁', color: '#06b6d4' }
        ];
        
        const validTypes = types.filter(t => t.size > 0);
        
        if (validTypes.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📭</div>
                    <p>No files uploaded yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = validTypes.map(type => `
            <div class="storage-type-item" style="margin-bottom: 1rem;">
                <div class="storage-type-header" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>${type.icon}</span>
                        <span>${type.name}</span>
                    </span>
                    <span style="color: var(--text-tertiary); font-size: 0.875rem;">${type.size}</span>
                </div>
                <div class="storage-type-bar" style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                    <div class="storage-type-fill" style="width: ${type.percent}%; height: 100%; background: ${type.color}; transition: width 0.5s;"></div>
                </div>
                <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.25rem;">${type.percent.toFixed(1)}%</div>
            </div>
        `).join('');
    }
    
    renderStorageHistory() {
        const canvas = document.getElementById('storageHistoryChart');
        if (!canvas) return;
        
        // Get storage history from localStorage
        const history = JSON.parse(localStorage.getItem('storage_history') || '[]');
        
        if (history.length === 0) {
            // Generate mock history data
            this.generateMockHistory();
            return;
        }
        
        if (window.chartManager && window.chartManager.Chart) {
            const ctx = canvas.getContext('2d');
            
            if (this.historyChart) {
                this.historyChart.destroy();
            }
            
            const labels = history.map(h => new Date(h.date).toLocaleDateString());
            const data = history.map(h => (h.used / this.storageLimit) * 100);
            
            this.historyChart = new window.chartManager.Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Storage Usage (%)',
                        data: data,
                        borderColor: '#4F46E5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
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
                            position: 'bottom',
                            labels: { color: '#a1a1aa' }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw;
                                    return `Storage: ${value.toFixed(1)}%`;
                                }
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
                            ticks: { color: '#a1a1aa' }
                        }
                    }
                }
            });
        }
    }
    
    generateMockHistory() {
        const history = [];
        const today = new Date();
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            // Generate random but increasing usage
            const usage = (this.totalSize / 30) * (30 - i) + (Math.random() * this.totalSize * 0.1);
            
            history.push({
                date: date.toISOString(),
                used: Math.min(usage, this.totalSize)
            });
        }
        
        localStorage.setItem('storage_history', JSON.stringify(history));
        this.renderStorageHistory();
    }
    
    updateStorageBar() {
        const storageBar = document.getElementById('storageBar');
        if (storageBar) {
            storageBar.style.width = `${Math.min(this.usedPercent, 100)}%`;
            
            // Change color based on usage
            if (this.usedPercent > 90) {
                storageBar.style.background = '#ef4444';
            } else if (this.usedPercent > 75) {
                storageBar.style.background = '#f59e0b';
            } else {
                storageBar.style.background = 'linear-gradient(90deg, #4F46E5, #8B5CF6)';
            }
        }
        
        // Update storage text
        const storageText = document.getElementById('storageText');
        if (storageText) {
            storageText.textContent = `${this.formatted.used} / ${this.formatted.limit}`;
        }
    }
    
    checkStorageAlerts() {
        if (this.usedPercent > 95) {
            this.showAlert('Storage is almost full! Please delete some files or upgrade your plan.', 'danger');
        } else if (this.usedPercent > 90) {
            this.showAlert('Storage is 90% full. Consider cleaning up old files.', 'warning');
        } else if (this.usedPercent > 75) {
            this.showAlert('Storage is 75% full. You might want to manage your files.', 'info');
        }
    }
    
    showAlert(message, type) {
        const alertKey = 'storage_alert_shown';
        const lastAlert = localStorage.getItem(alertKey);
        
        // Show alert only once per session
        if (!lastAlert || Date.now() - parseInt(lastAlert) > 24 * 60 * 60 * 1000) {
            if (window.notify) {
                window.notify[type](message);
            }
            localStorage.setItem(alertKey, Date.now().toString());
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    setupEventListeners() {
        // Listen for file uploads/deletes
        document.addEventListener('file:uploaded', () => this.update());
        document.addEventListener('file:deleted', () => this.update());
        
        // Listen for vault updates
        document.addEventListener('vault:updated', () => this.update());
    }
    
    startAutoUpdate() {
        // Update storage history every hour
        this.updateInterval = setInterval(() => {
            this.saveStorageSnapshot();
        }, 60 * 60 * 1000);
    }
    
    saveStorageSnapshot() {
        const history = JSON.parse(localStorage.getItem('storage_history') || '[]');
        history.push({
            date: new Date().toISOString(),
            used: this.totalSize
        });
        
        // Keep only last 90 days
        while (history.length > 90) history.shift();
        
        localStorage.setItem('storage_history', JSON.stringify(history));
    }
    
    getRecommendations() {
        const recommendations = [];
        
        // Find largest files
        const largestFiles = [...this.vaultData.files]
            .sort((a, b) => (b.size || 0) - (a.size || 0))
            .slice(0, 5);
        
        if (largestFiles.length > 0) {
            recommendations.push({
                title: 'Large Files',
                message: `Your largest file is ${largestFiles[0].name} (${this.formatBytes(largestFiles[0].size)}). Consider archiving it.`,
                files: largestFiles
            });
        }
        
        // Check for old files
        const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
        const oldFiles = this.vaultData.files.filter(f => new Date(f.date) < sixMonthsAgo);
        
        if (oldFiles.length > 0) {
            recommendations.push({
                title: 'Old Files',
                message: `You have ${oldFiles.length} files older than 6 months. Review and clean up if needed.`,
                count: oldFiles.length
            });
        }
        
        return recommendations;
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.historyChart) {
            this.historyChart.destroy();
        }
    }
}

// Initialize storage stats manager
const storageStats = new StorageStatsManager();
window.storageStats = storageStats;