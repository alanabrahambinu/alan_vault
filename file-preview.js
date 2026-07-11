/* ========================================
   ALAN VAULT - FILE PREVIEW HANDLER
   File Preview & Quick View
   ======================================== */

class FilePreviewHandler {
    constructor() {
        this.previewModal = null;
        this.currentFile = null;
        this.supportedTypes = {
            images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
            documents: ['pdf', 'txt', 'md', 'json', 'xml', 'csv'],
            code: ['js', 'html', 'css', 'py', 'java', 'cpp', 'c', 'rb', 'go', 'php', 'sql'],
            videos: ['mp4', 'webm', 'ogg', 'avi', 'mov'],
            audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a']
        };
        this.init();
    }
    
    init() {
        this.createPreviewModal();
        this.setupEventListeners();
    }
    
    createPreviewModal() {
        // Check if modal already exists
        if (document.getElementById('filePreviewModal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'filePreviewModal';
        modal.className = 'preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(20px);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        `;
        
        modal.innerHTML = `
            <div class="preview-container" style="
                width: 90%;
                max-width: 1200px;
                max-height: 90vh;
                background: #1a1a2e;
                border-radius: 24px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            ">
                <div class="preview-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                ">
                    <div class="preview-title">
                        <h3 id="previewFileName" style="margin: 0;">File Preview</h3>
                        <span id="previewFileSize" style="font-size: 0.75rem; color: #71717a;"></span>
                    </div>
                    <div class="preview-actions">
                        <button id="previewDownloadBtn" class="preview-action-btn" title="Download">📥</button>
                        <button id="previewShareBtn" class="preview-action-btn" title="Share">🔗</button>
                        <button id="previewDeleteBtn" class="preview-action-btn" title="Delete">🗑️</button>
                        <button id="previewCloseBtn" class="preview-action-btn" title="Close">✕</button>
                    </div>
                </div>
                <div id="previewContent" class="preview-content" style="
                    flex: 1;
                    padding: 2rem;
                    overflow: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                ">
                    <div class="preview-loading">Loading preview...</div>
                </div>
                <div class="preview-footer" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    font-size: 0.875rem;
                    color: #71717a;
                ">
                    <span id="previewInfo"></span>
                    <div class="preview-nav">
                        <button id="prevFileBtn" class="nav-btn" disabled>← Previous</button>
                        <button id="nextFileBtn" class="nav-btn" disabled>Next →</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.previewModal = modal;
        
        // Setup button handlers
        document.getElementById('previewCloseBtn').onclick = () => this.closePreview();
        document.getElementById('previewDownloadBtn').onclick = () => this.downloadCurrentFile();
        document.getElementById('previewShareBtn').onclick = () => this.shareCurrentFile();
        document.getElementById('previewDeleteBtn').onclick = () => this.deleteCurrentFile();
        document.getElementById('prevFileBtn').onclick = () => this.navigateFiles(-1);
        document.getElementById('nextFileBtn').onclick = () => this.navigateFiles(1);
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.previewModal.style.display === 'flex') {
                this.closePreview();
            }
        });
    }
    
    setupEventListeners() {
        // Listen for file click events
        document.addEventListener('click', (e) => {
            const fileCard = e.target.closest('[data-file-id]');
            if (fileCard) {
                const fileId = fileCard.dataset.fileId;
                this.previewFile(fileId);
            }
        });
    }
    
    async previewFile(fileId) {
        const file = await this.getFileData(fileId);
        if (!file) return;
        
        this.currentFile = file;
        this.currentFileIndex = this.getFileIndex(fileId);
        this.filesList = this.getCurrentDirectoryFiles();
        
        await this.renderPreview(file);
        this.showPreview();
        this.updateNavigationButtons();
    }
    
    async getFileData(fileId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        
        return vault.files.find(f => f.id === fileId);
    }
    
    getFileIndex(fileId) {
        if (!this.filesList) return -1;
        return this.filesList.findIndex(f => f.id === fileId);
    }
    
    getCurrentDirectoryFiles() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        return vault.files;
    }
    
    async renderPreview(file) {
        const contentDiv = document.getElementById('previewContent');
        const fileNameSpan = document.getElementById('previewFileName');
        const fileSizeSpan = document.getElementById('previewFileSize');
        const infoSpan = document.getElementById('previewInfo');
        
        fileNameSpan.textContent = file.name;
        fileSizeSpan.textContent = this.formatBytes(file.size);
        
        const extension = file.name.split('.').pop().toLowerCase();
        
        // Determine preview type
        if (this.supportedTypes.images.includes(extension)) {
            await this.renderImagePreview(file, contentDiv);
            infoSpan.textContent = `Image • ${file.width || '?'} x ${file.height || '?'} • ${this.formatBytes(file.size)}`;
        } else if (extension === 'pdf') {
            await this.renderPDFPreview(file, contentDiv);
            infoSpan.textContent = `PDF Document • ${this.formatBytes(file.size)}`;
        } else if (this.supportedTypes.videos.includes(extension)) {
            await this.renderVideoPreview(file, contentDiv);
            infoSpan.textContent = `Video • ${this.formatBytes(file.size)}`;
        } else if (this.supportedTypes.audio.includes(extension)) {
            await this.renderAudioPreview(file, contentDiv);
            infoSpan.textContent = `Audio • ${this.formatBytes(file.size)}`;
        } else if (this.supportedTypes.documents.includes(extension)) {
            await this.renderTextPreview(file, contentDiv);
            infoSpan.textContent = `Document • ${this.formatBytes(file.size)}`;
        } else if (this.supportedTypes.code.includes(extension)) {
            await this.renderCodePreview(file, contentDiv);
            infoSpan.textContent = `Code • ${extension.toUpperCase()} • ${this.formatBytes(file.size)}`;
        } else {
            await this.renderGenericPreview(file, contentDiv);
            infoSpan.textContent = `File • ${this.formatBytes(file.size)}`;
        }
    }
    
    async renderImagePreview(file, container) {
        container.innerHTML = `<img src="${file.data}" alt="${file.name}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">`;
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
            file.width = img.width;
            file.height = img.height;
        };
        img.src = file.data;
    }
    
    async renderPDFPreview(file, container) {
        container.innerHTML = `
            <iframe src="${file.data}" style="width: 100%; height: 70vh; border: none; border-radius: 8px;"></iframe>
        `;
    }
    
    async renderVideoPreview(file, container) {
        container.innerHTML = `
            <video controls style="max-width: 100%; max-height: 70vh; border-radius: 8px;">
                <source src="${file.data}" type="${file.type}">
                Your browser does not support the video tag.
            </video>
        `;
    }
    
    async renderAudioPreview(file, container) {
        container.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎵</div>
                <audio controls style="width: 100%;">
                    <source src="${file.data}" type="${file.type}">
                    Your browser does not support the audio tag.
                </audio>
                <div style="margin-top: 1rem;">
                    <p><strong>${file.name}</strong></p>
                    <p>Duration: --:--</p>
                </div>
            </div>
        `;
    }
    
    async renderTextPreview(file, container) {
        try {
            const response = await fetch(file.data);
            const text = await response.text();
            const previewText = text.length > 10000 ? text.substring(0, 10000) + '\n\n... (truncated)' : text;
            
            container.innerHTML = `
                <pre style="
                    background: rgba(0,0,0,0.3);
                    padding: 1rem;
                    border-radius: 8px;
                    overflow: auto;
                    max-height: 70vh;
                    font-family: monospace;
                    font-size: 0.875rem;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                ">${this.escapeHtml(previewText)}</pre>
            `;
        } catch (error) {
            container.innerHTML = `<div class="preview-error">Unable to preview text file</div>`;
        }
    }
    
    async renderCodePreview(file, container) {
        try {
            const response = await fetch(file.data);
            const code = await response.text();
            const extension = file.name.split('.').pop();
            
            container.innerHTML = `
                <div style="width: 100%;">
                    <div style="
                        background: rgba(0,0,0,0.3);
                        padding: 0.5rem 1rem;
                        border-radius: 8px 8px 0 0;
                        font-family: monospace;
                        font-size: 0.75rem;
                        color: #8B5CF6;
                    ">${extension.toUpperCase()}</div>
                    <pre style="
                        background: rgba(0,0,0,0.3);
                        padding: 1rem;
                        margin: 0;
                        border-radius: 0 0 8px 8px;
                        overflow: auto;
                        max-height: 70vh;
                        font-family: monospace;
                        font-size: 0.875rem;
                        overflow-x: auto;
                    "><code class="language-${extension}">${this.escapeHtml(code)}</code></pre>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="preview-error">Unable to preview code file</div>`;
        }
    }
    
    async renderGenericPreview(file, container) {
        const extension = file.name.split('.').pop().toUpperCase();
        container.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 5rem; margin-bottom: 1rem;">📄</div>
                <h3>${file.name}</h3>
                <p>Type: ${extension || 'Unknown'}</p>
                <p>Size: ${this.formatBytes(file.size)}</p>
                <p>This file type cannot be previewed directly.</p>
                <button onclick="window.filePreview.downloadCurrentFile()" style="
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                ">Download File</button>
            </div>
        `;
    }
    
    showPreview() {
        this.previewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    closePreview() {
        this.previewModal.style.display = 'none';
        document.body.style.overflow = '';
        this.currentFile = null;
    }
    
    downloadCurrentFile() {
        if (this.currentFile && this.currentFile.data) {
            const link = document.createElement('a');
            link.href = this.currentFile.data;
            link.download = this.currentFile.name;
            link.click();
        }
    }
    
    shareCurrentFile() {
        if (navigator.share && this.currentFile) {
            navigator.share({
                title: this.currentFile.name,
                url: this.currentFile.data
            }).catch(() => {
                this.copyToClipboard(this.currentFile.data);
            });
        } else if (this.currentFile) {
            this.copyToClipboard(this.currentFile.data);
        }
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        this.showNotification('Link copied to clipboard!', 'success');
    }
    
    deleteCurrentFile() {
        if (confirm(`Are you sure you want to delete "${this.currentFile?.name}"?`)) {
            if (window.fileDeleteHandler) {
                window.fileDeleteHandler.deleteFile(this.currentFile.id);
                this.closePreview();
            }
        }
    }
    
    navigateFiles(direction) {
        const newIndex = this.currentFileIndex + direction;
        if (newIndex >= 0 && newIndex < this.filesList.length) {
            const newFile = this.filesList[newIndex];
            this.previewFile(newFile.id);
        }
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevFileBtn');
        const nextBtn = document.getElementById('nextFileBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentFileIndex <= 0;
        if (nextBtn) nextBtn.disabled = this.currentFileIndex >= this.filesList.length - 1;
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
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize file preview handler
const filePreview = new FilePreviewHandler();
window.filePreview = filePreview;