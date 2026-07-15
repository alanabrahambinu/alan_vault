/* ========================================
   ALAN VAULT - STORAGE STATISTICS
   Complete Upgrade - Storage Usage Tracking & Visualization
   ======================================== */

class StorageStatsManager {
    constructor() {
        // Default storage limit (5GB)
        this.storageLimit = 5 * 1024 * 1024 * 1024;
        this.updateInterval = null;
        this.vaultData = null;
        this.totalSize = 0;
        this.usedPercent = 0;
        this.formatted = {};
        this.historyChart = null;
        this.typeChart = null;
        this.isInitialized = false;
        this.init();
    }
    
    init() {
        try {
            // Load config if available
            if (typeof CONFIG !== 'undefined' && CONFIG.LIMITS && CONFIG.LIMITS.STORAGE_LIMIT) {
                this.storageLimit = CONFIG.LIMITS.STORAGE_LIMIT;
            }
            
            // Check if user is logged in
            const user = this.getCurrentUser();
            if (!user) {
                console.warn('StorageStats: No user logged in, skipping init');
                return;
            }
            
            this.setupEventListeners();
            this.update();
            this.startAutoUpdate();
            this.isInitialized = true;
            
            console.log('✅ StorageStatsManager initialized');
        } catch (error) {
            console.error('StorageStatsManager init error:', error);
        }
    }
    
