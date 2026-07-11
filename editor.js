/* ========================================
   ALAN VAULT - RICH TEXT EDITOR
   WYSIWYG Editor for Notes
   ======================================== */

class NoteEditor {
    constructor() {
        this.currentNote = null;
        this.isDirty = false;
        this.autoSaveInterval = null;
        this.editorContent = '';
        this.init();
    }
    
    init() {
        this.createEditorModal();
        this.setupEventListeners();
        this.startAutoSave();
    }
    
    createEditorModal() {
        if (document.getElementById('noteEditorModal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'noteEditorModal';
        modal.className = 'editor-modal';
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
            flex-direction: column;
            animation: fadeIn 0.2s ease;
        `;
        
        modal.innerHTML = `
            <div class="editor-container" style="
                display: flex;
                flex-direction: column;
                height: 100vh;
                max-width: 1200px;
                margin: 0 auto;
                width: 100%;
                background: #1a1a2e;
            ">
                <div class="editor-toolbar" style="
                    display: flex;
                    gap: 0.5rem;
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    flex-wrap: wrap;
                    background: rgba(26,26,46,0.95);
                ">
                    <div class="toolbar-group" style="display: flex; gap: 0.25rem; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 0.5rem;">
                        <button class="toolbar-btn" data-action="bold" title="Bold (Ctrl+B)"><b>B</b></button>
                        <button class="toolbar-btn" data-action="italic" title="Italic (Ctrl+I)"><i>I</i></button>
                        <button class="toolbar-btn" data-action="underline" title="Underline (Ctrl+U)"><u>U</u></button>
                        <button class="toolbar-btn" data-action="strike" title="Strikethrough"><s>S</s></button>
                    </div>
                    <div class="toolbar-group" style="display: flex; gap: 0.25rem; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 0.5rem;">
                        <button class="toolbar-btn" data-action="h1" title="Heading 1">H1</button>
                        <button class="toolbar-btn" data-action="h2" title="Heading 2">H2</button>
                        <button class="toolbar-btn" data-action="h3" title="Heading 3">H3</button>
                    </div>
                    <div class="toolbar-group" style="display: flex; gap: 0.25rem; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 0.5rem;">
                        <button class="toolbar-btn" data-action="ul" title="Bullet List">•</button>
                        <button class="toolbar-btn" data-action="ol" title="Numbered List">1.</button>
                        <button class="toolbar-btn" data-action="task" title="Task List">☐</button>
                    </div>
                    <div class="toolbar-group" style="display: flex; gap: 0.25rem; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 0.5rem;">
                        <button class="toolbar-btn" data-action="link" title="Insert Link">🔗</button>
                        <button class="toolbar-btn" data-action="image" title="Insert Image">🖼️</button>
                        <button class="toolbar-btn" data-action="code" title="Code Block">&lt;/&gt;</button>
                        <button class="toolbar-btn" data-action="quote" title="Quote">“</button>
                    </div>
                    <div class="toolbar-group" style="display: flex; gap: 0.25rem;">
                        <button class="toolbar-btn" data-action="undo" title="Undo (Ctrl+Z)">↩️</button>
                        <button class="toolbar-btn" data-action="redo" title="Redo (Ctrl+Y)">↪️</button>
                    </div>
                    <div style="flex: 1;"></div>
                    <div class="editor-status" style="display: flex; gap: 1rem; align-items: center; font-size: 0.75rem; color: #71717a;">
                        <span id="wordCount">0 words</span>
                        <span id="charCount">0 characters</span>
                        <span id="saveStatus">Saved</span>
                    </div>
                    <button class="editor-close" style="
                        background: none;
                        border: none;
                        color: #a1a1aa;
                        font-size: 1.2rem;
                        cursor: pointer;
                        padding: 0.25rem 0.5rem;
                    ">✕</button>
                </div>
                
                <div class="editor-header" style="padding: 1rem;">
                    <input type="text" id="noteTitle" class="note-title-input" placeholder="Note title..." style="
                        width: 100%;
                        font-size: 2rem;
                        font-weight: 600;
                        background: transparent;
                        border: none;
                        color: white;
                        outline: none;
                        font-family: inherit;
                    ">
                </div>
                
                <div class="editor-content" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                ">
                    <div id="noteContent" class="note-content-editor" contenteditable="true" style="
                        min-height: 100%;
                        outline: none;
                        line-height: 1.6;
                        font-size: 1rem;
                    "></div>
                </div>
                
                <div class="editor-footer" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-top: 1px solid rgba(255,255,255,0.05);
                ">
                    <div class="editor-meta" style="font-size: 0.75rem; color: #71717a;">
                        <span id="createdDate"></span>
                        <span id="updatedDate"></span>
                    </div>
                    <div class="editor-actions" style="display: flex; gap: 1rem;">
                        <select id="noteCategory" class="category-select" style="
                            padding: 0.5rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                        ">
                            <option value="general">General</option>
                            <option value="work">Work</option>
                            <option value="personal">Personal</option>
                            <option value="ideas">Ideas</option>
                            <option value="projects">Projects</option>
                            <option value="journal">Journal</option>
                        </select>
                        <input type="text" id="noteTags" placeholder="Tags (comma separated)" style="
                            padding: 0.5rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                            width: 200px;
                        ">
                        <button id="saveNoteBtn" class="btn-primary" style="padding: 0.5rem 1.5rem;">Save</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
        this.editor = document.getElementById('noteContent');
        this.titleInput = document.getElementById('noteTitle');
        
        this.setupToolbarButtons();
        this.setupModalEvents();
    }
    
    setupToolbarButtons() {
        const buttons = this.modal.querySelectorAll('.toolbar-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.executeCommand(action);
            });
        });
    }
    
    executeCommand(command) {
        document.execCommand('styleWithCSS', false, true);
        
        switch(command) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                break;
            case 'strike':
                document.execCommand('strikeThrough', false, null);
                break;
            case 'h1':
                document.execCommand('formatBlock', false, '<h1>');
                break;
            case 'h2':
                document.execCommand('formatBlock', false, '<h2>');
                break;
            case 'h3':
                document.execCommand('formatBlock', false, '<h3>');
                break;
            case 'ul':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'ol':
                document.execCommand('insertOrderedList', false, null);
                break;
            case 'task':
                this.insertTaskCheckbox();
                break;
            case 'link':
                this.insertLink();
                break;
            case 'image':
                this.insertImage();
                break;
            case 'code':
                document.execCommand('formatBlock', false, '<pre><code>');
                break;
            case 'quote':
                document.execCommand('formatBlock', false, '<blockquote>');
                break;
            case 'undo':
                document.execCommand('undo', false, null);
                break;
            case 'redo':
                document.execCommand('redo', false, null);
                break;
        }
        
        this.editor.focus();
        this.updateStats();
        this.markDirty();
    }
    
    insertTaskCheckbox() {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.marginRight = '8px';
        range.insertNode(checkbox);
        range.insertNode(document.createTextNode(' '));
        range.collapse(false);
    }
    
    insertLink() {
        const url = prompt('Enter URL:', 'https://');
        if (url) {
            document.execCommand('createLink', false, url);
        }
    }
    
    insertImage() {
        const url = prompt('Enter image URL:', 'https://');
        if (url) {
            document.execCommand('insertImage', false, url);
        }
    }
    
    setupModalEvents() {
        const closeBtn = this.modal.querySelector('.editor-close');
        closeBtn.addEventListener('click', () => this.close());
        
        const saveBtn = document.getElementById('saveNoteBtn');
        saveBtn.addEventListener('click', () => this.saveCurrentNote());
        
        this.editor.addEventListener('input', () => {
            this.updateStats();
            this.markDirty();
        });
        
        this.titleInput.addEventListener('input', () => this.markDirty());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.handleEscape();
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.modal.style.display === 'flex') {
                e.preventDefault();
                this.saveCurrentNote();
            }
        });
        
        // Handle paste to clean formatting
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }
    
    open(note = null) {
        this.currentNote = note;
        this.isDirty = false;
        
        if (note) {
            this.titleInput.value = note.title;
            this.editor.innerHTML = this.formatContentForEditor(note.content);
            document.getElementById('noteCategory').value = note.category || 'general';
            document.getElementById('noteTags').value = (note.tags || []).join(', ');
            
            const createdDate = document.getElementById('createdDate');
            const updatedDate = document.getElementById('updatedDate');
            if (createdDate) createdDate.textContent = `Created: ${new Date(note.createdAt).toLocaleString()}`;
            if (updatedDate) updatedDate.textContent = `Updated: ${new Date(note.updated).toLocaleString()}`;
        } else {
            this.titleInput.value = '';
            this.editor.innerHTML = '';
            document.getElementById('noteCategory').value = 'general';
            document.getElementById('noteTags').value = '';
        }
        
        this.updateStats();
        this.modal.style.display = 'flex';
        this.editor.focus();
        
        // Update save status
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) saveStatus.textContent = 'Editing...';
    }
    
    close() {
        if (this.isDirty) {
            const shouldSave = confirm('You have unsaved changes. Save before closing?');
            if (shouldSave) {
                this.saveCurrentNote();
            }
        }
        this.modal.style.display = 'none';
        this.currentNote = null;
    }
    
    handleEscape() {
        if (this.isDirty) {
            const shouldSave = confirm('You have unsaved changes. Save before closing?');
            if (shouldSave) {
                this.saveCurrentNote();
            }
        }
        this.modal.style.display = 'none';
    }
    
    saveCurrentNote() {
        const title = this.titleInput.value.trim() || 'Untitled';
        const content = this.getContentFromEditor();
        const category = document.getElementById('noteCategory').value;
        const tags = document.getElementById('noteTags').value.split(',').map(t => t.trim()).filter(t => t);
        
        if (this.currentNote) {
            notesManager.updateNote(this.currentNote.id, {
                title: title,
                content: content,
                category: category,
                tags: tags,
                updated: new Date().toISOString()
            });
        } else {
            this.currentNote = notesManager.createNote(title, content, category);
            if (tags.length) {
                tags.forEach(tag => notesManager.addTag(this.currentNote.id, tag));
            }
        }
        
        this.isDirty = false;
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
            saveStatus.textContent = 'Saved!';
            setTimeout(() => {
                if (saveStatus) saveStatus.textContent = 'Saved';
            }, 2000);
        }
        
        if (window.notify) {
            window.notify.success('Note saved');
        }
        
        // Update dates in UI
        const updatedDate = document.getElementById('updatedDate');
        if (updatedDate && this.currentNote) {
            updatedDate.textContent = `Updated: ${new Date().toLocaleString()}`;
        }
    }
    
    formatContentForEditor(content) {
        // Convert markdown-like syntax to HTML
        let html = content;
        
        // Convert headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Convert bold and italic
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Convert lists
        html = html.replace(/^\s*-\s(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Convert line breaks
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }
    
    getContentFromEditor() {
        let text = this.editor.innerText || '';
        
        // Convert HTML to plain text for storage
        // This is simplified; in production you'd want proper HTML to Markdown conversion
        return text;
    }
    
    updateStats() {
        const text = this.editor.innerText || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = text.length;
        
        const wordSpan = document.getElementById('wordCount');
        const charSpan = document.getElementById('charCount');
        
        if (wordSpan) wordSpan.textContent = `${words} words`;
        if (charSpan) charSpan.textContent = `${chars} characters`;
    }
    
    markDirty() {
        this.isDirty = true;
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) saveStatus.textContent = 'Unsaved changes';
    }
    
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.modal.style.display === 'flex' && this.isDirty) {
                this.saveCurrentNote();
            }
        }, 30000); // Auto-save every 30 seconds
    }
    
    setupEventListeners() {
        document.addEventListener('notes:updated', () => {
            if (this.currentNote) {
                const updatedNote = notesManager.getNote(this.currentNote.id);
                if (updatedNote) {
                    this.currentNote = updatedNote;
                }
            }
        });
    }
}

// Initialize note editor
const noteEditor = new NoteEditor();
window.noteEditor = noteEditor;