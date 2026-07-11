/* ========================================
   ALAN VAULT - FILE SHARING HANDLER
   Share Files & Folders with Links
   ======================================== */

class FileSharingHandler {
    constructor() {
        this.sharedLinks = [];
        this.activeShares = [];
        this.init();
    }
    
    init() {
        this.loadSharedLinks();
        this.setupEventListeners();
    }
    
    loadSharedLinks() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const sharesKey = `shared_links_${user.id}`;
        const saved = localStorage.getItem(sharesKey);
        
        if (saved) {
            this.sharedLinks = JSON.parse(saved);
        }
    }
    
    saveSharedLinks() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const sharesKey = `shared_links_${user.id}`;
        localStorage.setItem(sharesKey, JSON.stringify(this.sharedLinks));
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const shareBtn = e.target.closest('[data-share]');
            if (shareBtn) {
                const fileId = shareBtn.dataset.fileId || shareBtn.closest('[data-file-id]')?.dataset.fileId;
                if (fileId) {
                    this.shareFile(fileId);
                }
            }
        });
    }
    
    async shareFile(fileId, options = {}) {
        const file = await this.getFileData(fileId);
        if (!file) {
            this.showError('File not found');
            return;
        }
        
        const shareOptions = {
            expiresIn: options.expiresIn || 7, // days
            password: options.password || null,
            allowDownload: options.allowDownload !== false,
            maxAccess: options.maxAccess || null
        };
        
        const shareLink = this.createShareLink(file, shareOptions);
        this.showShareDialog(shareLink, file, shareOptions);
        
        return shareLink;
    }
    
    async getFileData(fileId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        return vault.files.find(f => f.id === fileId);
    }
    
    createShareLink(file, options) {
        const shareId = this.generateShareId();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + options.expiresIn);
        
        const shareLink = {
            id: shareId,
            fileId: file.id,
            fileName: file.name,
            fileSize: file.size,
            shareToken: this.generateToken(),
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            accessCount: 0,
            ...options
        };
        
        this.sharedLinks.push(shareLink);
        this.saveSharedLinks();
        
        const shareUrl = `${window.location.origin}/shared.html?token=${shareLink.shareToken}`;
        shareLink.url = shareUrl;
        
        return shareLink;
    }
    
    showShareDialog(shareLink, file, options) {
        const modal = document.createElement('div');
        modal.className = 'share-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;
        
        modal.innerHTML = `
            <div class="share-modal-content" style="
                background: #1a1a2e;
                border-radius: 24px;
                padding: 2rem;
                width: 90%;
                max-width: 500px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0;">Share "${this.escapeHtml(file.name)}"</h3>
                    <button onclick="this.closest('.share-modal').remove()" style="
                        background: transparent;
                        border: none;
                        color: #a1a1aa;
                        font-size: 1.5rem;
                        cursor: pointer;
                    ">✕</button>
                </div>
                
                <div class="share-link-container" style="
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                ">
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="shareUrl" value="${shareLink.url}" readonly style="
                            flex: 1;
                            background: transparent;
                            border: none;
                            color: white;
                            font-size: 0.875rem;
                        ">
                        <button onclick="window.fileSharing.copyShareLink()" style="
                            padding: 0.25rem 0.75rem;
                            background: rgba(139,92,246,0.2);
                            border: none;
                            border-radius: 6px;
                            color: #8B5CF6;
                            cursor: pointer;
                        ">Copy</button>
                    </div>
                </div>
                
                <div class="share-options" style="margin-bottom: 1.5rem;">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="allowDownload" ${options.allowDownload !== false ? 'checked' : ''}>
                            <span>Allow download</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem;">Expires in (days)</label>
                        <select id="expiresIn" style="
                            width: 100%;
                            padding: 0.5rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                        ">
                            <option value="1">1 day</option>
                            <option value="3">3 days</option>
                            <option value="7" selected>7 days</option>
                            <option value="30">30 days</option>
                            <option value="0">Never</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem;">Password protection (optional)</label>
                        <input type="password" id="sharePassword" placeholder="Leave empty for no password" style="
                            width: 100%;
                            padding: 0.5rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                        ">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem;">Maximum accesses (optional)</label>
                        <input type="number" id="maxAccess" placeholder="Unlimited" min="1" style="
                            width: 100%;
                            padding: 0.5rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                        ">
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button onclick="window.fileSharing.updateShareSettings('${shareLink.id}')" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 12px;
                        color: white;
                        cursor: pointer;
                    ">Update Settings</button>
                    <button onclick="window.fileSharing.revokeShare('${shareLink.id}')" style="
                        padding: 0.75rem 1.5rem;
                        background: rgba(239,68,68,0.2);
                        border: 1px solid rgba(239,68,68,0.3);
                        border-radius: 12px;
                        color: #ef4444;
                        cursor: pointer;
                    ">Revoke Link</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Store current share link ID for reference
        this.currentShareId = shareLink.id;
    }
    
    copyShareLink() {
        const urlInput = document.getElementById('shareUrl');
        if (urlInput) {
            urlInput.select();
            document.execCommand('copy');
            this.showNotification('Link copied to clipboard!', 'success');
        }
    }
    
    updateShareSettings(shareId) {
        const shareLink = this.sharedLinks.find(s => s.id === shareId);
        if (!shareLink) return;
        
        const allowDownload = document.getElementById('allowDownload')?.checked;
        const expiresIn = parseInt(document.getElementById('expiresIn')?.value);
        const password = document.getElementById('sharePassword')?.value;
        const maxAccess = document.getElementById('maxAccess')?.value;
        
        if (expiresIn > 0) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresIn);
            shareLink.expiresAt = expiresAt.toISOString();
        }
        
        shareLink.allowDownload = allowDownload;
        if (password) shareLink.password = password;
        if (maxAccess) shareLink.maxAccess = parseInt(maxAccess);
        
        shareLink.updatedAt = new Date().toISOString();
        
        this.saveSharedLinks();
        this.showNotification('Share settings updated', 'success');
        
        // Close modal
        const modal = document.querySelector('.share-modal');
        if (modal) modal.remove();
    }
    
    revokeShare(shareId) {
        if (confirm('Revoke this share link? It will no longer be accessible.')) {
            this.sharedLinks = this.sharedLinks.filter(s => s.id !== shareId);
            this.saveSharedLinks();
            this.showNotification('Share link revoked', 'success');
            
            const modal = document.querySelector('.share-modal');
            if (modal) modal.remove();
        }
    }
    
    async accessSharedFile(token, password = null) {
        const shareLink = this.sharedLinks.find(s => s.shareToken === token);
        
        if (!shareLink) {
            this.showError('Invalid share link');
            return null;
        }
        
        // Check expiration
        if (new Date(shareLink.expiresAt) < new Date()) {
            this.showError('This share link has expired');
            return null;
        }
        
        // Check password
        if (shareLink.password && shareLink.password !== password) {
            this.showError('Incorrect password');
            return null;
        }
        
        // Check max accesses
        if (shareLink.maxAccess && shareLink.accessCount >= shareLink.maxAccess) {
            this.showError('This share link has reached its maximum number of accesses');
            return null;
        }
        
        // Increment access count
        shareLink.accessCount++;
        shareLink.lastAccessed = new Date().toISOString();
        this.saveSharedLinks();
        
        // Get file data
        const file = await this.getFileData(shareLink.fileId);
        if (!file) {
            this.showError('File no longer exists');
            return null;
        }
        
        return {
            file: file,
            shareLink: shareLink
        };
    }
    
    getSharedLinks() {
        return this.sharedLinks.map(link => ({
            ...link,
            isExpired: new Date(link.expiresAt) < new Date()
        }));
    }
    
    generateShareId() {
        return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateToken() {
        return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 32);
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

// Initialize sharing handler
const fileSharing = new FileSharingHandler();
window.fileSharing = fileSharing;