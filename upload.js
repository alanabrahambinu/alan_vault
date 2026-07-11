/* ========================================
   ALAN VAULT - FILE UPLOAD HANDLER
   File Upload Management & Processing
   ======================================== */

class FileUploadHandler {
    constructor() {
        this.uploadQueue = [];
        this.activeUploads = 0;
        this.maxConcurrent = CONFIG.FILES.MAX_CONCURRENT_UPLOADS || 3;
        this.uploadHistory = [];
        this.init();
    }
    
    init() {
        this.loadUploadHistory();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }
    
    setupEventListeners() {
        // File input change
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));
        }
        
        // Upload button
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => document.getElementById('fileInput')?.click());
        }
    }
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        if (!dropZone) return;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            this.handleFileSelect(files);
        });
    }
    
    handleFileSelect(files) {
        const validFiles = this.validateFiles(files);
        
        if (validFiles.length === 0) {
            this.showError('No valid files selected');
            return;
        }
        
        // Check storage quota
        if (!this.checkStorageQuota(validFiles)) {
            this.showError('Storage quota exceeded. Please free up space.');
            return;
        }
        
        // Add to queue
        validFiles.forEach(file => {
            this.addToQueue(file);
        });
        
        // Start processing queue
        this.processQueue();
        
        // Show upload queue UI
        this.showUploadQueue();
    }
    
    validateFiles(files) {
        const validFiles = [];
        
        for (const file of files) {
            // Check file size
            if (file.size > CONFIG.FILES.MAX_SIZE) {
                this.showError(`${file.name} exceeds ${this.formatBytes(CONFIG.FILES.MAX_SIZE)} limit`);
                continue;
            }
            
            // Check file type
            if (!this.isAllowedFileType(file)) {
                this.showError(`${file.name} type is not allowed`);
                continue;
            }
            
            validFiles.push(file);
        }
        
        return validFiles;
    }
    
    isAllowedFileType(file) {
        const allowedTypes = CONFIG.FILES.ALLOWED_TYPES;
        if (allowedTypes.length === 0) return true;
        
        // Check by extension as well
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.md', '.zip', '.rar'];
        
        return allowedTypes.includes(file.type) || allowedExts.includes(ext);
    }
    
    checkStorageQuota(files) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        
        const currentSize = vault.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const newSize = files.reduce((sum, f) => sum + f.size, 0);
        const totalSize = currentSize + newSize;
        
        return totalSize <= CONFIG.LIMITS.STORAGE_LIMIT;
    }
    
    addToQueue(file) {
        const uploadItem = {
            id: this.generateId(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            progress: 0,
            status: 'pending',
            speed: 0,
            timeRemaining: 0,
            startTime: null,
            xhr: null,
            retryCount: 0
        };
        
        this.uploadQueue.push(uploadItem);
        this.renderQueueItem(uploadItem);
        
        return uploadItem;
    }
    
    async processQueue() {
        while (this.activeUploads < this.maxConcurrent && this.uploadQueue.length > 0) {
            const nextUpload = this.uploadQueue.find(u => u.status === 'pending');
            if (nextUpload) {
                this.activeUploads++;
                await this.uploadFile(nextUpload);
                this.activeUploads--;
            } else {
                break;
            }
        }
    }
    
    async uploadFile(uploadItem) {
        uploadItem.status = 'uploading';
        uploadItem.startTime = Date.now();
        this.updateQueueItem(uploadItem);
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', uploadItem.file);
        
        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        uploadItem.xhr = xhr;
        
        // Track progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                uploadItem.progress = (e.loaded / e.total) * 100;
                
                // Calculate speed and time remaining
                const elapsed = (Date.now() - uploadItem.startTime) / 1000;
                const speed = e.loaded / elapsed;
                uploadItem.speed = speed;
                uploadItem.timeRemaining = (e.total - e.loaded) / speed;
                
                this.updateQueueItem(uploadItem);
            }
        });
        
        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                this.onUploadSuccess(uploadItem, xhr.response);
            } else {
                this.onUploadError(uploadItem, xhr.statusText);
            }
        });
        
        // Handle error
        xhr.addEventListener('error', () => {
            this.onUploadError(uploadItem, 'Network error');
        });
        
        // Handle abort
        xhr.addEventListener('abort', () => {
            uploadItem.status = 'aborted';
            this.updateQueueItem(uploadItem);
        });
        
        // Send request
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        
        xhr.open('POST', `${CONFIG.API.BASE_URL}/files/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
    }
    
    onUploadSuccess(uploadItem, response) {
        uploadItem.status = 'success';
        uploadItem.progress = 100;
        this.updateQueueItem(uploadItem);
        
        // Save file to vault
        this.saveToVault(uploadItem);
        
        // Add to history
        this.addToHistory(uploadItem);
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('file:uploaded', {
            detail: {
                fileName: uploadItem.name,
                fileSize: uploadItem.size,
                fileType: uploadItem.type
            }
        }));
        
        // Show success notification
        this.showNotification(`${uploadItem.name} uploaded successfully!`, 'success');
        
        // Remove from queue after delay
        setTimeout(() => {
            this.removeFromQueue(uploadItem.id);
        }, 3000);
        
        // Process next in queue
        this.processQueue();
    }
    
    onUploadError(uploadItem, error) {
        uploadItem.retryCount++;
        
        if (uploadItem.retryCount < CONFIG.API.RETRY_ATTEMPTS) {
            uploadItem.status = 'pending';
            uploadItem.progress = 0;
            this.updateQueueItem(uploadItem);
            
            // Retry after delay
            setTimeout(() => {
                this.processQueue();
            }, CONFIG.API.RETRY_DELAY);
            
            this.showNotification(`Retrying ${uploadItem.name}...`, 'info');
        } else {
            uploadItem.status = 'error';
            this.updateQueueItem(uploadItem);
            this.showNotification(`Failed to upload ${uploadItem.name}: ${error}`, 'error');
        }
    }
    
    saveToVault(uploadItem) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        
        // Create file object for localStorage
        const fileObj = {
            id: uploadItem.id,
            name: uploadItem.name,
            size: uploadItem.size,
            type: uploadItem.type,
            date: new Date().toISOString(),
            data: URL.createObjectURL(uploadItem.file), // Store blob URL for demo
            metadata: {
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString()
            }
        };
        
        vault.files.push(fileObj);
        localStorage.setItem(vaultKey, JSON.stringify(vault));
    }
    
    addToHistory(uploadItem) {
        this.uploadHistory.unshift({
            id: uploadItem.id,
            name: uploadItem.name,
            size: uploadItem.size,
            type: uploadItem.type,
            date: new Date().toISOString(),
            status: 'success'
        });
        
        // Keep only last 50 uploads
        if (this.uploadHistory.length > 50) {
            this.uploadHistory.pop();
        }
        
        localStorage.setItem('upload_history', JSON.stringify(this.uploadHistory));
    }
    
    loadUploadHistory() {
        const saved = localStorage.getItem('upload_history');
        if (saved) {
            this.uploadHistory = JSON.parse(saved);
        }
    }
    
    renderQueueItem(uploadItem) {
        const container = document.getElementById('uploadQueue');
        if (!container) return;
        
        let itemEl = document.getElementById(`upload_${uploadItem.id}`);
        
        if (!itemEl) {
            itemEl = document.createElement('div');
            itemEl.id = `upload_${uploadItem.id}`;
            itemEl.className = 'queue-item';
            container.appendChild(itemEl);
        }
        
        const statusIcon = {
            pending: '⏳',
            uploading: '📤',
            success: '✓',
            error: '✕',
            aborted: '⛔'
        };
        
        const statusColor = {
            pending: '#f59e0b',
            uploading: '#4F46E5',
            success: '#10b981',
            error: '#ef4444',
            aborted: '#6b7280'
        };
        
        itemEl.innerHTML = `
            <div class="queue-item-icon">📄</div>
            <div class="queue-item-info">
                <div class="queue-item-name">${this.escapeHtml(uploadItem.name)}</div>
                <div class="queue-item-size">${this.formatBytes(uploadItem.size)}</div>
                ${uploadItem.status === 'uploading' ? `
                    <div class="queue-item-speed">${this.formatSpeed(uploadItem.speed)} • ${this.formatTime(uploadItem.timeRemaining)} remaining</div>
                ` : ''}
                <div class="queue-item-progress">
                    <div class="progress-fill" style="width: ${uploadItem.progress}%; background: ${statusColor[uploadItem.status]}"></div>
                </div>
            </div>
            <div class="queue-item-status" style="color: ${statusColor[uploadItem.status]}">
                ${statusIcon[uploadItem.status]} ${uploadItem.status === 'uploading' ? `${Math.round(uploadItem.progress)}%` : uploadItem.status}
            </div>
            ${uploadItem.status === 'pending' || uploadItem.status === 'uploading' ? `
                <button class="queue-item-cancel" onclick="window.uploadHandler.cancelUpload('${uploadItem.id}')">✕</button>
            ` : ''}
        `;
    }
    
    updateQueueItem(uploadItem) {
        this.renderQueueItem(uploadItem);
    }
    
    removeFromQueue(id) {
        this.uploadQueue = this.uploadQueue.filter(u => u.id !== id);
        const itemEl = document.getElementById(`upload_${id}`);
        if (itemEl) itemEl.remove();
        
        if (this.uploadQueue.length === 0) {
            this.hideUploadQueue();
        }
    }
    
    cancelUpload(id) {
        const upload = this.uploadQueue.find(u => u.id === id);
        if (upload && upload.xhr) {
            upload.xhr.abort();
        }
        this.removeFromQueue(id);
        this.showNotification('Upload cancelled', 'info');
    }
    
    showUploadQueue() {
        const container = document.getElementById('uploadQueueContainer');
        if (container) {
            container.style.display = 'block';
        }
    }
    
    hideUploadQueue() {
        const container = document.getElementById('uploadQueueContainer');
        if (container && this.uploadQueue.length === 0) {
            container.style.display = 'none';
        }
    }
    
    pauseAll() {
        this.uploadQueue.forEach(upload => {
            if (upload.status === 'uploading' && upload.xhr) {
                upload.xhr.abort();
                upload.status = 'paused';
            }
        });
    }
    
    resumeAll() {
        this.uploadQueue.forEach(upload => {
            if (upload.status === 'paused') {
                upload.status = 'pending';
                upload.progress = 0;
            }
        });
        this.processQueue();
    }
    
    clearCompleted() {
        this.uploadQueue = this.uploadQueue.filter(u => u.status !== 'success');
        this.renderQueue();
    }
    
    renderQueue() {
        this.uploadQueue.forEach(item => this.renderQueueItem(item));
    }
    
    generateId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatSpeed(bytesPerSecond) {
        if (!bytesPerSecond || bytesPerSecond === Infinity) return 'calculating...';
        return `${this.formatBytes(bytesPerSecond)}/s`;
    }
    
    formatTime(seconds) {
        if (!seconds || seconds === Infinity || isNaN(seconds)) return 'calculating...';
        if (seconds < 60) return `${Math.ceil(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
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

// Initialize upload handler
const uploadHandler = new FileUploadHandler();
window.uploadHandler = uploadHandler;