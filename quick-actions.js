/* ========================================
   ALAN VAULT - QUICK ACTIONS MANAGER
   Quick Action Buttons & Shortcuts
   ======================================== */

class QuickActionsManager {
    constructor() {
        this.actions = [];
        this.customActions = [];
        this.init();
    }
    
    init() {
        this.registerDefaultActions();
        this.loadCustomActions();
        this.renderActions();
        this.setupKeyboardShortcuts();
        this.setupEventListeners();
    }
    
    registerDefaultActions() {
        this.actions = [
            {
                id: 'upload_file',
                name: 'Upload File',
                icon: '📤',
                description: 'Upload files to your vault',
                color: '#4F46E5',
                shortcut: 'Ctrl+U',
                action: () => window.location.href = 'upload.html',
                category: 'files'
            },
            {
                id: 'new_note',
                name: 'New Note',
                icon: '📝',
                description: 'Create a new note',
                color: '#8B5CF6',
                shortcut: 'Ctrl+N',
                action: () => {
                    if (window.location.pathname.includes('notes.html')) {
                        document.querySelector('[onclick*="openModal(\'note\')"]')?.click();
                    } else {
                        window.location.href = 'notes.html?new=true';
                    }
                },
                category: 'notes'
            },
            {
                id: 'new_task',
                name: 'New Task',
                icon: '✅',
                description: 'Create a new task',
                color: '#10b981',
                shortcut: 'Ctrl+T',
                action: () => {
                    if (window.location.pathname.includes('tasks.html')) {
                        document.querySelector('[onclick*="openModal(\'task\')"]')?.click();
                    } else {
                        window.location.href = 'tasks.html?new=true';
                    }
                },
                category: 'tasks'
            },
            {
                id: 'add_bookmark',
                name: 'Add Bookmark',
                icon: '🔗',
                description: 'Save a new bookmark',
                color: '#f59e0b',
                shortcut: 'Ctrl+B',
                action: () => {
                    if (window.location.pathname.includes('bookmarks.html')) {
                        document.querySelector('[onclick*="openModal(\'bookmark\')"]')?.click();
                    } else {
                        window.location.href = 'bookmarks.html?new=true';
                    }
                },
                category: 'bookmarks'
            },
            {
                id: 'search',
                name: 'Search',
                icon: '🔍',
                description: 'Search everything',
                color: '#ec4899',
                shortcut: 'Ctrl+K',
                action: () => {
                    const searchInput = document.querySelector('.search-box, #globalSearch');
                    if (searchInput) searchInput.focus();
                },
                category: 'general'
            },
            {
                id: 'refresh',
                name: 'Refresh',
                icon: '🔄',
                description: 'Refresh dashboard',
                color: '#06b6d4',
                shortcut: 'Ctrl+R',
                action: () => {
                    window.location.reload();
                },
                category: 'general'
            },
            {
                id: 'new_folder',
                name: 'New Folder',
                icon: '📁',
                description: 'Create a new folder',
                color: '#3b82f6',
                shortcut: 'Ctrl+F',
                action: () => {
                    const folderName = prompt('Enter folder name:');
                    if (folderName && folderName.trim()) {
                        document.dispatchEvent(new CustomEvent('create:folder', { 
                            detail: { name: folderName.trim() }
                        }));
                    }
                },
                category: 'files'
            },
            {
                id: 'settings',
                name: 'Settings',
                icon: '⚙️',
                description: 'Open settings',
                color: '#64748b',
                shortcut: 'Ctrl+S',
                action: () => window.location.href = 'settings.html',
                category: 'general'
            }
        ];
    }
    
    loadCustomActions() {
        const saved = localStorage.getItem('custom_quick_actions');
        if (saved) {
            this.customActions = JSON.parse(saved);
        }
    }
    
    saveCustomActions() {
        localStorage.setItem('custom_quick_actions', JSON.stringify(this.customActions));
    }
    
