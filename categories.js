/* ========================================
   ALAN VAULT - CATEGORY MANAGEMENT
   Note Categories & Organization
   ======================================== */

class CategoryManager {
    constructor() {
        this.categories = [
            { id: 'general', name: 'General', icon: '📄', color: '#6B7280', count: 0 },
            { id: 'work', name: 'Work', icon: '💼', color: '#4F46E5', count: 0 },
            { id: 'personal', name: 'Personal', icon: '👤', color: '#8B5CF6', count: 0 },
            { id: 'ideas', name: 'Ideas', icon: '💡', color: '#10b981', count: 0 },
            { id: 'projects', name: 'Projects', icon: '🚀', color: '#f59e0b', count: 0 },
            { id: 'journal', name: 'Journal', icon: '📔', color: '#ec4899', count: 0 },
            { id: 'learning', name: 'Learning', icon: '📚', color: '#06b6d4', count: 0 },
            { id: 'recipes', name: 'Recipes', icon: '🍳', color: '#ef4444', count: 0 },
            { id: 'finance', name: 'Finance', icon: '💰', color: '#10b981', count: 0 },
            { id: 'health', name: 'Health', icon: '💪', color: '#14b8a6', count: 0 }
        ];
        this.customCategories = [];
        this.init();
    }
    
    init() {
        this.loadCustomCategories();
        this.updateCounts();
        this.renderCategories();
        this.setupEventListeners();
    }
    
    loadCustomCategories() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const catKey = `categories_${user.id}`;
        const saved = localStorage.getItem(catKey);
        
