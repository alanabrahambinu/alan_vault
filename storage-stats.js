/* ========================================
   ALAN VAULT - STORAGE STATISTICS
   Storage Usage Tracking & Visualization
   ======================================== */

class StorageStatsManager {
    constructor() {
        this.storageLimit = CONFIG?.LIMITS?.STORAGE_LIMIT || 5 * 1024 * 1024 * 1024; // 5GB default
        this.storageUsed = 0;
        this.updateInterval = null;
        this.historyChart = null;
        this.typeChart = null;
        this.init();
    }
    
    init() {
        this.loadStorageData();
        this.setupEventListeners();
        this.startAutoUpdate();
        this.renderStats();
        this.renderCharts();
        this.checkStorageAlerts();
    }
    
    loadStorageData() {
        const user = JSON.parse(localStorage.getItem(CONFIG?.STORAGE_KEYS?.USER_DATA || 'currentUser') || '{}');
        const vaultKey = `${CONFIG?.STORAGE_KEYS?.VAULT_PREFIX || 'vault_'}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        
        this.vaultData = vault;
        this.calculateStats();
        this.loadStorageHistory();
    }
    
    calculateStats() {
        // Calculate total size
        this.storageUsed = this.vaultData.files.reduce((sum, f) => sum + (f.size || 0), 0);
        
        // Calculate by file type
        this.byType = {
            documents: 0,
            images: 0,
            videos: 0,
            audio: 0,
            archives: 0,
            other: 0
        };
        
        this.fileTypeCount = {
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
            
            this.byType[type] += file.size;
            this.fileTypeCount[type]++;
        });
        
        // Calculate percentages
        this.usedPercent = this.storageLimit > 0 ? (this.storageUsed / this.storageLimit) * 100 : 0;
        this.remainingPercent = 100 - this.usedPercent;
        this.remainingSpace = this.storageLimit - this.storageUsed;
        
        // Format sizes
        this.formatted = {
            used: this.formatBytes(this.storageUsed),
            limit: this.formatBytes(this.storageLimit),
            remaining: this.formatBytes(this.remainingSpace),
            byType: {
                documents: this.formatBytes(this.byType.documents),
                images: this.formatBytes(this.byType.images),
                videos: this.formatBytes(this.byType.videos),
                audio: this.formatBytes(this.byType.audio),
                archives: this.formatBytes(this.byType.archives),
                other: this.formatBytes(this.byType.other)
            },
            byTypeCount: {
                documents: this.fileTypeCount.documents,
                images: this.fileTypeCount.images,
                videos: this.fileTypeCount.videos,
                audio: this.fileTypeCount.audio,
                archives: this.fileTypeCount.archives,
                other: this.fileTypeCount.other
            }
        };
    }
    
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }
    
    categorizeFile(extension) {
        const documentExts = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
        const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v'];
        const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
        const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
        
        if (documentExts.includes(extension)) return 'documents';
        if (imageExts.includes(extension)) return 'images';
        if (videoExts.includes(extension)) return 'videos';
        if (audioExts.includes(extension)) return 'audio';
        if (archiveExts.includes(extension)) return 'archives';
        return 'other';
    }
    
    loadStorageHistory() {
        const history = localStorage.getItem('storage_history');
        if (history) {
            this.history = JSON.parse(history);
        } else {
            this.generateMockHistory();
        }
    }
    
    generateMockHistory() {
        this.history = [];
        const today = new Date();
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            // Generate random but increasing usage
            const usage = (this.storageUsed / 30) * (30 - i) + (Math.random() * this.storageUsed * 0.1);
            
            this.history.push({
                date: date.toISOString(),
                used: Math.min(usage, this.storageUsed),
                formatted: this.formatBytes(Math.min(usage, this.storageUsed))
            });
        }
        
        this.saveStorageHistory();
    }
    
    saveStorageHistory() {
        localStorage.setItem('storage_history', JSON.stringify(this.history));
    }
    
    updateStorageHistory() {
        const today = new Date().toISOString().split('T')[0];
        const lastEntry = this.history[this.history.length - 1];
        
        if (!lastEntry || lastEntry.date.split('T')[0] !== today) {
            this.history.push({
                date: new Date().toISOString(),
                used: this.storageUsed,
                formatted: this.formatBytes(this.storageUsed)
            });
            
            // Keep only last 90 days
            while (this.history.length > 90) {
                this.history.shift();
            }
            
            this.saveStorageHistory();
        } else {
            // Update today's entry
            lastEntry.used = this.storageUsed;
            lastEntry.formatted = this.formatBytes(this.storageUsed);
            this.saveStorageHistory();
        }
    }
    
    renderStats() {
        // Update DOM elements
        const elements = {
            storageUsed: document.getElementById('storageUsed'),
            storageTotal: document.getElementById('storageTotal'),
            storageRemaining: document.getElementById('storageRemaining'),
            storagePercent: document.getElementById('storagePercent'),
            storageBar: document.getElementById('storageBar'),
            storageText: document.getElementById('storageText')
        };
        
        if (elements.storageUsed) elements.storageUsed.textContent = this.formatted.used;
        if (elements.storageTotal) elements.storageTotal.textContent = this.formatted.limit;
        if (elements.storageRemaining) elements.storageRemaining.textContent = this.formatted.remaining;
        if (elements.storagePercent) elements.storagePercent.textContent = `${this.usedPercent.toFixed(1)}%`;
        
        if (elements.storageBar) {
            elements.storageBar.style.width = `${Math.min(this.usedPercent, 100)}%`;
            
            // Change color based on usage
            if (this.usedPercent >= 90) {
                elements.storageBar.style.background = '#ef4444';
            } else if (this.usedPercent >= 75) {
                elements.storageBar.style.background = '#f59e0b';
            } else {
                elements.storageBar.style.background = 'linear-gradient(90deg, #4F46E5, #8B5CF6)';
            }
        }
        
        if (elements.storageText) {
            elements.storageText.textContent = `${this.formatted.used} / ${this.formatted.limit}`;
        }
        
        // Render file type breakdown
        this.renderTypeBreakdown();
        
        // Render largest files
        this.renderLargestFiles();
        
        // Render storage trend
        this.renderStorageTrend();
    }
    
    renderTypeBreakdown() {
        const container = document.getElementById('storageBreakdown');
        if (!container) return;
        
        const types = [
            { name: 'Documents', size: this.byType.documents, percent: (this.byType.documents / this.storageUsed) * 100, icon: '📄', color: '#4F46E5', count: this.fileTypeCount.documents },
            { name: 'Images', size: this.byType.images, percent: (this.byType.images / this.storageUsed) * 100, icon: '🖼️', color: '#8B5CF6', count: this.fileTypeCount.images },
            { name: 'Videos', size: this.byType.videos, percent: (this.byType.videos / this.storageUsed) * 100, icon: '🎬', color: '#10b981', count: this.fileTypeCount.videos },
            { name: 'Audio', size: this.byType.audio, percent: (this.byType.audio / this.storageUsed) * 100, icon: '🎵', color: '#f59e0b', count: this.fileTypeCount.audio },
            { name: 'Archives', size: this.byType.archives, percent: (this.byType.archives / this.storageUsed) * 100, icon: '📦', color: '#ef4444', count: this.fileTypeCount.archives },
            { name: 'Other', size: this.byType.other, percent: (this.byType.other / this.storageUsed) * 100, icon: '📁', color: '#06b6d4', count: this.fileTypeCount.other }
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
                        <span style="font-size: 0.7rem; color: #71717a;">(${type.count} files)</span>
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
                    <span>${this.escapeHtml(file.name)}</span>
                </div>
                <div>
                    <span style="color: #8B5CF6;">${this.formatBytes(file.size)}</span>
                </div>
            </div>
        `).join('');
    }
    
    renderStorageTrend() {
        const trendElement = document.getElementById('storageTrend');
        if (!trendElement) return;
        
        if (this.history.length < 2) {
            trendElement.innerHTML = '<span>No data available</span>';
            return;
        }
        
        const yesterday = this.history[this.history.length - 2];
        const today = this.history[this.history.length - 1];
        const change = today.used - yesterday.used;
        const percentChange = yesterday.used > 0 ? (change / yesterday.used) * 100 : 0;
        
        const isIncrease = change > 0;
        const arrow = isIncrease ? '↑' : '↓';
        const color = isIncrease ? '#ef4444' : '#10b981';
        
        trendElement.innerHTML = `
            <span style="color: ${color};">
                ${arrow} ${Math.abs(percentChange).toFixed(1)}% 
                <span style="color: #71717a;">(${isIncrease ? '+' : '-'}${this.formatBytes(Math.abs(change))})</span>
            </span>
        `;
    }
    
    renderCharts() {
        this.renderStorageChart();
        this.renderTypeChart();
    }
    
    renderStorageChart() {
        const canvas = document.getElementById('storageHistoryChart');
        if (!canvas) return;
        
        if (this.historyChart) {
            this.historyChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const labels = this.history.map(h => new Date(h.date).toLocaleDateString());
        const data = this.history.map(h => (h.used / this.storageLimit) * 100);
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }
        
        this.historyChart = new Chart(ctx, {
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
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#8B5CF6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#a1a1aa',
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#ffffff',
                        bodyColor: '#a1a1aa',
                        borderColor: '#4F46E5',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                return `Usage: ${value.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#a1a1aa',
                            callback: (value) => `${value}%`
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#a1a1aa',
                            maxRotation: 45,
                            autoSkip: true
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }
    
    renderTypeChart() {
        const canvas = document.getElementById('storageTypeChart');
        if (!canvas) return;
        
        if (this.typeChart) {
            this.typeChart.destroy();
        }
        
        const types = [
            { label: 'Documents', value: this.byType.documents, color: '#4F46E5' },
            { label: 'Images', value: this.byType.images, color: '#8B5CF6' },
            { label: 'Videos', value: this.byType.videos, color: '#10b981' },
            { label: 'Audio', value: this.byType.audio, color: '#f59e0b' },
            { label: 'Archives', value: this.byType.archives, color: '#ef4444' },
            { label: 'Other', value: this.byType.other, color: '#06b6d4' }
        ].filter(t => t.value > 0);
        
        const ctx = canvas.getContext('2d');
        
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }
        
        this.typeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: types.map(t => t.label),
                datasets: [{
                    data: types.map(t => t.value),
                    backgroundColor: types.map(t => t.color),
                    borderWidth: 0,
                    hoverOffset: 4
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
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#ffffff',
                        bodyColor: '#a1a1aa',
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = types.reduce((sum, t) => sum + t.value, 0);
                                const percent = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatBytes(value)} (${percent}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
        
        // Add center text
        this.addCenterText(canvas, this.formatted.used);
    }
    
    addCenterText(canvas, text) {
        if (!this.typeChart) return;
        
        const originalDraw = this.typeChart.draw;
        const that = this;
        
        this.typeChart.draw = function() {
            originalDraw.apply(this, arguments);
            const ctx = this.ctx;
            const width = this.width;
            const height = this.height;
            
            ctx.save();
            ctx.font = 'bold 16px "Inter"';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, width / 2, height / 2);
            
            ctx.font = '10px "Inter"';
            ctx.fillStyle = '#71717a';
            ctx.fillText('Total Storage', width / 2, height / 2 + 20);
            ctx.restore();
        };
        
        this.typeChart.update();
    }
    
    checkStorageAlerts() {
        const alertKey = 'storage_alert_shown';
        const lastAlert = localStorage.getItem(alertKey);
        
        // Check thresholds
        if (this.usedPercent >= 95 && (!lastAlert || Date.now() - parseInt(lastAlert) > 24 * 60 * 60 * 1000)) {
            this.showAlert('Storage is critically full! Please delete files or upgrade your plan.', 'danger');
            localStorage.setItem(alertKey, Date.now().toString());
        } else if (this.usedPercent >= 90 && (!lastAlert || Date.now() - parseInt(lastAlert) > 12 * 60 * 60 * 1000)) {
            this.showAlert('Storage is 90% full. Consider cleaning up old files.', 'warning');
            localStorage.setItem(alertKey, Date.now().toString());
        } else if (this.usedPercent >= 75 && (!lastAlert || Date.now() - parseInt(lastAlert) > 7 * 24 * 60 * 60 * 1000)) {
            this.showAlert('Storage is 75% full. You might want to manage your files.', 'info');
            localStorage.setItem(alertKey, Date.now().toString());
        }
    }
    
    showAlert(message, type) {
        if (window.notify) {
            const notifyType = type === 'danger' ? 'error' : (type === 'warning' ? 'warning' : 'info');
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
                title: 'Clean up old files',
                description: 'Files older than 1 year can be archived or deleted',
                action: 'Review old files',
                icon: '🧹',
                priority: 'high'
            });
        }
        
        if (this.usedPercent > 85) {
            recommendations.push({
                title: 'Compress large files',
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
                title: 'Large files detected',
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
                title: 'Video storage high',
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
            container.innerHTML = '<div style="padding: 1rem; text-align: center; color: #10b981;">✓ Storage usage is healthy</div>';
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
    
    getEstimatedDaysUntilFull() {
        if (this.history.length < 7) return null;
        
        // Calculate daily increase over last 7 days
        const lastWeek = this.history.slice(-7);
        const startSize = lastWeek[0]?.used || 0;
        const endSize = lastWeek[lastWeek.length - 1]?.used || 0;
        const dailyIncrease = (endSize - startSize) / 7;
        
        if (dailyIncrease <= 0) return null;
        
        const remaining = this.storageLimit - this.storageUsed;
        const days = remaining / dailyIncrease;
        
        return Math.floor(days);
    }
    
    getStorageSnapshot() {
        return {
            timestamp: new Date().toISOString(),
            used: this.storageUsed,
            usedFormatted: this.formatted.used,
            limit: this.storageLimit,
            limitFormatted: this.formatted.limit,
            percentage: this.usedPercent,
            byType: {
                documents: this.byType.documents,
                images: this.byType.images,
                videos: this.byType.videos,
                audio: this.byType.audio,
                archives: this.byType.archives,
                other: this.byType.other
            },
            fileCount: this.vaultData.files.length
        };
    }
    
    setupEventListeners() {
        // Listen for file uploads/deletes
        document.addEventListener('file:uploaded', () => this.refresh());
        document.addEventListener('file:deleted', () => this.refresh());
        
        // Listen for vault updates
        document.addEventListener('vault:updated', () => this.refresh());
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshStorage');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }
    
    startAutoUpdate() {
        // Update every 5 minutes
        this.updateInterval = setInterval(() => {
            this.refresh();
            this.saveStorageSnapshot();
        }, 5 * 60 * 1000);
    }
    
    saveStorageSnapshot() {
        this.updateStorageHistory();
        
        // Save snapshot for analytics
        const snapshot = this.getStorageSnapshot();
        const snapshots = JSON.parse(localStorage.getItem('storage_snapshots') || '[]');
        snapshots.push(snapshot);
        
        // Keep only last 100 snapshots
        while (snapshots.length > 100) snapshots.shift();
        
        localStorage.setItem('storage_snapshots', JSON.stringify(snapshots));
    }
    
    async refresh() {
        await this.loadStorageData();
        this.renderStats();
        this.renderCharts();
        this.renderRecommendations();
        this.checkStorageAlerts();
        
        this.dispatchEvent('storage:updated', this.getStorageSnapshot());
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
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
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.historyChart) {
            this.historyChart.destroy();
        }
        if (this.typeChart) {
            this.typeChart.destroy();
        }
    }
}

// Initialize storage stats manager
const storageStats = new StorageStatsManager();
window.storageStats = storageStats;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageStatsManager };
}