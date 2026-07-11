/* ========================================
   ALAN VAULT - NOTES MANAGEMENT
   Core Notes CRUD Operations
   ======================================== */

class NotesManager {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.filter = 'all';
        this.searchQuery = '';
        this.currentCategory = 'all';
        this.viewMode = 'grid';
        this.init();
    }
    
    init() {
        this.loadNotes();
        this.setupEventListeners();
        this.renderNotes();
        this.setupKeyboardShortcuts();
        this.startAutoBackup();
    }
    
    loadNotes() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"notes":[]}');
        this.notes = vault.notes || [];
        this.sortNotes();
    }
    
    saveNotes() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        vault.notes = this.notes;
        localStorage.setItem(vaultKey, JSON.stringify(vault));
        
        document.dispatchEvent(new CustomEvent('notes:updated', {
            detail: { count: this.notes.length }
        }));
    }
    
    sortNotes() {
        this.notes.sort((a, b) => {
            // Pinned notes first
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            // Then by updated date (newest first)
            return new Date(b.updated) - new Date(a.updated);
        });
    }
    
    createNote(title = 'Untitled', content = '', category = 'general') {
        const newNote = {
            id: this.generateId(),
            title: title,
            content: content,
            category: category,
            pinned: false,
            favorite: false,
            tags: [],
            color: null,
            version: 1,
            wordCount: this.countWords(content),
            characterCount: content.length,
            createdAt: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        
        this.notes.unshift(newNote);
        this.saveNotes();
        this.renderNotes();
        
        document.dispatchEvent(new CustomEvent('note:created', {
            detail: { note: newNote }
        }));
        
        if (window.notify) {
            window.notify.success('Note created successfully');
        }
        
        return newNote;
    }
    
    updateNote(noteId, updates) {
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index === -1) return false;
        
        const oldNote = { ...this.notes[index] };
        this.notes[index] = {
            ...this.notes[index],
            ...updates,
            updated: new Date().toISOString(),
            version: this.notes[index].version + 1,
            wordCount: updates.content ? this.countWords(updates.content) : this.notes[index].wordCount,
            characterCount: updates.content ? updates.content.length : this.notes[index].characterCount
        };
        
        this.saveNotes();
        this.sortNotes();
        this.renderNotes();
        
        document.dispatchEvent(new CustomEvent('note:updated', {
            detail: { noteId, oldNote, newNote: this.notes[index], changes: updates }
        }));
        
        return true;
    }
    
    deleteNote(noteId) {
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index === -1) return false;
        
        const deletedNote = this.notes[index];
        this.notes.splice(index, 1);
        this.saveNotes();
        this.renderNotes();
        
        document.dispatchEvent(new CustomEvent('note:deleted', {
            detail: { note: deletedNote }
        }));
        
        if (window.notify) {
            window.notify.info('Note deleted');
        }
        
        return true;
    }
    
    duplicateNote(noteId) {
        const original = this.notes.find(n => n.id === noteId);
        if (!original) return null;
        
        const duplicate = {
            ...original,
            id: this.generateId(),
            title: `${original.title} (Copy)`,
            createdAt: new Date().toISOString(),
            updated: new Date().toISOString(),
            version: 1
        };
        
        this.notes.unshift(duplicate);
        this.saveNotes();
        this.renderNotes();
        
        if (window.notify) {
            window.notify.success('Note duplicated');
        }
        
        return duplicate;
    }
    
    togglePin(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.pinned = !note.pinned;
            this.saveNotes();
            this.sortNotes();
            this.renderNotes();
            
            if (window.notify) {
                window.notify.info(note.pinned ? 'Note pinned' : 'Note unpinned');
            }
        }
    }
    
    toggleFavorite(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.favorite = !note.favorite;
            this.saveNotes();
            this.renderNotes();
        }
    }
    
    setNoteColor(noteId, color) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.color = color;
            this.saveNotes();
            this.renderNotes();
        }
    }
    
    addTag(noteId, tag) {
        const note = this.notes.find(n => n.id === noteId);
        if (note && !note.tags.includes(tag)) {
            note.tags.push(tag);
            this.saveNotes();
            this.renderNotes();
            return true;
        }
        return false;
    }
    
    removeTag(noteId, tag) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.tags = note.tags.filter(t => t !== tag);
            this.saveNotes();
            this.renderNotes();
            return true;
        }
        return false;
    }
    
    getNote(noteId) {
        return this.notes.find(n => n.id === noteId);
    }
    
    getFilteredNotes() {
        let filtered = [...this.notes];
        
        // Filter by category
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(n => n.category === this.currentCategory);
        }
        
        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(n => 
                n.title.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query) ||
                n.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }
        
        // Filter by favorite
        if (this.filter === 'favorites') {
            filtered = filtered.filter(n => n.favorite);
        }
        
        return filtered;
    }
    
    getStats() {
        const total = this.notes.length;
        const pinned = this.notes.filter(n => n.pinned).length;
        const favorites = this.notes.filter(n => n.favorite).length;
        const categories = {};
        
        this.notes.forEach(note => {
            categories[note.category] = (categories[note.category] || 0) + 1;
        });
        
        const totalWords = this.notes.reduce((sum, n) => sum + n.wordCount, 0);
        
        return { total, pinned, favorites, categories, totalWords };
    }
    
    renderNotes() {
        const container = document.getElementById('notesGrid');
        if (!container) return;
        
        const filteredNotes = this.getFilteredNotes();
        const stats = this.getStats();
        
        this.updateStats(stats);
        
        if (filteredNotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 4rem;
                    color: var(--text-tertiary);
                ">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📝</div>
                    <h3>No notes found</h3>
                    <p style="margin-top: 0.5rem;">Create your first note to get started</p>
                    <button onclick="window.notesManager.openNoteEditor()" class="btn-primary" style="margin-top: 1rem;">
                        + Create Note
                    </button>
                </div>
            `;
            return;
        }
        
        if (this.viewMode === 'grid') {
            container.className = 'notes-grid';
            container.style.display = 'grid';
            container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
            container.style.gap = '1.5rem';
            container.innerHTML = filteredNotes.map(note => this.renderNoteCard(note)).join('');
        } else {
            container.className = 'notes-list';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '1rem';
            container.innerHTML = filteredNotes.map(note => this.renderNoteListItem(note)).join('');
        }
        
        // Add event listeners to note cards
        document.querySelectorAll('.note-card, .note-list-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.note-actions')) {
                    this.openNoteEditor(card.dataset.noteId);
                }
            });
        });
    }
    
    renderNoteCard(note) {
        const preview = note.content.substring(0, 150).replace(/[#*`_]/g, '');
        const date = new Date(note.updated).toLocaleDateString();
        const categoryColors = {
            general: '#6B7280',
            work: '#4F46E5',
            personal: '#8B5CF6',
            ideas: '#10b981',
            projects: '#f59e0b',
            journal: '#ec4899'
        };
        
        return `
            <div class="note-card" data-note-id="${note.id}" style="
                background: ${note.color || 'rgba(255,255,255,0.03)'};
                border: 1px solid rgba(139,92,246,0.2);
                border-radius: 20px;
                padding: 1.5rem;
                transition: all 0.3s;
                cursor: pointer;
                position: relative;
                ${note.pinned ? 'border-top: 3px solid #f59e0b;' : ''}
            ">
                ${note.pinned ? '<div style="position: absolute; top: 12px; right: 12px; font-size: 0.8rem;">📌</div>' : ''}
                
                <div class="note-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="note-category" style="
                            font-size: 0.7rem;
                            padding: 0.25rem 0.75rem;
                            background: ${categoryColors[note.category] || '#6B7280'}20;
                            border-radius: 50px;
                            color: ${categoryColors[note.category] || '#6B7280'};
                        ">${note.category}</span>
                        ${note.favorite ? '<span style="font-size: 0.8rem;">⭐</span>' : ''}
                    </div>
                    <div class="note-actions" style="display: flex; gap: 0.5rem; opacity: 0; transition: opacity 0.3s;">
                        <button onclick="event.stopPropagation(); window.notesManager.togglePin('${note.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;" title="Pin">📌</button>
                        <button onclick="event.stopPropagation(); window.notesManager.toggleFavorite('${note.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;" title="Favorite">⭐</button>
                        <button onclick="event.stopPropagation(); window.notesManager.duplicateNote('${note.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;" title="Duplicate">📋</button>
                        <button onclick="event.stopPropagation(); window.notesManager.deleteNote('${note.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;" title="Delete">🗑️</button>
                    </div>
                </div>
                
                <h3 class="note-title" style="font-size: 1.2rem; margin-bottom: 0.5rem;">${this.escapeHtml(note.title)}</h3>
                
                <div class="note-preview" style="
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    line-height: 1.5;
                    margin-bottom: 1rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                ">${this.escapeHtml(preview)}${note.content.length > 150 ? '...' : ''}</div>
                
                <div class="note-footer" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: var(--text-tertiary);">
                    <span>📅 ${date}</span>
                    <span>📊 ${note.wordCount} words</span>
                    ${note.tags.length > 0 ? `<span class="note-tags">🏷️ ${note.tags.slice(0, 2).join(', ')}${note.tags.length > 2 ? '...' : ''}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    renderNoteListItem(note) {
        const date = new Date(note.updated).toLocaleDateString();
        const categoryColors = {
            general: '#6B7280', work: '#4F46E5', personal: '#8B5CF6',
            ideas: '#10b981', projects: '#f59e0b', journal: '#ec4899'
        };
        
        return `
            <div class="note-list-item" data-note-id="${note.id}" style="
                background: ${note.color || 'rgba(255,255,255,0.03)'};
                border: 1px solid rgba(139,92,246,0.2);
                border-radius: 16px;
                padding: 1rem;
                transition: all 0.3s;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 1rem;
                ${note.pinned ? 'border-left: 3px solid #f59e0b;' : ''}
            ">
                <div style="font-size: 1.5rem;">📄</div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem;">
                        <h3 style="font-size: 1rem; margin: 0;">${this.escapeHtml(note.title)}</h3>
                        <span style="font-size: 0.7rem; padding: 0.125rem 0.5rem; background: ${categoryColors[note.category] || '#6B7280'}20; border-radius: 50px; color: ${categoryColors[note.category] || '#6B7280'};">${note.category}</span>
                        ${note.pinned ? '<span style="font-size: 0.7rem;">📌</span>' : ''}
                        ${note.favorite ? '<span style="font-size: 0.7rem;">⭐</span>' : ''}
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-tertiary);">Updated ${date} • ${note.wordCount} words</div>
                </div>
                <div class="note-actions" style="display: flex; gap: 0.5rem; opacity: 0; transition: opacity 0.3s;">
                    <button onclick="event.stopPropagation(); window.notesManager.togglePin('${note.id}')" style="background: none; border: none; cursor: pointer;">📌</button>
                    <button onclick="event.stopPropagation(); window.notesManager.toggleFavorite('${note.id}')" style="background: none; border: none; cursor: pointer;">⭐</button>
                    <button onclick="event.stopPropagation(); window.notesManager.deleteNote('${note.id}')" style="background: none; border: none; cursor: pointer;">🗑️</button>
                </div>
            </div>
        `;
    }
    
    updateStats(stats) {
        const statsElements = {
            totalNotes: document.getElementById('totalNotes'),
            pinnedNotes: document.getElementById('pinnedNotes'),
            favoriteNotes: document.getElementById('favoriteNotes'),
            totalWords: document.getElementById('totalWords')
        };
        
        if (statsElements.totalNotes) statsElements.totalNotes.textContent = stats.total;
        if (statsElements.pinnedNotes) statsElements.pinnedNotes.textContent = stats.pinned;
        if (statsElements.favoriteNotes) statsElements.favoriteNotes.textContent = stats.favorites;
        if (statsElements.totalWords) statsElements.totalWords.textContent = stats.totalWords;
    }
    
    openNoteEditor(noteId = null) {
        const note = noteId ? this.getNote(noteId) : null;
        
        if (window.noteEditor) {
            window.noteEditor.open(note);
        } else {
            const title = note ? note.title : '';
            const content = note ? note.content : '';
            const newTitle = prompt('Note title:', title);
            if (newTitle !== null) {
                if (note) {
                    this.updateNote(note.id, { title: newTitle, content: content });
                } else {
                    this.createNote(newTitle, '');
                }
            }
        }
    }
    
    searchNotes(query) {
        this.searchQuery = query;
        this.renderNotes();
    }
    
    filterByCategory(category) {
        this.currentCategory = category;
        this.renderNotes();
    }
    
    filterByType(filter) {
        this.filter = filter;
        this.renderNotes();
    }
    
    setViewMode(mode) {
        this.viewMode = mode;
        this.renderNotes();
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === mode) {
                btn.classList.add('active');
            }
        });
    }
    
    exportNotes(format = 'json') {
        const exportData = {
            notes: this.notes,
            exportDate: new Date().toISOString(),
            version: CONFIG.APP_VERSION,
            totalNotes: this.notes.length
        };
        
        let content, mimeType, extension;
        
        if (format === 'json') {
            content = JSON.stringify(exportData, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else if (format === 'markdown') {
            content = this.notes.map(n => `# ${n.title}\n\n${n.content}\n\n---\n\n`).join('');
            mimeType = 'text/markdown';
            extension = 'md';
        } else if (format === 'html') {
            content = this.notes.map(n => `
                <div class="exported-note" style="margin-bottom: 2rem; padding: 1rem; border: 1px solid #ddd;">
                    <h1>${this.escapeHtml(n.title)}</h1>
                    <div class="meta" style="color: #666; font-size: 0.8rem;">Created: ${new Date(n.createdAt).toLocaleString()} | Updated: ${new Date(n.updated).toLocaleString()}</div>
                    <div class="content" style="margin-top: 1rem;">${this.escapeHtml(n.content).replace(/\n/g, '<br>')}</div>
                </div>
            `).join('');
            mimeType = 'text/html';
            extension = 'html';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes_export_${new Date().toISOString().split('T')[0]}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (window.notify) {
            window.notify.success('Notes exported successfully');
        }
    }
    
    importNotes(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.notes && Array.isArray(data.notes)) {
                    const newNotes = data.notes.map(note => ({
                        ...note,
                        id: this.generateId(),
                        importedAt: new Date().toISOString()
                    }));
                    this.notes.push(...newNotes);
                    this.saveNotes();
                    this.renderNotes();
                    if (window.notify) {
                        window.notify.success(`Imported ${newNotes.length} notes`);
                    }
                } else {
                    throw new Error('Invalid format');
                }
            } catch (error) {
                if (window.notify) {
                    window.notify.error('Failed to import notes');
                }
            }
        };
        reader.readAsText(file);
    }
    
    startAutoBackup() {
        setInterval(() => {
            this.backupNotes();
        }, 24 * 60 * 60 * 1000); // Daily backup
    }
    
    backupNotes() {
        const backup = {
            notes: this.notes,
            backupDate: new Date().toISOString(),
            version: CONFIG.APP_VERSION
        };
        
        localStorage.setItem('notes_backup', JSON.stringify(backup));
    }
    
    restoreFromBackup() {
        const backup = localStorage.getItem('notes_backup');
        if (backup) {
            const data = JSON.parse(backup);
            if (confirm(`Restore ${data.notes.length} notes from backup dated ${new Date(data.backupDate).toLocaleString()}?`)) {
                this.notes = data.notes;
                this.saveNotes();
                this.renderNotes();
                if (window.notify) {
                    window.notify.success('Notes restored from backup');
                }
            }
        } else {
            if (window.notify) {
                window.notify.info('No backup found');
            }
        }
    }
    
    countWords(text) {
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    }
    
    generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    setupEventListeners() {
        const searchInput = document.getElementById('searchNotes');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchNotes(e.target.value);
                }, 300);
            });
        }
        
        const newNoteBtn = document.getElementById('newNoteBtn');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => this.openNoteEditor());
        }
        
        document.querySelectorAll('.category-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.filterByCategory(category);
                document.querySelectorAll('.category-filter').forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setViewMode(btn.dataset.view);
            });
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openNoteEditor();
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchNotes')?.focus();
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (window.noteEditor && window.noteEditor.currentNote) {
                    window.noteEditor.saveCurrentNote();
                }
            }
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize notes manager
const notesManager = new NotesManager();
window.notesManager = notesManager;