    renderActions() {
        const container = document.getElementById('quickActions');
        if (!container) return;
        
        const allActions = [...this.actions, ...this.customActions];
        
        container.innerHTML = allActions.map(action => `
            <div class="quick-action-card" data-action-id="${action.id}" onclick="window.quickActions.executeAction('${action.id}')" style="
                background: linear-gradient(135deg, ${action.color}20, ${action.color}10);
                border: 1px solid ${action.color}30;
                border-radius: 16px;
                padding: 1rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                position: relative;
                overflow: hidden;
            ">
                <div class="action-icon" style="font-size: 2rem; margin-bottom: 0.5rem;">${action.icon}</div>
                <div class="action-name" style="font-weight: 500; margin-bottom: 0.25rem;">${action.name}</div>
                <div class="action-description" style="font-size: 0.7rem; color: var(--text-tertiary);">${action.description}</div>
                ${action.shortcut ? `<div class="action-shortcut" style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    font-size: 0.6rem;
                    padding: 2px 6px;
                    background: rgba(0,0,0,0.5);
                    border-radius: 4px;
                    color: var(--text-tertiary);
                ">${action.shortcut}</div>` : ''}
            </div>
        `).join('');
        
        // Add hover effects
        document.querySelectorAll('.quick-action-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = 'var(--shadow-md)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });
        });
    }
    
    executeAction(actionId) {
        const action = [...this.actions, ...this.customActions].find(a => a.id === actionId);
        
        if (action && action.action) {
            // Track action
            this.trackAction(actionId);
            
            // Execute action
            action.action();
        } else {
            console.warn(`Action not found: ${actionId}`);
        }
    }
    
    trackAction(actionId) {
        // Send to analytics
        if (window.analytics) {
            window.analytics.trackEvent('quick_action', 'click', actionId);
        }
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('quick-action:executed', { 
            detail: { actionId }
        }));
    }
    
    addCustomAction(action) {
        const newAction = {
            id: `custom_${Date.now()}`,
            ...action,
            custom: true
        };
        
        this.customActions.push(newAction);
        this.saveCustomActions();
        this.renderActions();
        
        return newAction.id;
    }
    
    removeCustomAction(actionId) {
        this.customActions = this.customActions.filter(a => a.id !== actionId);
        this.saveCustomActions();
        this.renderActions();
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check for Ctrl/Cmd + key
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();
                
                const shortcuts = {
                    'u': 'upload_file',
                    'n': 'new_note',
                    't': 'new_task',
                    'b': 'add_bookmark',
                    'k': 'search',
                    'r': 'refresh',
                    'f': 'new_folder',
                    's': 'settings'
                };
                
                const actionId = shortcuts[key];
                if (actionId) {
                    e.preventDefault();
                    this.executeAction(actionId);
                }
            }
        });
    }
    
    setupEventListeners() {
        // Listen for theme changes to update colors
        document.addEventListener('theme:changed', () => {
            this.renderActions();
        });
        
        // Listen for custom action triggers
        document.addEventListener('quick-action:trigger', (e) => {
            this.executeAction(e.detail.actionId);
        });
    }
    
    getActionsByCategory(category) {
        return [...this.actions, ...this.customActions].filter(a => a.category === category);
    }
    
    getFavoriteActions() {
        const favorites = JSON.parse(localStorage.getItem('favorite_quick_actions') || '[]');
        return [...this.actions, ...this.customActions].filter(a => favorites.includes(a.id));
    }
    
    toggleFavorite(actionId) {
        let favorites = JSON.parse(localStorage.getItem('favorite_quick_actions') || '[]');
        
        if (favorites.includes(actionId)) {
            favorites = favorites.filter(id => id !== actionId);
        } else {
            favorites.push(actionId);
        }
        
        localStorage.setItem('favorite_quick_actions', JSON.stringify(favorites));
        this.renderActions();
    }
    
    showQuickActionMenu(x, y) {
        const menu = document.createElement('div');
        menu.className = 'quick-actions-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${y}px;
            left: ${x}px;
            background: #1a1a2e;
            border: 1px solid rgba(139,92,246,0.3);
            border-radius: 12px;
            padding: 0.5rem;
            z-index: 10000;
            min-width: 200px;
            box-shadow: var(--shadow-lg);
        `;
        
        const allActions = [...this.actions, ...this.customActions];
        menu.innerHTML = allActions.map(action => `
            <div class="menu-item" data-action="${action.id}" style="
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 1rem;
                cursor: pointer;
                transition: all 0.3s;
                border-radius: 8px;
            ">
                <span>${action.icon}</span>
                <span>${action.name}</span>
                <span style="font-size: 0.7rem; color: var(--text-tertiary); margin-left: auto;">${action.shortcut || ''}</span>
            </div>
        `).join('');
        
        document.body.appendChild(menu);
        
        // Add hover effects
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(139,92,246,0.1)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            item.addEventListener('click', () => {
                const actionId = item.dataset.action;
                this.executeAction(actionId);
                menu.remove();
            });
        });
        
        // Close menu on click outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }
    
    createFloatingActionButton() {
        const fab = document.createElement('div');
        fab.className = 'floating-action-button';
        fab.innerHTML = '✨';
        fab.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 30px;
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #4F46E5, #8B5CF6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            cursor: pointer;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            transition: all 0.3s;
        `;
        
        fab.addEventListener('click', (e) => {
            const rect = fab.getBoundingClientRect();
            this.showQuickActionMenu(rect.left, rect.top - 200);
        });
        
        fab.addEventListener('mouseenter', () => {
            fab.style.transform = 'scale(1.1)';
        });
        
        fab.addEventListener('mouseleave', () => {
            fab.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(fab);
    }
    
    destroy() {
        document.querySelectorAll('.quick-action-card').forEach(card => card.remove());
        document.querySelector('.floating-action-button')?.remove();
    }
}

// Initialize quick actions manager
const quickActions = new QuickActionsManager();
window.quickActions = quickActions;