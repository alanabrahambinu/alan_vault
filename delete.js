/* ========================================
   ALAN VAULT - FILE DELETE HANDLER
   Delete Files & Folders with Confirmation
   ======================================== */

class FileDeleteHandler {
    constructor() {
        this.trashBin = [];
        this.autoDeleteDays = 30;
        this.init();
    }
    
    init() {
        this.loadTrashBin();
        this.setupEventListeners();
        this.startAutoCleanup();
    }
    
    loadTrashBin() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const trashKey = `trash_${user.id}`;
        const saved = localStorage.getItem(trashKey);
        
        if (saved) {
            this.trashBin = JSON.parse(saved);
        }
    }
    
    saveTrashBin() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const trashKey = `trash_${user.id}`;
        localStorage.setItem(trashKey, JSON.stringify(this.trashBin));
    }
    
    setupEventListeners() {
        // Listen for delete buttons
        document.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('[data-delete]');
            if (deleteBtn) {
                const fileId = deleteBtn.dataset.fileId || deleteBtn.closest('[data-file-id]')?.dataset.fileId;
                if (fileId) {
                    this.confirmDelete(fileId);
                }
            }
        });
    }
    
    async confirmDelete(fileId, isFolder = false) {
        const item = isFolder ? await this.getFolderData(fileId) : await this.getFileData(fileId);
        if (!item) return;
        
        const confirmed = await this.showDeleteConfirmation(item.name, isFolder);
        if (confirmed) {
            if (isFolder) {
                await this.deleteFolder(fileId);
            } else {
                await this.deleteFile(fileId);
            }
        }
    }
    
    showDeleteConfirmation(name, isFolder = false) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'delete-confirm-modal';
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
                <div class="delete-modal-content" style="
                    background: #1a1a2e;
                    border-radius: 24px;
                    padding: 2rem;
                    width: 90%;
                    max-width: 400px;
                    text-align: center;
                ">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin-bottom: 0.5rem;">Delete ${isFolder ? 'Folder' : 'File'}?</h3>
                    <p style="color: #a1a1aa; margin-bottom: 1rem;">
                        Are you sure you want to delete "${this.escapeHtml(name)}"? 
                        ${isFolder ? 'All contents will be moved to trash.' : 'This action can be undone from trash.'}
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button id="cancelDelete" style="
                            padding: 0.5rem 1.5rem;
                            background: transparent;
                            border: 1px solid rgba(139,92,246,0.5);
                            border-radius: 8px;
                            color: #8B5CF6;
                            cursor: pointer;
                        ">Cancel</button>
                        <button id="confirmDelete" style="
                            padding: 0.5rem 1.5rem;
                            background: #ef4444;
                            border: none;
                            border-radius: 8px;
                            color: white;
                            cursor: pointer;
                        ">Delete</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            document.getElementById('cancelDelete').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            document.getElementById('confirmDelete').onclick = () => {
                modal.remove();
                resolve(true);
            };
        });
    }
    
    async getFileData(fileId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        return vault.files.find(f => f.id === fileId);
    }
    
    async getFolderData(folderId) {
        if (window.folderManager) {
            return window.folderManager.folders.find(f => f.id === folderId);
        }
        return null;
    }
    
    async deleteFile(fileId, permanent = false) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        
        const fileIndex = vault.files.findIndex(f => f.id === fileId);
        if (fileIndex === -1) {
            this.showError('File not found');
            return false;
        }
        
        const file = vault.files[fileIndex];
        
        if (permanent) {
            // Permanently delete
            vault.files.splice(fileIndex, 1);
            localStorage.setItem(vaultKey, JSON.stringify(vault));
            
            this.showNotification(`"${file.name}" permanently deleted`, 'success');
        } else {
            // Move to trash
            const trashItem = {
                id: file.id,
                name: file.name,
                size: file.size,
                type: file.type,
                originalPath: file.folderId || 'root',
                deletedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.autoDeleteDays * 24 * 60 * 60 * 1000).toISOString(),
                data: file.data
            };
            
            this.trashBin.push(trashItem);
            this.saveTrashBin();
            
            // Remove from vault
            vault.files.splice(fileIndex, 1);
            localStorage.setItem(vaultKey, JSON.stringify(vault));
            
            this.showNotification(`"${file.name}" moved to trash`, 'info');
        }
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('file:deleted', {
            detail: { fileId, fileName: file.name, permanent }
        }));
        
        // Refresh UI
        if (window.renderFiles) window.renderFiles();
        if (window.storageStats) window.storageStats.update();
        
        return true;
    }
    
    async deleteFolder(folderId) {
        if (window.folderManager) {
            const folder = window.folderManager.folders.find(f => f.id === folderId);
            if (folder) {
                // Move all files in folder to trash
                const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
                
                const filesInFolder = vault.files.filter(f => f.folderId === folderId);
                for (const file of filesInFolder) {
                    await this.deleteFile(file.id);
                }
                
                // Delete folder
                window.folderManager.deleteFolder(folderId);
                this.showNotification(`Folder "${folder.name}" deleted`, 'success');
            }
        }
    }
    
    restoreFromTrash(trashItemId) {
        const itemIndex = this.trashBin.findIndex(i => i.id === trashItemId);
        if (itemIndex === -1) return false;
        
        const item = this.trashBin[itemIndex];
        
        // Restore to vault
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        
        const restoredFile = {
            id: item.id,
            name: item.name,
            size: item.size,
            type: item.type,
            date: new Date().toISOString(),
            folderId: item.originalPath,
            data: item.data
        };
        
        vault.files.push(restoredFile);
        localStorage.setItem(vaultKey, JSON.stringify(vault));
        
        // Remove from trash
        this.trashBin.splice(itemIndex, 1);
        this.saveTrashBin();
        
        this.showNotification(`"${item.name}" restored`, 'success');
        
        // Refresh UI
        if (window.renderFiles) window.renderFiles();
        if (window.renderTrashBin) window.renderTrashBin();
        
        return true;
    }
    
    emptyTrash() {
        if (confirm('Empty trash? All items will be permanently deleted.')) {
            this.trashBin = [];
            this.saveTrashBin();
            this.showNotification('Trash emptied', 'success');
            if (window.renderTrashBin) window.renderTrashBin();
        }
    }
    
    getTrashBin() {
        return this.trashBin;
    }
    
    getTrashSize() {
        return this.trashBin.reduce((sum, item) => sum + (item.size || 0), 0);
    }
    
    startAutoCleanup() {
        // Clean up expired trash items daily
        setInterval(() => {
            const now = Date.now();
            const beforeCount = this.trashBin.length;
            
            this.trashBin = this.trashBin.filter(item => {
                return new Date(item.expiresAt).getTime() > now;
            });
            
            if (this.trashBin.length !== beforeCount) {
                this.saveTrashBin();
                console.log(`Auto-cleaned ${beforeCount - this.trashBin.length} expired trash items`);
            }
        }, 24 * 60 * 60 * 1000);
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

// Initialize delete handler
const fileDeleteHandler = new FileDeleteHandler();
window.fileDeleteHandler = fileDeleteHandler;