    // ========================================
    // USER & DATA HELPERS
    // ========================================
    
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            console.error('Error getting current user:', e);
            return null;
        }
    }
    
    getVaultData() {
        try {
            const user = this.getCurrentUser();
            if (!user || !user.id) {
                return { files: [], notes: [], tasks: [], bookmarks: [] };
            }
            
            const vaultKey = `vault_${user.id}`;
            const data = localStorage.getItem(vaultKey);
            
            if (!data) {
                // Create empty vault if not exists
                const empty = { files: [], notes: [], tasks: [], bookmarks: [] };
                localStorage.setItem(vaultKey, JSON.stringify(empty));
                return empty;
            }
            
            return JSON.parse(data);
        } catch (e) {
            console.error('Error getting vault data:', e);
            return { files: [], notes: [], tasks: [], bookmarks: [] };
        }
    }
    
    saveVaultData(data) {
        try {
            const user = this.getCurrentUser();
            if (!user || !user.id) return false;
            
            const vaultKey = `vault_${user.id}`;
            localStorage.setItem(vaultKey, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving vault data:', e);
            return false;
        }
    }
    
    // ========================================
    // UPDATE & CALCULATE
    // ========================================
    
    update(vaultData) {
        try {
            this.vaultData = vaultData || this.getVaultData();
            this.calculateStats();
            this.renderStats();
            this.updateStorageBar();
            this.checkStorageAlerts();
            
            // Dispatch event
            document.dispatchEvent(new CustomEvent('storage:updated', {
                detail: {
                    totalSize: this.totalSize,
                    usedPercent: this.usedPercent,
                    formatted: this.formatted
                }
            }));
            
            return true;
        } catch (error) {
            console.error('StorageStats update error:', error);
            return false;
        }
    }
    
    calculateStats() {
        try {
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
            
            this.fileCounts = {
                documents: 0,
                images: 0,
                videos: 0,
                audio: 0,
                archives: 0,
                other: 0
            };
            
            this.vaultData.files.forEach(file => {
                const ext = this.getFileExtension(file.name);
                const type = this.categorizeFile(ext);
                
                this.byType[type] += file.size || 0;
                this.fileCounts[type]++;
            });
            
            // Calculate percentages
            this.usedPercent = this.storageLimit > 0 ? (this.totalSize / this.storageLimit) * 100 : 0;
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
                },
                byTypeCount: {
                    documents: this.fileCounts.documents,
                    images: this.fileCounts.images,
                    videos: this.fileCounts.videos,
                    audio: this.fileCounts.audio,
                    archives: this.fileCounts.archives,
                    other: this.fileCounts.other
                }
            };
        } catch (error) {
            console.error('StorageStats calculateStats error:', error);
            // Set default values on error
            this.totalSize = 0;
            this.usedPercent = 0;
            this.formatted = {
                total: '0 Bytes',
                used: '0 Bytes',
                remaining: this.formatBytes(this.storageLimit),
                limit: this.formatBytes(this.storageLimit),
                byType: {
                    documents: '0 Bytes',
                    images: '0 Bytes',
                    videos: '0 Bytes',
                    audio: '0 Bytes',
                    archives: '0 Bytes',
                    other: '0 Bytes'
                },
                byTypeCount: {
                    documents: 0,
                    images: 0,
                    videos: 0,
                    audio: 0,
                    archives: 0,
                    other: 0
                }
            };
        }
    }
    
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }
    
    categorizeFile(extension) {
        const documentExts = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'];
        const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v', 'mpeg', 'mpg'];
        const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'aiff'];
        const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'];
        
        if (documentExts.includes(extension)) return 'documents';
        if (imageExts.includes(extension)) return 'images';
        if (videoExts.includes(extension)) return 'videos';
        if (audioExts.includes(extension)) return 'audio';
        if (archiveExts.includes(extension)) return 'archives';
        return 'other';
    }
    
    // ========================================
    // RENDER FUNCTIONS
    // ========================================
    
    renderStats() {
        try {
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
            
            // Render largest files
            this.renderLargestFiles();
            
            // Render storage trend
            this.renderStorageTrend();
        } catch (error) {
            console.error('StorageStats renderStats error:', error);
        }
    }
    
    renderTypeBreakdown() {
        const container = document.getElementById('storageBreakdown');
        if (!container) return;
        
        const types = [
            { name: 'Documents', size: this.byType.documents, percent: this.totalSize > 0 ? (this.byType.documents / this.totalSize) * 100 : 0, icon: '📄', color: '#4F46E5', count: this.fileCounts.documents },
            { name: 'Images', size: this.byType.images, percent: this.totalSize > 0 ? (this.byType.images / this.totalSize) * 100 : 0, icon: '🖼️', color: '#8B5CF6', count: this.fileCounts.images },
            { name: 'Videos', size: this.byType.videos, percent: this.totalSize > 0 ? (this.byType.videos / this.totalSize) * 100 : 0, icon: '🎬', color: '#10b981', count: this.fileCounts.videos },
            { name: 'Audio', size: this.byType.audio, percent: this.totalSize > 0 ? (this.byType.audio / this.totalSize) * 100 : 0, icon: '🎵', color: '#f59e0b', count: this.fileCounts.audio },
            { name: 'Archives', size: this.byType.archives, percent: this.totalSize > 0 ? (this.byType.archives / this.totalSize) * 100 : 0, icon: '📦', color: '#ef4444', count: this.fileCounts.archives },
            { name: 'Other', size: this.byType.other, percent: this.totalSize > 0 ? (this.byType.other / this.totalSize) * 100 : 0, icon: '📁', color: '#06b6d4', count: this.fileCounts.other }
        ];
        
        const validTypes = types.filter(t => t.size > 0);
        
        if (validTypes.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #71717a;">
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
                        <span style="font-size: 0.7rem; color: #71717a;">(${type.count} files)</span>
                    </span>
                    <span style="color: #a1a1aa; font-size: 0.875rem;">${type.size}</span>
                </div>
                <div class="storage-type-bar" style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                    <div class="storage-type-fill" style="width: ${Math.min(type.percent, 100)}%; height: 100%; background: ${type.color}; transition: width 0.5s;"></div>
                </div>
                <div style="font-size: 0.7rem; color: #71717a; margin-top: 0.25rem;">${type.percent.toFixed(1)}%</div>
            </div>
        `).join('');
    }
    
    renderStorageHistory() {
        const canvas = document.getElementById('storageHistoryChart');
        if (!canvas) return;
        
        // Get storage history from localStorage
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('storage_history') || '[]');
        } catch (e) {
            history = [];
        }
        
        if (history.length === 0) {
            this.generateMockHistory();
            return;
        }
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            // Try to load Chart.js dynamically
            this.loadChartJS(() => this.renderStorageHistory());
            return;
        }
        
        try {
            const ctx = canvas.getContext('2d');
            
            if (this.historyChart) {
                this.historyChart.destroy();
                this.historyChart = null;
            }
            
            const labels = history.map(h => new Date(h.date).toLocaleDateString());
            const data = history.map(h => this.storageLimit > 0 ? (h.used / this.storageLimit) * 100 : 0);
            
            this.historyChart = new Chart(ctx, {
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
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#4F46E5',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { 
                                color: '#a1a1aa',
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(26, 26, 46, 0.9)',
                            titleColor: '#ffffff',
                            bodyColor: '#a1a1aa',
                            borderColor: '#4F46E5',
                            borderWidth: 1,
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
                            ticks: { color: '#a1a1aa', maxRotation: 45, autoSkip: true }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            });
        } catch (error) {
            console.error('StorageStats renderStorageHistory error:', error);
        }
    }
    
    loadChartJS(callback) {
        if (typeof Chart !== 'undefined') {
            if (callback) callback();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => {
            if (callback) callback();
        };
        script.onerror = () => {
            console.warn('Failed to load Chart.js');
        };
        document.head.appendChild(script);
    }
    
    generateMockHistory() {
        const history = [];
        const today = new Date();
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const usage = this.totalSize > 0 ? 
                (this.totalSize / 30) * (30 - i) + (Math.random() * this.totalSize * 0.1) : 
                Math.random() * this.storageLimit * 0.3;
            
            history.push({
                date: date.toISOString(),
                used: Math.min(usage, this.totalSize || this.storageLimit)
            });
        }
        
        localStorage.setItem('storage_history', JSON.stringify(history));
        this.renderStorageHistory();
    }
    
    renderLargestFiles() {
        const container = document.getElementById('largestFiles');
        if (!container) return;
        
        const largestFiles = [...this.vaultData.files]
            .sort((a, b) => (b.size || 0) - (a.size || 0))
            .slice(0, 10);
        
        if (largestFiles.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 1rem; color: #71717a;">No files uploaded</div>';
            return;
        }
        
        container.innerHTML = largestFiles.map((file, index) => `
            <div class="largest-file-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                cursor: pointer;
                transition: background 0.3s;
            " onmouseenter="this.style.background='rgba(139,92,246,0.05)'" onmouseleave="this.style.background='transparent'">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="color: #f59e0b; font-weight: bold;">#${index + 1}</span>
                    <span>📄</span>
                    <span style="font-size: 0.85rem;">${this.escapeHtml(file.name)}</span>
                </div>
                <div>
                    <span style="color: #8B5CF6; font-size: 0.85rem;">${this.formatBytes(file.size)}</span>
                </div>
            </div>
        `).join('');
    }
    
    renderStorageTrend() {
        const trendElement = document.getElementById('storageTrend');
        if (!trendElement) return;
        
        const history = JSON.parse(localStorage.getItem('storage_history') || '[]');
        
        if (history.length < 2) {
            trendElement.innerHTML = '<span style="color: #71717a;">No data available</span>';
            return;
        }
        
        const yesterday = history[history.length - 2];
        const today = history[history.length - 1];
        const change = today.used - yesterday.used;
        const percentChange = yesterday.used > 0 ? (change / yesterday.used) * 100 : 0;
        
        const isIncrease = change > 0;
        const arrow = isIncrease ? '↑' : '↓';
        const color = isIncrease ? '#ef4444' : '#10b981';
        
        trendElement.innerHTML = `
            <span style="color: ${color}; font-weight: 500;">
                ${arrow} ${Math.abs(percentChange).toFixed(1)}% 
                <span style="color: #71717a; font-weight: normal;">
                    (${isIncrease ? '+' : '-'}${this.formatBytes(Math.abs(change))})
                </span>
            </span>
        `;
    }
    
    updateStorageBar() {
        const storageBar = document.getElementById('storageBar');
        if (storageBar) {
            const width = Math.min(this.usedPercent, 100);
            storageBar.style.width = `${width}%`;
            
            // Change color based on usage
            if (this.usedPercent >= 90) {
                storageBar.style.background = '#ef4444';
            } else if (this.usedPercent >= 75) {
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
    
    // ========================================
    // ALERTS & RECOMMENDATIONS
    // ========================================
    
    checkStorageAlerts() {
        const alertKey = 'storage_alert_shown';
        let lastAlert = null;
        try {
            lastAlert = localStorage.getItem(alertKey);
        } catch (e) {}
        
        // Check thresholds
        if (this.usedPercent >= 95 && (!lastAlert || Date.now() - parseInt(lastAlert) > 24 * 60 * 60 * 1000)) {
            this.showAlert('⚠️ Storage is critically full! Please delete files or upgrade your plan.', 'error');
            try {
                localStorage.setItem(alertKey, Date.now().toString());
            } catch (e) {}
        } else if (this.usedPercent >= 90 && (!lastAlert || Date.now() - parseInt(lastAlert) > 12 * 60 * 60 * 1000)) {
            this.showAlert('⚠️ Storage is 90% full. Consider cleaning up old files.', 'warning');
            try {
                localStorage.setItem(alertKey, Date.now().toString());
            } catch (e) {}
        } else if (this.usedPercent >= 75 && (!lastAlert || Date.now() - parseInt(lastAlert) > 7 * 24 * 60 * 60 * 1000)) {
            this.showAlert('ℹ️ Storage is 75% full. You might want to manage your files.', 'info');
            try {
                localStorage.setItem(alertKey, Date.now().toString());
            } catch (e) {}
        }
    }
    
    showAlert(message, type) {
        if (window.notify) {
            const notifyType = type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'info');
            window.notify[notifyType](message, 'Storage Alert');
        } else {
            console.log(`[STORAGE ALERT] ${message}`);
        }
    }
    
    getRecommendations() {
        const recommendations = [];
        
        // Check storage usage
        if (this.usedPercent > 80) {
            recommendations.push({
                title: '🧹 Clean up old files',
                description: 'Files older than 1 year can be archived or deleted',
                action: 'Review old files',
                icon: '🧹',
                priority: 'high'
            });
        }
        
        if (this.usedPercent > 85) {
            recommendations.push({
                title: '🗜️ Compress large files',
                description: 'Some files can be compressed to save space',
                action: 'Optimize storage',
                icon: '🗜️',
                priority: 'medium'
            });
        }
        
        // Find largest files
        const largestFiles = [...this.vaultData.files]
            .sort((a, b) => (b.size || 0) - (a.size || 0))
            .slice(0, 3);
        
        if (largestFiles.length > 0 && this.usedPercent > 70) {
            recommendations.push({
                title: '📊 Large files detected',
                description: `${largestFiles[0].name} is using ${this.formatBytes(largestFiles[0].size)}`,
                action: 'Review large files',
                icon: '📊',
                priority: 'medium',
                files: largestFiles
            });
        }
        
        // Check by file type
        if (this.byType.videos > this.storageLimit * 0.3) {
            recommendations.push({
                title: '🎬 Video storage high',
                description: 'Videos are taking significant space. Consider external storage for old videos.',
                action: 'Review videos',
                icon: '🎬',
                priority: 'low'
            });
        }
        
        return recommendations;
    }
    
    renderRecommendations() {
        const container = document.getElementById('storageRecommendations');
        if (!container) return;
        
        const recommendations = this.getRecommendations();
        
        if (recommendations.length === 0) {
            container.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: #10b981;">
                    ✓ Storage usage is healthy
                </div>
            `;
            return;
        }
        
        container.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item" style="
                padding: 1rem;
                background: ${rec.priority === 'high' ? 'rgba(239,68,68,0.1)' : rec.priority === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)'};
                border-left: 3px solid ${rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#3b82f6'};
                border-radius: 8px;
                margin-bottom: 0.75rem;
            ">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.2rem;">${rec.icon}</span>
                    <span style="font-weight: 600;">${rec.title}</span>
                </div>
                <div style="font-size: 0.875rem; color: #a1a1aa; margin-bottom: 0.75rem;">${rec.description}</div>
                <button onclick="window.storageStats.handleRecommendation('${rec.action}')" style="
                    padding: 0.25rem 0.75rem;
                    background: rgba(139,92,246,0.2);
                    border: none;
                    border-radius: 6px;
                    color: #8B5CF6;
                    cursor: pointer;
                    font-size: 0.75rem;
                ">${rec.action} →</button>
            </div>
        `).join('');
    }
    
    handleRecommendation(action) {
        if (action === 'Review old files') {
            window.location.href = 'vault.html?filter=old';
        } else if (action === 'Optimize storage') {
            window.location.href = 'settings.html?tab=storage';
        } else if (action === 'Review large files' || action === 'Review videos') {
            window.location.href = 'vault.html?sort=size';
        }
    }
    
    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        if (!bytes || isNaN(bytes)) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ========================================
    // EVENT LISTENERS
    // ========================================
    
    setupEventListeners() {
        // Listen for file uploads/deletes
        document.addEventListener('file:uploaded', () => {
            setTimeout(() => this.update(), 100);
        });
        document.addEventListener('file:deleted', () => {
            setTimeout(() => this.update(), 100);
        });
        
        // Listen for vault updates
        document.addEventListener('vault:updated', () => {
            setTimeout(() => this.update(), 100);
        });
        
        // Listen for data updates from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('vault_')) {
                setTimeout(() => this.update(), 100);
            }
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshStorage');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.update();
                this.renderRecommendations();
                if (window.notify) window.notify.success('Storage data refreshed');
            });
        }
    }
    
    // ========================================
    // AUTO UPDATE
    // ========================================
    
    startAutoUpdate() {
        // Update every 5 minutes
        this.updateInterval = setInterval(() => {
            this.update();
            this.saveStorageSnapshot();
        }, 5 * 60 * 1000);
    }
    
    saveStorageSnapshot() {
        try {
            const history = JSON.parse(localStorage.getItem('storage_history') || '[]');
            history.push({
                date: new Date().toISOString(),
                used: this.totalSize,
                formatted: this.formatBytes(this.totalSize)
            });
            
            // Keep only last 90 days
            while (history.length > 90) history.shift();
            
            localStorage.setItem('storage_history', JSON.stringify(history));
        } catch (e) {
            // Silent fail
        }
    }
    
    // ========================================
    // GETTERS
    // ========================================
    
    getStorageSnapshot() {
        return {
            timestamp: new Date().toISOString(),
            used: this.totalSize,
            usedFormatted: this.formatted.used,
            limit: this.storageLimit,
            limitFormatted: this.formatted.limit,
            percentage: this.usedPercent,
            byType: this.byType,
            fileCounts: this.fileCounts,
            fileCount: this.vaultData.files.length
        };
    }
    
    getEstimatedDaysUntilFull() {
        const history = JSON.parse(localStorage.getItem('storage_history') || '[]');
        if (history.length < 7) return null;
        
        // Calculate daily increase over last 7 days
        const lastWeek = history.slice(-7);
        const startSize = lastWeek[0]?.used || 0;
        const endSize = lastWeek[lastWeek.length - 1]?.used || 0;
        const dailyIncrease = (endSize - startSize) / 7;
        
        if (dailyIncrease <= 0) return null;
        
        const remaining = this.storageLimit - this.totalSize;
        return Math.floor(remaining / dailyIncrease);
    }
    
    // ========================================
    // DESTROY
    // ========================================
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.historyChart) {
            try {
                this.historyChart.destroy();
                this.historyChart = null;
            } catch (e) {}
        }
        if (this.typeChart) {
            try {
                this.typeChart.destroy();
                this.typeChart = null;
            } catch (e) {}
        }
        console.log('StorageStatsManager destroyed');
    }
}

// ========================================
// INITIALIZE
// ========================================

let storageStats = null;

function initStorageStats() {
    if (!storageStats) {
        storageStats = new StorageStatsManager();
        window.storageStats = storageStats;
    }
    return storageStats;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStorageStats);
} else {
    initStorageStats();
}

// Also try to initialize after a short delay for dynamic pages
setTimeout(() => {
    if (!storageStats || !storageStats.isInitialized) {
        initStorageStats();
    }
}, 500);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageStatsManager, storageStats };
}