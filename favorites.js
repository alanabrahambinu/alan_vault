/* ========================================
   ALAN VAULT - FAVORITES MANAGER
   Starred Files & Folders
   ======================================== */

class FavoritesManager {
    constructor() {
        this.favorites = [];
        this.favoriteFolders = [];
        this.init();
    }
    
    init() {
        this.loadFavorites();
        this.setupEventListeners();
        this.renderFavorites();
    }
    
    loadFavorites() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const favKey = `favorites_${user.id}`;
        const saved = localStorage.getItem(favKey);
        
        if (saved) {
            const data = JSON.parse(saved);
            this.favorites = data.files || [];
            this.favoriteFolders = data.folders || [];
        }
    }
    
    saveFavorites() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const favKey = `favorites_${user.id}`;
        localStorage.setItem(favKey, JSON.stringify({
            files: this.favorites,
            folders: this.favoriteFolders
        }));
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const favBtn = e.target.closest('[data-favorite]');
            if (favBtn) {
                const fileId = favBtn.dataset.fileId || favBtn.closest('[data-file-id]')?.dataset.fileId;
                if (fileId) {
                    this.toggleFavorite(fileId);
                }
            }
        });
    }
    
    async toggleFavorite(itemId, type = 'file') {
        if (type === 'file') {
            const isFavorite = this.favorites.includes(itemId);
            if (isFavorite) {
                this.removeFavorite(itemId);
            } else {
                await this.addFavorite(itemId);
            }
        } else {
            const isFavorite = this.favoriteFolders.includes(itemId);
            if (isFavorite) {
                this.removeFavoriteFolder(itemId);
            } else {
                await this.addFavoriteFolder(itemId);
            }
        }
        
        this.updateFavoriteUI(itemId);
        this.renderFavorites();
    }
    
    async addFavorite(fileId) {
        const file = await this.getFileData(fileId);
        if (!file) {
            this.showError('File not found');
            return false;
        }
        
        if (!this.favorites.includes(fileId)) {
            this.favorites.push(fileId);
            this.saveFavorites();
            this.showNotification(`"${file.name}" added to favorites`, 'success');
            
            document.dispatchEvent(new CustomEvent('favorite:added', {
                detail: { fileId, fileName: file.name }
            }));
            
            return true;
        }
        return false;
    }
    
    removeFavorite(fileId) {
        const index = this.favorites.indexOf(fileId);
        if (index !== -1) {
            this.favorites.splice(index, 1);
            this.saveFavorites();
            this.showNotification('Removed from favorites', 'info');
            
            document.dispatchEvent(new CustomEvent('favorite:removed', {
                detail: { fileId }
            }));
            
            return true;
        }
        return false;
    }
    
    async addFavoriteFolder(folderId) {
        if (window.folderManager) {
            const folder = window.folderManager.folders.find(f => f.id === folderId);
            if (folder && !this.favoriteFolders.includes(folderId)) {
                this.favoriteFolders.push(folderId);
                this.saveFavorites();
                this.showNotification(`"${folder.name}" added to favorites`, 'success');
                return true;
            }
        }
        return false;
    }
    
    removeFavoriteFolder(folderId) {
        const index = this.favoriteFolders.indexOf(folderId);
        if (index !== -1) {
            this.favoriteFolders.splice(index, 1);
            this.saveFavorites();
            this.showNotification('Removed from favorites', 'info');
            return true;
        }
        return false;
    }
    
    async getFileData(fileId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        return vault.files.find(f => f.id === fileId);
    }
    
    isFavorite(fileId) {
        return this.favorites.includes(fileId);
    }
    
    isFavoriteFolder(folderId) {
        return this.favoriteFolders.includes(folderId);
    }
    
    getFavoriteFiles() {
        return this.favorites;
    }
    
    getFavoriteFolders() {
        return this.favoriteFolders;
    }
    
    async getFavoriteFilesData() {
        const files = [];
        for (const fileId of this.favorites) {
            const file = await this.getFileData(fileId);
            if (file) files.push(file);
        }
        return files;
    }
    
    async renderFavorites() {
        const container = document.getElementById('favoritesList');
        if (!container) return;
        
        const favoriteFiles = await this.getFavoriteFilesData();
        
        if (favoriteFiles.length === 0 && this.favoriteFolders.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⭐</div>
                    <p>No favorites yet</p>
                    <p style="font-size: 0.875rem;">Click the star icon on any file to add it to favorites</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Favorite folders
        if (this.favoriteFolders.length > 0 && window.folderManager) {
            html += `<h4 style="margin: 1rem 0 0.5rem;">📁 Favorite Folders</h4>`;
            for (const folderId of this.favoriteFolders) {
                const folder = window.folderManager.folders.find(f => f.id === folderId);
                if (folder) {
                    html += `
                        <div class="favorite-item" style="
                            display: flex;
                            align-items: center;
                            gap: 0.75rem;
                            padding: 0.75rem;
                            background: rgba(255,255,255,0.02);
                            border-radius: 12px;
                            margin-bottom: 0.5rem;
                            cursor: pointer;
                        " onclick="window.folderManager?.navigateTo('${folder.path}')">
                            <div style="font-size: 1.5rem;">📁</div>
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${this.escapeHtml(folder.name)}</div>
                                <div style="font-size: 0.7rem; color: #71717a;">Folder</div>
                            </div>
                            <button onclick="event.stopPropagation(); window.favoritesManager.toggleFavorite('${folderId}', 'folder')" style="
                                background: transparent;
                                border: none;
                                font-size: 1.2rem;
                                cursor: pointer;
                                color: #f59e0b;
                            ">★</button>
                        </div>
                    `;
                }
            }
        }
        
        // Favorite files
        if (favoriteFiles.length > 0) {
            html += `<h4 style="margin: 1rem 0 0.5rem;">📄 Favorite Files</h4>`;
            for (const file of favoriteFiles) {
                html += `
                    <div class="favorite-item" style="
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.02);
                        border-radius: 12px;
                        margin-bottom: 0.5rem;
                        cursor: pointer;
                    " onclick="window.filePreview?.previewFile('${file.id}')">
                        <div style="font-size: 1.5rem;">📄</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${this.escapeHtml(file.name)}</div>
                            <div style="font-size: 0.7rem; color: #71717a;">${this.formatBytes(file.size)}</div>
                        </div>
                        <button onclick="event.stopPropagation(); window.favoritesManager.toggleFavorite('${file.id}')" style="
                            background: transparent;
                            border: none;
                            font-size: 1.2rem;
                            cursor: pointer;
                            color: #f59e0b;
                        ">★</button>
                    </div>
                `;
            }
        }
        
        container.innerHTML = html;
    }
    
    updateFavoriteUI(fileId) {
        const starBtn = document.querySelector(`[data-file-id="${fileId}"] [data-favorite], [data-favorite][data-file-id="${fileId}"]`);
        if (starBtn) {
            const isFav = this.isFavorite(fileId);
            starBtn.textContent = isFav ? '★' : '☆';
            starBtn.style.color = isFav ? '#f59e0b' : '';
        }
    }
    
    clearAllFavorites() {
        if (confirm('Remove all items from favorites?')) {
            this.favorites = [];
            this.favoriteFolders = [];
            this.saveFavorites();
            this.renderFavorites();
            this.showNotification('All favorites cleared', 'success');
        }
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

// Initialize favorites manager
const favoritesManager = new FavoritesManager();
window.favoritesManager = favoritesManager;