        if (saved) {
            this.customCategories = JSON.parse(saved);
        }
    }
    
    saveCustomCategories() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const catKey = `categories_${user.id}`;
        localStorage.setItem(catKey, JSON.stringify(this.customCategories));
    }
    
    getAllCategories() {
        return [...this.categories, ...this.customCategories];
    }
    
    updateCounts() {
        const notes = window.notesManager?.notes || [];
        
        // Reset counts
        this.categories.forEach(cat => cat.count = 0);
        this.customCategories.forEach(cat => cat.count = 0);
        
        // Count notes per category
        notes.forEach(note => {
            const category = this.findCategory(note.category);
            if (category) {
                category.count++;
            }
        });
    }
    
    findCategory(categoryId) {
        return this.getAllCategories().find(c => c.id === categoryId);
    }
    
    addCategory(name, icon = '📁', color = '#8B5CF6') {
        const id = name.toLowerCase().replace(/\s+/g, '_');
        
        // Check if category already exists
        if (this.findCategory(id)) {
            if (window.notify) window.notify.error('Category already exists');
            return null;
        }
        
        const newCategory = {
            id: id,
            name: name,
            icon: icon,
            color: color,
            count: 0,
            isCustom: true,
            createdAt: new Date().toISOString()
        };
        
        this.customCategories.push(newCategory);
        this.saveCustomCategories();
        this.renderCategories();
        
        if (window.notify) window.notify.success(`Category "${name}" created`);
        
        return newCategory;
    }
    
    updateCategory(categoryId, updates) {
        let category = this.categories.find(c => c.id === categoryId);
        let isCustom = false;
        
        if (!category) {
            category = this.customCategories.find(c => c.id === categoryId);
            isCustom = true;
        }
        
        if (!category) return false;
        
        Object.assign(category, updates);
        
        if (isCustom) {
            this.saveCustomCategories();
        }
        
        this.renderCategories();
        
        if (window.notify) window.notify.success('Category updated');
        
        return true;
    }
    
    deleteCategory(categoryId) {
        // Check if category is default
        if (this.categories.some(c => c.id === categoryId)) {
            if (window.notify) window.notify.error('Cannot delete default category');
            return false;
        }
        
        const index = this.customCategories.findIndex(c => c.id === categoryId);
        if (index === -1) return false;
        
        const category = this.customCategories[index];
        
        // Move notes from this category to General
        if (window.notesManager) {
            window.notesManager.notes.forEach(note => {
                if (note.category === categoryId) {
                    window.notesManager.updateNote(note.id, { category: 'general' });
                }
            });
        }
        
        this.customCategories.splice(index, 1);
        this.saveCustomCategories();
        this.renderCategories();
        
        if (window.notify) window.notify.success(`Category "${category.name}" deleted`);
        
        return true;
    }
    
    renderCategories() {
        const container = document.getElementById('categoriesList');
        if (!container) return;
        
        const allCategories = this.getAllCategories();
        
        container.innerHTML = `
            <div class="category-item ${window.notesManager?.currentCategory === 'all' ? 'active' : ''}" 
                 data-category="all" 
                 onclick="window.categoryManager.selectCategory('all')">
                <span class="category-icon">📋</span>
                <span class="category-name">All Notes</span>
                <span class="category-count">${window.notesManager?.notes.length || 0}</span>
            </div>
            <div class="category-divider"></div>
            ${allCategories.map(cat => `
                <div class="category-item ${window.notesManager?.currentCategory === cat.id ? 'active' : ''}" 
                     data-category="${cat.id}" 
                     onclick="window.categoryManager.selectCategory('${cat.id}')">
                    <span class="category-icon">${cat.icon}</span>
                    <span class="category-name">${this.escapeHtml(cat.name)}</span>
                    <span class="category-count">${cat.count}</span>
                    ${cat.isCustom ? `
                        <button class="category-edit" onclick="event.stopPropagation(); window.categoryManager.editCategory('${cat.id}')">✏️</button>
                        <button class="category-delete" onclick="event.stopPropagation(); window.categoryManager.deleteCategory('${cat.id}')">🗑️</button>
                    ` : ''}
                </div>
            `).join('')}
        `;
        
        // Add category button
        const addButton = document.createElement('div');
        addButton.className = 'add-category-btn';
        addButton.innerHTML = `
            <button onclick="window.categoryManager.showAddCategoryModal()" style="
                width: 100%;
                padding: 0.75rem;
                background: rgba(139,92,246,0.2);
                border: 1px dashed rgba(139,92,246,0.5);
                border-radius: 12px;
                color: #8B5CF6;
                cursor: pointer;
                margin-top: 1rem;
            ">+ New Category</button>
        `;
        container.appendChild(addButton);
    }
    
    selectCategory(categoryId) {
        if (window.notesManager) {
            window.notesManager.filterByCategory(categoryId);
        }
        
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.category === categoryId) {
                item.classList.add('active');
            }
        });
    }
    
    showAddCategoryModal() {
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
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 400px;">
                <h3 style="margin-bottom: 1rem;">Create New Category</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Category Name</label>
                    <input type="text" id="catName" placeholder="e.g., Travel" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Icon (emoji)</label>
                    <input type="text" id="catIcon" placeholder="📁" maxlength="2" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Color</label>
                    <input type="color" id="catColor" value="#8B5CF6" style="
                        width: 100%;
                        padding: 0.5rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                    ">
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button onclick="this.closest('div').parentElement.remove()" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="window.categoryManager.createCategoryFromModal(this)" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Create</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    createCategoryFromModal(btn) {
        const modal = btn.closest('div').parentElement;
        const name = modal.querySelector('#catName').value.trim();
        const icon = modal.querySelector('#catIcon').value || '📁';
        const color = modal.querySelector('#catColor').value;
        
        if (!name) {
            if (window.notify) window.notify.error('Category name is required');
            return;
        }
        
        this.addCategory(name, icon, color);
        modal.remove();
    }
    
    editCategory(categoryId) {
        const category = this.findCategory(categoryId);
        if (!category) return;
        
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
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 400px;">
                <h3 style="margin-bottom: 1rem;">Edit Category</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Category Name</label>
                    <input type="text" id="catName" value="${this.escapeHtml(category.name)}" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Icon (emoji)</label>
                    <input type="text" id="catIcon" value="${category.icon}" maxlength="2" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Color</label>
                    <input type="color" id="catColor" value="${category.color}" style="
                        width: 100%;
                        padding: 0.5rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                    ">
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button onclick="this.closest('div').parentElement.remove()" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="window.categoryManager.updateCategoryFromModal('${categoryId}', this)" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    updateCategoryFromModal(categoryId, btn) {
        const modal = btn.closest('div').parentElement;
        const name = modal.querySelector('#catName').value.trim();
        const icon = modal.querySelector('#catIcon').value || '📁';
        const color = modal.querySelector('#catColor').value;
        
        if (!name) {
            if (window.notify) window.notify.error('Category name is required');
            return;
        }
        
        this.updateCategory(categoryId, { name, icon, color });
        modal.remove();
    }
    
    getCategoryStyle(categoryId) {
        const category = this.findCategory(categoryId);
        if (category) {
            return {
                background: `${category.color}20`,
                color: category.color,
                icon: category.icon
            };
        }
        return { background: '#6B728020', color: '#6B7280', icon: '📄' };
    }
    
    getCategoryOptions() {
        return this.getAllCategories().map(cat => ({
            value: cat.id,
            label: cat.name,
            icon: cat.icon
        }));
    }
    
    setupEventListeners() {
        document.addEventListener('notes:updated', () => {
            this.updateCounts();
            this.renderCategories();
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize category manager
const categoryManager = new CategoryManager();
window.categoryManager = categoryManager;