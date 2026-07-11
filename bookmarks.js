/* ========================================
   ALAN VAULT - BOOKMARKS MANAGER
   Save & Organize Web Links
   ======================================== */

class BookmarksManager {
    constructor() {
        this.bookmarks = [];
        this.categories = ['General', 'Work', 'Personal', 'Learning', 'Entertainment', 'Development'];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.init();
    }
    
    init() {
        this.loadBookmarks();
        this.setupEventListeners();
        this.renderBookmarks();
        this.setupKeyboardShortcuts();
    }
    
    loadBookmarks() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"bookmarks":[]}');
        this.bookmarks = vault.bookmarks || [];
        this.sortBookmarks();
    }
    
    saveBookmarks() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        vault.bookmarks = this.bookmarks;
        localStorage.setItem(vaultKey, JSON.stringify(vault));
        
        document.dispatchEvent(new CustomEvent('bookmarks:updated', {
            detail: { count: this.bookmarks.length }
        }));
    }
    
    sortBookmarks() {
        this.bookmarks.sort((a, b) => {
            if (a.favorite && !b.favorite) return -1;
            if (!a.favorite && b.favorite) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }
    
    addBookmark(url, title, category = 'General', tags = []) {
        // Validate URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        const newBookmark = {
            id: this.generateId(),
            url: url,
            title: title || this.extractTitleFromUrl(url),
            category: category,
            tags: tags,
            description: '',
            favorite: false,
            clickCount: 0,
            lastVisited: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            favicon: this.getFaviconUrl(url)
        };
        
        this.bookmarks.unshift(newBookmark);
        this.saveBookmarks();
        this.renderBookmarks();
        
        document.dispatchEvent(new CustomEvent('bookmark:added', {
            detail: { bookmark: newBookmark }
        }));
        
        this.showNotification('Bookmark added successfully', 'success');
        
        return newBookmark;
    }
    
    updateBookmark(bookmarkId, updates) {
        const index = this.bookmarks.findIndex(b => b.id === bookmarkId);
        if (index === -1) return false;
        
        this.bookmarks[index] = {
            ...this.bookmarks[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.saveBookmarks();
        this.renderBookmarks();
        
        return true;
    }
    
    deleteBookmark(bookmarkId) {
        const index = this.bookmarks.findIndex(b => b.id === bookmarkId);
        if (index === -1) return false;
        
        const deletedBookmark = this.bookmarks[index];
        this.bookmarks.splice(index, 1);
        this.saveBookmarks();
        this.renderBookmarks();
        
        this.showNotification('Bookmark deleted', 'info');
        
        return true;
    }
    
    toggleFavorite(bookmarkId) {
        const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
            bookmark.favorite = !bookmark.favorite;
            this.sortBookmarks();
            this.saveBookmarks();
            this.renderBookmarks();
        }
    }
    
    incrementClickCount(bookmarkId) {
        const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
            bookmark.clickCount++;
            bookmark.lastVisited = new Date().toISOString();
            this.saveBookmarks();
        }
    }
    
    openBookmark(bookmark) {
        this.incrementClickCount(bookmark.id);
        window.open(bookmark.url, '_blank');
    }
    
    extractTitleFromUrl(url) {
        try {
            const hostname = new URL(url).hostname;
            return hostname.replace('www.', '').split('.')[0];
        } catch {
            return 'Untitled';
        }
    }
    
    getFaviconUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
            return '';
        }
    }
    
    getFilteredBookmarks() {
        let filtered = [...this.bookmarks];
        
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(b => b.category === this.currentCategory);
        }
        
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(b => 
                b.title.toLowerCase().includes(query) ||
                b.url.toLowerCase().includes(query) ||
                b.tags.some(tag => tag.toLowerCase().includes(query)) ||
                (b.description && b.description.toLowerCase().includes(query))
            );
        }
        
        return filtered;
    }
    
    renderBookmarks() {
        const container = document.getElementById('bookmarksGrid');
        if (!container) return;
        
        const filteredBookmarks = this.getFilteredBookmarks();
        
        if (filteredBookmarks.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 4rem;
                    color: var(--text-tertiary);
                ">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔗</div>
                    <h3>No bookmarks found</h3>
                    <p style="margin-top: 0.5rem;">Add your first bookmark to get started</p>
                    <button onclick="window.bookmarksManager.openAddBookmarkModal()" class="btn-primary" style="margin-top: 1rem;">
                        + Add Bookmark
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredBookmarks.map(bookmark => this.renderBookmarkCard(bookmark)).join('');
    }
    
    renderBookmarkCard(bookmark) {
        return `
            <div class="bookmark-card" data-bookmark-id="${bookmark.id}" style="
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(139,92,246,0.2);
                border-radius: 20px;
                padding: 1.5rem;
                transition: all 0.3s;
                position: relative;
            ">
                <div style="display: flex; align-items: flex-start; gap: 1rem;">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: rgba(255,255,255,0.05);
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                    ">
                        <img src="${bookmark.favicon}" alt="" style="width: 24px; height: 24px;" onerror="this.style.display='none'; this.parentElement.textContent='🔗'">
                    </div>
                    
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                            <h3 style="font-size: 1rem; margin: 0;">${this.escapeHtml(bookmark.title)}</h3>
                            ${bookmark.favorite ? '<span style="font-size: 0.8rem;">⭐</span>' : ''}
                        </div>
                        
                        <div style="font-size: 0.75rem; color: #8B5CF6; margin-bottom: 0.5rem; word-break: break-all;">
                            <a href="${bookmark.url}" target="_blank" onclick="window.bookmarksManager.incrementClickCount('${bookmark.id}')" style="color: #8B5CF6; text-decoration: none;">
                                ${this.escapeHtml(bookmark.url)}
                            </a>
                        </div>
                        
                        ${bookmark.description ? `<p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${this.escapeHtml(bookmark.description)}</p>` : ''}
                        
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; font-size: 0.7rem;">
                            <span style="
                                padding: 0.25rem 0.5rem;
                                background: rgba(139,92,246,0.2);
                                border-radius: 50px;
                                color: #8B5CF6;
                            ">📁 ${bookmark.category}</span>
                            ${bookmark.tags.map(tag => `
                                <span style="
                                    padding: 0.25rem 0.5rem;
                                    background: rgba(255,255,255,0.05);
                                    border-radius: 50px;
                                ">#${this.escapeHtml(tag)}</span>
                            `).join('')}
                            <span style="color: #71717a;">👁️ ${bookmark.clickCount} clicks</span>
                        </div>
                    </div>
                    
                    <div class="bookmark-actions" style="display: flex; gap: 0.5rem; opacity: 0; transition: opacity 0.3s;">
                        <button onclick="event.stopPropagation(); window.bookmarksManager.openBookmarkModal('${bookmark.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;">✏️</button>
                        <button onclick="event.stopPropagation(); window.bookmarksManager.toggleFavorite('${bookmark.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;">⭐</button>
                        <button onclick="event.stopPropagation(); window.bookmarksManager.deleteBookmark('${bookmark.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    openAddBookmarkModal() {
        this.openBookmarkModal();
    }
    
    openBookmarkModal(bookmarkId = null) {
        const bookmark = bookmarkId ? this.bookmarks.find(b => b.id === bookmarkId) : null;
        
        const modal = document.createElement('div');
        modal.className = 'bookmark-modal';
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
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 500px;">
                <h3 style="margin-bottom: 1rem;">${bookmark ? 'Edit Bookmark' : 'Add New Bookmark'}</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>URL *</label>
                    <input type="url" id="bookmarkUrl" value="${bookmark ? this.escapeHtml(bookmark.url) : ''}" placeholder="https://example.com" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Title</label>
                    <input type="text" id="bookmarkTitle" value="${bookmark ? this.escapeHtml(bookmark.title) : ''}" placeholder="Auto-detected" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Category</label>
                    <select id="bookmarkCategory" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        ${this.categories.map(cat => `
                            <option value="${cat}" ${bookmark?.category === cat ? 'selected' : ''}>${cat}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Tags (comma separated)</label>
                    <input type="text" id="bookmarkTags" value="${bookmark?.tags?.join(', ') || ''}" placeholder="work, reference, important" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Description</label>
                    <textarea id="bookmarkDescription" rows="3" placeholder="Add a description..." style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">${bookmark ? this.escapeHtml(bookmark.description) : ''}</textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                    <button onclick="this.closest('.bookmark-modal').remove()" style="
                        padding: 0.5rem 1rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="window.bookmarksManager.saveBookmarkFromModal(this, '${bookmark?.id || ''}')" style="
                        padding: 0.5rem 1rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">${bookmark ? 'Update' : 'Save'}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-fetch title if URL is pasted
        const urlInput = modal.querySelector('#bookmarkUrl');
        const titleInput = modal.querySelector('#bookmarkTitle');
        
        urlInput.addEventListener('blur', async () => {
            if (!titleInput.value && urlInput.value) {
                try {
                    const title = await this.fetchPageTitle(urlInput.value);
                    if (title) titleInput.value = title;
                } catch (e) {
                    console.log('Could not fetch title');
                }
            }
        });
    }
    
    async fetchPageTitle(url) {
        try {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            const html = data.contents;
            const match = html.match(/<title[^>]*>([^<]+)<\/title>/);
            return match ? match[1].trim() : null;
        } catch {
            return null;
        }
    }
    
    saveBookmarkFromModal(btn, bookmarkId) {
        const modal = btn.closest('.bookmark-modal');
        const url = modal.querySelector('#bookmarkUrl').value;
        
        if (!url) {
            this.showError('URL is required');
            return;
        }
        
        const bookmarkData = {
            url: url,
            title: modal.querySelector('#bookmarkTitle').value || null,
            category: modal.querySelector('#bookmarkCategory').value,
            tags: modal.querySelector('#bookmarkTags').value.split(',').map(t => t.trim()).filter(t => t),
            description: modal.querySelector('#bookmarkDescription').value
        };
        
        if (bookmarkId) {
            this.updateBookmark(bookmarkId, bookmarkData);
        } else {
            this.addBookmark(bookmarkData.url, bookmarkData.title, bookmarkData.category, bookmarkData.tags);
            if (bookmarkData.description) {
                const newBookmark = this.bookmarks[0];
                this.updateBookmark(newBookmark.id, { description: bookmarkData.description });
            }
        }
        
        modal.remove();
    }
    
    importBookmarks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.bookmarks && Array.isArray(data.bookmarks)) {
                    const importedCount = data.bookmarks.length;
                    this.bookmarks.push(...data.bookmarks.map(b => ({
                        ...b,
                        id: this.generateId(),
                        createdAt: new Date().toISOString()
                    })));
                    this.saveBookmarks();
                    this.renderBookmarks();
                    this.showNotification(`Imported ${importedCount} bookmarks`, 'success');
                } else {
                    throw new Error('Invalid format');
                }
            } catch (error) {
                this.showError('Failed to import bookmarks');
            }
        };
        reader.readAsText(file);
    }
    
    exportBookmarks() {
        const exportData = {
            bookmarks: this.bookmarks,
            exportDate: new Date().toISOString(),
            version: CONFIG.APP_VERSION
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmarks_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Bookmarks exported successfully', 'success');
    }
    
    filterByCategory(category) {
        this.currentCategory = category;
        this.renderBookmarks();
        
        document.querySelectorAll('.category-filter').forEach(filter => {
            filter.classList.remove('active');
            if (filter.dataset.category === category) {
                filter.classList.add('active');
            }
        });
    }
    
    searchBookmarks(query) {
        this.searchQuery = query;
        this.renderBookmarks();
    }
    
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchBookmarks');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchBookmarks(e.target.value);
                }, 300);
            });
        }
        
        // Add bookmark button
        const addBtn = document.getElementById('addBookmarkBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddBookmarkModal());
        }
        
        // Category filters
        document.querySelectorAll('.category-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                this.filterByCategory(filter.dataset.category);
            });
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.openAddBookmarkModal();
            }
        });
    }
    
    generateId() {
        return 'bookmark_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

// Initialize bookmarks manager
const bookmarksManager = new BookmarksManager();
window.bookmarksManager = bookmarksManager;