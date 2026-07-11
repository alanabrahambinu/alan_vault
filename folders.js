/* ========================================
   ALAN VAULT - FOLDER MANAGEMENT
   Create, Rename, Delete Folders
   ======================================== */

class FolderManager {
    constructor() {
        this.folders = [];
        this.currentPath = '';
        this.folderStructure = {};
        this.init();
    }
    
    init() {
        this.loadFolders();
        this.setupEventListeners();
        this.renderBreadcrumb();
    }
    
    loadFolders() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const foldersKey = `folders_${user.id}`;
        const saved = localStorage.getItem(foldersKey);
        
        if (saved) {
            this.folders = JSON.parse(saved);
        } else {
            this.folders = [
                { id: 'root', name: 'Root', path: '/', parent: null, children: [], createdAt: new Date().toISOString() }
            ];
            this.saveFolders();
        }
        
        this.buildFolderStructure();
    }
    
    saveFolders() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const foldersKey = `folders_${user.id}`;
        localStorage.setItem(foldersKey, JSON.stringify(this.folders));
    }
    
    buildFolderStructure() {
        this.folderStructure = {};
        
        // Create map
        this.folders.forEach(folder => {
            this.folderStructure[folder.id] = { ...folder, children: [] };
        });
        
        // Build tree
        this.folders.forEach(folder => {
            if (folder.parent && this.folderStructure[folder.parent]) {
                this.folderStructure[folder.parent].children.push(this.folderStructure[folder.id]);
            }
        });
    }
    
    createFolder(name, parentId = null) {
        if (!name || name.trim() === '') {
            this.showError('Folder name cannot be empty');
            return null;
        }
        
        // Check for duplicate
        const parent = parentId || 'root';
        const existing = this.folders.find(f => f.parent === parent && f.name === name);
        if (existing) {
            this.showError('A folder with this name already exists');
            return null;
        }
        
        const newFolder = {
            id: this.generateId(),
            name: name.trim(),
            path: this.getFolderPath(parentId) + '/' + name,
            parent: parentId || 'root',
            children: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.folders.push(newFolder);
        this.saveFolders();
        this.buildFolderStructure();
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('folder:created', {
            detail: { folder: newFolder }
        }));
        
        this.showNotification(`Folder "${name}" created`, 'success');
        this.renderFolders();
        
        return newFolder;
    }
    
    renameFolder(folderId, newName) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) {
            this.showError('Folder not found');
            return false;
        }
        
        if (!newName || newName.trim() === '') {
            this.showError('Folder name cannot be empty');
            return false;
        }
        
        // Check for duplicate in same parent
        const duplicate = this.folders.find(f => f.parent === folder.parent && f.name === newName && f.id !== folderId);
        if (duplicate) {
            this.showError('A folder with this name already exists');
            return false;
        }
        
        const oldName = folder.name;
        folder.name = newName.trim();
        folder.updatedAt = new Date().toISOString();
        
        // Update paths of all children
        this.updateChildPaths(folderId, folder.path);
        
        this.saveFolders();
        this.buildFolderStructure();
        
        document.dispatchEvent(new CustomEvent('folder:renamed', {
            detail: { folderId, oldName, newName: folder.name }
        }));
        
        this.showNotification(`Folder renamed to "${newName}"`, 'success');
        this.renderFolders();
        
        return true;
    }
    
    updateChildPaths(parentId, parentPath) {
        const children = this.folders.filter(f => f.parent === parentId);
        children.forEach(child => {
            child.path = parentPath + '/' + child.name;
            this.updateChildPaths(child.id, child.path);
        });
    }
    
    deleteFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) {
            this.showError('Folder not found');
            return false;
        }
        
        if (folderId === 'root') {
            this.showError('Cannot delete root folder');
            return false;
        }
        
        // Check if folder has files
        const hasFiles = this.getFilesInFolder(folderId).length > 0;
        if (hasFiles) {
            const confirmed = confirm(`Folder "${folder.name}" contains files. Delete folder and all contents?`);
            if (!confirmed) return false;
        }
        
        // Delete all subfolders recursively
        this.deleteSubfolders(folderId);
        
        // Delete the folder
        this.folders = this.folders.filter(f => f.id !== folderId);
        this.saveFolders();
        this.buildFolderStructure();
        
        document.dispatchEvent(new CustomEvent('folder:deleted', {
            detail: { folderId, folderName: folder.name }
        }));
        
        this.showNotification(`Folder "${folder.name}" deleted`, 'success');
        this.renderFolders();
        
        return true;
    }
    
    deleteSubfolders(parentId) {
        const children = this.folders.filter(f => f.parent === parentId);
        children.forEach(child => {
            this.deleteSubfolders(child.id);
            this.folders = this.folders.filter(f => f.id !== child.id);
        });
    }
    
    moveFolder(folderId, newParentId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return false;
        
        if (folderId === 'root') {
            this.showError('Cannot move root folder');
            return false;
        }
        
        // Check for circular reference
        if (this.isChildOf(folderId, newParentId)) {
            this.showError('Cannot move folder into its own subfolder');
            return false;
        }
        
        const oldParent = folder.parent;
        folder.parent = newParentId;
        folder.path = this.getFolderPath(newParentId) + '/' + folder.name;
        folder.updatedAt = new Date().toISOString();
        
        // Update child paths
        this.updateChildPaths(folderId, folder.path);
        
        this.saveFolders();
        this.buildFolderStructure();
        
        document.dispatchEvent(new CustomEvent('folder:moved', {
            detail: { folderId, oldParent, newParent: newParentId }
        }));
        
        this.showNotification(`Folder moved`, 'success');
        this.renderFolders();
        
        return true;
    }
    
    isChildOf(parentId, childId) {
        if (parentId === childId) return true;
        
        const child = this.folders.find(f => f.id === childId);
        if (!child || !child.parent) return false;
        
        return this.isChildOf(parentId, child.parent);
    }
    
    getFolderPath(parentId) {
        if (!parentId || parentId === 'root') return '';
        
        const parent = this.folders.find(f => f.id === parentId);
        if (!parent) return '';
        
        const parentPath = this.getFolderPath(parent.parent);
        return parentPath ? `${parentPath}/${parent.name}` : parent.name;
    }
    
    getFilesInFolder(folderId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        
        return vault.files.filter(f => f.folderId === folderId);
    }
    
    getCurrentFolder() {
        if (!this.currentPath || this.currentPath === '/') {
            return this.folders.find(f => f.id === 'root');
        }
        return this.folders.find(f => f.path === this.currentPath);
    }
    
    navigateTo(path) {
        this.currentPath = path;
        this.renderBreadcrumb();
        this.renderFolders();
        
        document.dispatchEvent(new CustomEvent('folder:navigated', {
            detail: { path: this.currentPath }
        }));
    }
    
    renderBreadcrumb() {
        const container = document.getElementById('breadcrumb');
        if (!container) return;
        
        const parts = this.currentPath.split('/').filter(p => p);
        let breadcrumbHtml = `<span class="breadcrumb-item" onclick="window.folderManager.navigateTo('/')">Root</span>`;
        
        let currentPath = '';
        for (const part of parts) {
            currentPath += '/' + part;
            breadcrumbHtml += `<span class="breadcrumb-separator">/</span>`;
            breadcrumbHtml += `<span class="breadcrumb-item" onclick="window.folderManager.navigateTo('${currentPath}')">${this.escapeHtml(part)}</span>`;
        }
        
        container.innerHTML = breadcrumbHtml;
    }
    
    renderFolders() {
        const container = document.getElementById('foldersList');
        if (!container) return;
        
        const currentFolder = this.getCurrentFolder();
        const subfolders = this.folders.filter(f => f.parent === currentFolder?.id);
        
        if (subfolders.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: var(--text-tertiary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📁</div>
                    <p>No folders yet</p>
                    <button onclick="window.folderManager.createFolderPrompt()" class="btn-primary" style="margin-top: 1rem;">Create Folder</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = subfolders.map(folder => `
            <div class="folder-card" data-folder-id="${folder.id}" onclick="window.folderManager.navigateTo('${folder.path}')">
                <div class="folder-icon">📁</div>
                <div class="folder-name">${this.escapeHtml(folder.name)}</div>
                <div class="folder-actions">
                    <button class="folder-action" onclick="event.stopPropagation(); window.folderManager.renameFolderPrompt('${folder.id}')">✏️</button>
                    <button class="folder-action" onclick="event.stopPropagation(); window.folderManager.deleteFolderPrompt('${folder.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    
    createFolderPrompt() {
        const name = prompt('Enter folder name:');
        if (name) {
            const currentFolder = this.getCurrentFolder();
            this.createFolder(name, currentFolder?.id);
        }
    }
    
    renameFolderPrompt(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder) {
            const newName = prompt('Enter new folder name:', folder.name);
            if (newName && newName !== folder.name) {
                this.renameFolder(folderId, newName);
            }
        }
    }
    
    deleteFolderPrompt(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder && confirm(`Delete folder "${folder.name}"?`)) {
            this.deleteFolder(folderId);
        }
    }
    
    setupEventListeners() {
        // Listen for new folder button
        const newFolderBtn = document.getElementById('newFolderBtn');
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', () => this.createFolderPrompt());
        }
    }
    
    generateId() {
        return 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

// Initialize folder manager
const folderManager = new FolderManager();
window.folderManager = folderManager;