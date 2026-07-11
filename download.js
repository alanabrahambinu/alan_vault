/* ========================================
   ALAN VAULT - FILE DOWNLOAD HANDLER
   Download Files with Progress
   ======================================== */

class FileDownloadHandler {
    constructor() {
        this.activeDownloads = [];
        this.downloadHistory = [];
        this.init();
    }
    
    init() {
        this.loadDownloadHistory();
        this.setupEventListeners();
    }
    
    loadDownloadHistory() {
        const saved = localStorage.getItem('download_history');
        if (saved) {
            this.downloadHistory = JSON.parse(saved);
        }
    }
    
    saveDownloadHistory() {
        localStorage.setItem('download_history', JSON.stringify(this.downloadHistory));
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const downloadBtn = e.target.closest('[data-download]');
            if (downloadBtn) {
                const fileId = downloadBtn.dataset.fileId || downloadBtn.closest('[data-file-id]')?.dataset.fileId;
                if (fileId) {
                    this.downloadFile(fileId);
                }
            }
        });
    }
    
    async downloadFile(fileId, options = {}) {
        const file = await this.getFileData(fileId);
        if (!file) {
            this.showError('File not found');
            return;
        }
        
        const { batch = false, zipName = null } = options;
        
        if (batch) {
            await this.downloadBatch(fileId);
        } else {
            await this.downloadSingle(file);
        }
    }
    
    async downloadSingle(file) {
        const downloadId = this.generateId();
        const downloadItem = {
            id: downloadId,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'starting',
            startTime: Date.now()
        };
        
        this.activeDownloads.push(downloadItem);
        this.showDownloadProgress(downloadItem);
        
        try {
            // Simulate download progress
            const interval = setInterval(() => {
                downloadItem.progress = Math.min(downloadItem.progress + 10, 90);
                this.updateDownloadProgress(downloadItem);
            }, 100);
            
            // Create download link
            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            link.click();
            
            clearInterval(interval);
            downloadItem.progress = 100;
            downloadItem.status = 'completed';
            this.updateDownloadProgress(downloadItem);
            
            // Add to history
            this.addToHistory(file);
            
            // Remove from active downloads after delay
            setTimeout(() => {
                this.activeDownloads = this.activeDownloads.filter(d => d.id !== downloadId);
                this.removeDownloadProgress(downloadId);
            }, 3000);
            
            this.showNotification(`Downloaded ${file.name}`, 'success');
            
        } catch (error) {
            downloadItem.status = 'error';
            this.updateDownloadProgress(downloadItem);
            this.showError(`Failed to download ${file.name}`);
        }
    }
    
    async downloadBatch(fileIds) {
        const files = [];
        for (const id of fileIds) {
            const file = await this.getFileData(id);
            if (file) files.push(file);
        }
        
        if (files.length === 0) {
            this.showError('No files to download');
            return;
        }
        
        if (files.length === 1) {
            this.downloadSingle(files[0]);
            return;
        }
        
        this.showNotification(`Preparing ${files.length} files for download...`, 'info');
        
        // For multiple files, create a zip (simulated)
        // In production, use JSZip library
        setTimeout(() => {
            this.showNotification(`Downloaded ${files.length} files`, 'success');
        }, 2000);
    }
    
    async getFileData(fileId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        return vault.files.find(f => f.id === fileId);
    }
    
    showDownloadProgress(downloadItem) {
        let container = document.getElementById('downloadsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'downloadsContainer';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                width: 320px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            `;
            document.body.appendChild(container);
        }
        
        const itemEl = document.createElement('div');
        itemEl.id = `download_${downloadItem.id}`;
        itemEl.className = 'download-item';
        itemEl.style.cssText = `
            background: #1a1a2e;
            border: 1px solid rgba(139,92,246,0.3);
            border-radius: 12px;
            padding: 12px;
            animation: slideInRight 0.3s ease;
        `;
        
        itemEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 0.875rem; font-weight: 500;">${this.escapeHtml(downloadItem.name)}</span>
                <span id="download_status_${downloadItem.id}" style="font-size: 0.75rem; color: #8B5CF6;">${downloadItem.status}</span>
            </div>
            <div class="download-progress-bar" style="
                height: 4px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                overflow: hidden;
            ">
                <div id="download_progress_${downloadItem.id}" style="
                    width: ${downloadItem.progress}%;
                    height: 100%;
                    background: linear-gradient(90deg, #4F46E5, #8B5CF6);
                    transition: width 0.3s;
                "></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                <span style="font-size: 0.7rem; color: #71717a;">${this.formatBytes(downloadItem.size)}</span>
                <span id="download_speed_${downloadItem.id}" style="font-size: 0.7rem; color: #71717a;">calculating...</span>
            </div>
        `;
        
        container.appendChild(itemEl);
    }
    
    updateDownloadProgress(downloadItem) {
        const progressBar = document.getElementById(`download_progress_${downloadItem.id}`);
        const statusSpan = document.getElementById(`download_status_${downloadItem.id}`);
        const speedSpan = document.getElementById(`download_speed_${downloadItem.id}`);
        
        if (progressBar) progressBar.style.width = `${downloadItem.progress}%`;
        if (statusSpan) statusSpan.textContent = downloadItem.status;
        
        if (speedSpan && downloadItem.progress > 0 && downloadItem.progress < 100) {
            const elapsed = (Date.now() - downloadItem.startTime) / 1000;
            const downloaded = (downloadItem.size * downloadItem.progress) / 100;
            const speed = downloaded / elapsed;
            speedSpan.textContent = `${this.formatBytes(speed)}/s`;
        }
    }
    
    removeDownloadProgress(downloadId) {
        const itemEl = document.getElementById(`download_${downloadId}`);
        if (itemEl) {
            itemEl.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => itemEl.remove(), 300);
        }
    }
    
    addToHistory(file) {
        this.downloadHistory.unshift({
            id: file.id,
            name: file.name,
            size: file.size,
            date: new Date().toISOString()
        });
        
        if (this.downloadHistory.length > 50) {
            this.downloadHistory.pop();
        }
        
        this.saveDownloadHistory();
    }
    
    getDownloadHistory() {
        return this.downloadHistory;
    }
    
    clearDownloadHistory() {
        this.downloadHistory = [];
        this.saveDownloadHistory();
        this.showNotification('Download history cleared', 'success');
    }
    
    generateId() {
        return 'download_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showNotification(message, type) {
        if (window.notify) {
            window.notify[type](message);
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize download handler
const fileDownloadHandler = new FileDownloadHandler();
window.fileDownloadHandler = fileDownloadHandler;