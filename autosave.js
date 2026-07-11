/* ========================================
   ALAN VAULT - AUTO-SAVE SYSTEM
   Automatic Note Saving & Recovery
   ======================================== */

class AutoSaveManager {
    constructor() {
        this.drafts = {};
        this.saveInterval = 30000; // 30 seconds
        this.recoveryInterval = null;
        this.init();
    }
    
    init() {
        this.loadDrafts();
        this.setupEventListeners();
        this.startAutoSave();
        this.checkForRecovery();
    }
    
    loadDrafts() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const draftKey = `drafts_${user.id}`;
        const saved = localStorage.getItem(draftKey);
        
        if (saved) {
            this.drafts = JSON.parse(saved);
        }
    }
    
    saveDrafts() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const draftKey = `drafts_${user.id}`;
        localStorage.setItem(draftKey, JSON.stringify(this.drafts));
    }
    
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.autoSaveCurrentNote();
        }, this.saveInterval);
    }
    
    autoSaveCurrentNote() {
        if (window.noteEditor && window.noteEditor.modal && 
            window.noteEditor.modal.style.display === 'flex' && 
            window.noteEditor.isDirty) {
            
            const title = window.noteEditor.titleInput.value;
            const content = window.noteEditor.getContentFromEditor();
            const category = document.getElementById('noteCategory')?.value;
            const tags = document.getElementById('noteTags')?.value;
            
            const draftId = window.noteEditor.currentNote?.id || 'new_note';
            
            this.drafts[draftId] = {
                title: title,
                content: content,
                category: category,
                tags: tags,
                savedAt: new Date().toISOString(),
                isNew: !window.noteEditor.currentNote
            };
            
            this.saveDrafts();
            this.updateSaveStatus('Auto-saved');
        }
    }
    
    updateSaveStatus(message) {
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
            saveStatus.textContent = message;
            setTimeout(() => {
                if (saveStatus.textContent === message) {
                    saveStatus.textContent = 'Saved';
                }
            }, 2000);
        }
    }
    
    checkForRecovery() {
        const unsavedDrafts = Object.keys(this.drafts);
        
        if (unsavedDrafts.length > 0) {
            this.showRecoveryDialog();
        }
    }
    
    showRecoveryDialog() {
        const draftCount = Object.keys(this.drafts).length;
        
        const modal = document.createElement('div');
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
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; max-width: 500px;">
                <div style="font-size: 3rem; text-align: center; margin-bottom: 1rem;">💾</div>
                <h3 style="text-align: center; margin-bottom: 0.5rem;">Recover Unsaved Notes?</h3>
                <p style="color: #a1a1aa; text-align: center; margin-bottom: 1rem;">
                    You have ${draftCount} unsaved ${draftCount === 1 ? 'note' : 'notes'} from your last session.
                </p>
                <div style="display: flex; gap: 1rem;">
                    <button id="recoverBtn" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Recover</button>
                    <button id="discardBtn" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: transparent;
                        border: 1px solid rgba(239,68,68,0.5);
                        border-radius: 8px;
                        color: #ef4444;
                        cursor: pointer;
                    ">Discard</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('recoverBtn').onclick = () => {
            this.recoverDrafts();
            modal.remove();
        };
        
        document.getElementById('discardBtn').onclick = () => {
            this.clearDrafts();
            modal.remove();
        };
    }
    
    recoverDrafts() {
        for (const [draftId, draft] of Object.entries(this.drafts)) {
            if (draft.isNew) {
                // Create new note from draft
                const newNote = notesManager.createNote(draft.title, draft.content, draft.category);
                if (draft.tags) {
                    const tags = draft.tags.split(',').map(t => t.trim()).filter(t => t);
                    tags.forEach(tag => notesManager.addTag(newNote.id, tag));
                }
            } else {
                // Update existing note
                notesManager.updateNote(draftId, {
                    title: draft.title,
                    content: draft.content,
                    category: draft.category
                });
                
                if (draft.tags) {
                    const tags = draft.tags.split(',').map(t => t.trim()).filter(t => t);
                    const note = notesManager.getNote(draftId);
                    if (note) {
                        note.tags = tags;
                        notesManager.saveNotes();
                    }
                }
            }
        }
        
        this.clearDrafts();
        
        if (window.notify) {
            window.notify.success('Notes recovered successfully');
        }
    }
    
    clearDrafts() {
        this.drafts = {};
        this.saveDrafts();
    }
    
    saveDraft(noteId, title, content, category, tags) {
        this.drafts[noteId || 'new_note'] = {
            title: title,
            content: content,
            category: category,
            tags: tags,
            savedAt: new Date().toISOString(),
            isNew: !noteId
        };
        this.saveDrafts();
    }
    
    clearDraft(noteId) {
        delete this.drafts[noteId];
        this.saveDrafts();
    }
    
    hasDraft(noteId) {
        return !!this.drafts[noteId];
    }
    
    getDraft(noteId) {
        return this.drafts[noteId];
    }
    
    setupEventListeners() {
        window.addEventListener('beforeunload', (e) => {
            if (window.noteEditor && window.noteEditor.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
        
        document.addEventListener('note:saved', () => {
            if (window.noteEditor && window.noteEditor.currentNote) {
                this.clearDraft(window.noteEditor.currentNote.id);
            }
        });
    }
    
    setupRecoveryInterval() {
        this.recoveryInterval = setInterval(() => {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            const draftKey = `drafts_${user.id}`;
            const drafts = localStorage.getItem(draftKey);
            
            if (drafts) {
                const parsed = JSON.parse(drafts);
                // Clean up old drafts (older than 7 days)
                const now = Date.now();
                let changed = false;
                
                for (const [key, draft] of Object.entries(parsed)) {
                    const savedAt = new Date(draft.savedAt).getTime();
                    if (now - savedAt > 7 * 24 * 60 * 60 * 1000) {
                        delete parsed[key];
                        changed = true;
                    }
                }
                
                if (changed) {
                    localStorage.setItem(draftKey, JSON.stringify(parsed));
                    this.drafts = parsed;
                }
            }
        }, 24 * 60 * 60 * 1000); // Check daily
    }
}

// Initialize auto-save manager
const autoSaveManager = new AutoSaveManager();
window.autoSaveManager = autoSaveManager;