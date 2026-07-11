/* ========================================
   ALAN VAULT - FILE RENAME HANDLER
   Rename Files & Folders
   ======================================== */

class FileRenameHandler {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for rename buttons
        document.addEventListener('click', (e) => {
            const renameBtn = e.target.closest('[data-rename]');
            if (renameBtn) {
                const fileId = renameBtn.dataset.fileId || renameBtn.closest('[data-file-id]')?.dataset.fileId;
                if (fileId) {
                    this.renameFile(fileId);
                }
            }
        });
    }
    
    async renameFile(fileId) {
        const file = await this.getFileData(fileId);
        if (!file) {
            this.showError('File not found');
            return;
        }
        
        const newName = await this.showRenameDialog(file.name);
        if (newName && newName !== file.name) {
            await this.performRename(fileId, newName);
        }
    }
    
    async getFileData(fileId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        return vault.files.find(f => f.id === fileId);
    }
    
    showRenameDialog(currentName) {
        return new Promise((resolve) => {
            const modal = this.createRenameModal(currentName);
            document.body.appendChild(modal);
            
            const input = modal.querySelector('#renameInput');
            const confirmBtn = modal.querySelector('#confirmRename');
            const cancelBtn = modal.querySelector('#cancelRename');
            
            input.focus();
            input.select();
            
            confirmBtn.onclick = () => {
                const newName = input.value.trim();
                modal.remove();
                resolve(newName);
            };
            
            cancelBtn.onclick = () => {
                modal.remove();
                resolve(null);
            };
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });
        });
    }
    
    createRenameModal(currentName) {
        const modal = document.createElement('div');
        modal.className = 'rename-modal';
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
            <div class="rename-modal-content" style="
                background: #1a1a2e;
                border-radius: 24px;
                padding: 2rem;
                width: 90%;
                max-width: 400px;
            ">
                <h3 style="margin-bottom: 1rem;">Rename File</h3>
                <input type="text" id="renameInput" value="${this.escapeHtml(currentName)}" style="
                    width: 100%;
                    padding: 0.75rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    color: white;
                    margin-bottom: 1rem;
                ">
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button id="cancelRename" style="
                        padding: 0.5rem 1rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Cancel</button>
                    <button id="confirmRename" style="
                        padding: 0.5rem 1rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Rename</button>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    async performRename(fileId, newName) {
        try {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
            const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
            
            const fileIndex = vault.files.findIndex(f => f.id === fileId);
            if (fileIndex === -1) {
                this.showError('File not found');
                return;
            }
            
            const oldName = vault.files[fileIndex].name;
            vault.files[fileIndex].name = newName;
            vault.files[fileIndex].updatedAt = new Date().toISOString();
            
            localStorage.setItem(vaultKey, JSON.stringify(vault));
            
            // Dispatch event
            document.dispatchEvent(new CustomEvent('file:renamed', {
                detail: { fileId, oldName, newName }
            }));
            
            this.showNotification(`File renamed to "${newName}"`, 'success');
            
            // Refresh UI
            if (window.renderFiles) window.renderFiles();
            if (window.filePreview && window.filePreview.currentFile?.id === fileId) {
                window.filePreview.currentFile.name = newName;
                document.getElementById('previewFileName').textContent = newName;
            }
            
        } catch (error) {
            console.error('Rename failed:', error);
            this.showError('Failed to rename file');
        }
    }
    
    async renameFolder(folderId, newName) {
        if (window.folderManager) {
            return window.folderManager.renameFolder(folderId, newName);
        }
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

// Initialize rename handler
const fileRenameHandler = new FileRenameHandler();
window.fileRenameHandler = fileRenameHandler;