/* ========================================
   ALAN VAULT - TASK MANAGEMENT
   Core Tasks CRUD Operations
   ======================================== */

class TasksManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentSort = 'date';
        this.init();
    }
    
    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.renderTasks();
        this.setupKeyboardShortcuts();
        this.startAutoReminders();
    }
    
    loadTasks() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"tasks":[]}');
        this.tasks = vault.tasks || [];
        this.sortTasks();
    }
    
    saveTasks() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        vault.tasks = this.tasks;
        localStorage.setItem(vaultKey, JSON.stringify(vault));
        
        document.dispatchEvent(new CustomEvent('tasks:updated', {
            detail: { count: this.tasks.length }
        }));
    }
    
    sortTasks() {
        const sortFunctions = {
            date: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            dueDate: (a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            },
            priority: (a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            },
            title: (a, b) => a.title.localeCompare(b.title)
        };
        
        this.tasks.sort(sortFunctions[this.currentSort] || sortFunctions.date);
    }
    
    createTask(taskData) {
        const newTask = {
            id: this.generateId(),
            title: taskData.title || 'Untitled Task',
            description: taskData.description || '',
            priority: taskData.priority || 'medium',
            status: taskData.status || 'pending',
            category: taskData.category || 'general',
            dueDate: taskData.dueDate || null,
            reminder: taskData.reminder || null,
            tags: taskData.tags || [],
            subtasks: taskData.subtasks || [],
            attachments: taskData.attachments || [],
            comments: [],
            completedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completed: false,
            starred: false,
            repeat: taskData.repeat || null
        };
        
        this.tasks.unshift(newTask);
        this.saveTasks();
        this.renderTasks();
        
        document.dispatchEvent(new CustomEvent('task:created', {
            detail: { task: newTask }
        }));
        
        this.showNotification('Task created successfully', 'success');
        
        return newTask;
    }
    
    updateTask(taskId, updates) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index === -1) return false;
        
        const oldTask = { ...this.tasks[index] };
        this.tasks[index] = {
            ...this.tasks[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        if (updates.completed && !oldTask.completed) {
            this.tasks[index].completedAt = new Date().toISOString();
        }
        
        this.saveTasks();
        this.sortTasks();
        this.renderTasks();
        
        document.dispatchEvent(new CustomEvent('task:updated', {
            detail: { taskId, oldTask, newTask: this.tasks[index] }
        }));
        
        return true;
    }
    
    deleteTask(taskId) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index === -1) return false;
        
        const deletedTask = this.tasks[index];
        this.tasks.splice(index, 1);
        this.saveTasks();
        this.renderTasks();
        
        document.dispatchEvent(new CustomEvent('task:deleted', {
            detail: { task: deletedTask }
        }));
        
        this.showNotification('Task deleted', 'info');
        
        return true;
    }
    
    toggleComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const completed = !task.completed;
            this.updateTask(taskId, { 
                completed: completed,
                completedAt: completed ? new Date().toISOString() : null
            });
            
            this.showNotification(completed ? 'Task completed! 🎉' : 'Task reopened', 'success');
        }
    }
    
    toggleStar(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.starred = !task.starred;
            this.saveTasks();
            this.renderTasks();
        }
    }
    
    addSubtask(taskId, subtaskTitle) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const newSubtask = {
                id: this.generateId(),
                title: subtaskTitle,
                completed: false,
                createdAt: new Date().toISOString()
            };
            task.subtasks.push(newSubtask);
            this.saveTasks();
            this.renderTasks();
            return newSubtask;
        }
        return null;
    }
    
    toggleSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const subtask = task.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                this.saveTasks();
                this.renderTasks();
            }
        }
    }
    
    deleteSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
            this.saveTasks();
            this.renderTasks();
        }
    }
    
    addComment(taskId, comment) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && comment.trim()) {
            const newComment = {
                id: this.generateId(),
                text: comment,
                createdAt: new Date().toISOString(),
                createdBy: this.getCurrentUser()
            };
            task.comments.push(newComment);
            this.saveTasks();
            this.renderTasks();
            return newComment;
        }
        return null;
    }
    
    getTasksByFilter() {
        let filtered = [...this.tasks];
        
        // Filter by status
        if (this.currentFilter === 'pending') {
            filtered = filtered.filter(t => !t.completed);
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(t => t.completed);
        } else if (this.currentFilter === 'overdue') {
            filtered = filtered.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date());
        } else if (this.currentFilter === 'today') {
            const today = new Date().toDateString();
            filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today);
        } else if (this.currentFilter === 'week') {
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() + 7);
            filtered = filtered.filter(t => t.dueDate && new Date(t.dueDate) <= weekEnd);
        } else if (this.currentFilter === 'starred') {
            filtered = filtered.filter(t => t.starred);
        }
        
        // Filter by priority
        if (this.currentPriority && this.currentPriority !== 'all') {
            filtered = filtered.filter(t => t.priority === this.currentPriority);
        }
        
        // Filter by category
        if (this.currentCategory && this.currentCategory !== 'all') {
            filtered = filtered.filter(t => t.category === this.currentCategory);
        }
        
        // Search
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query) ||
                t.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }
        
        return filtered;
    }
    
    getStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const overdue = this.tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;
        const highPriority = this.tasks.filter(t => t.priority === 'high' && !t.completed).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return { total, completed, pending, overdue, highPriority, completionRate };
    }
    
    renderTasks() {
        const container = document.getElementById('tasksList');
        if (!container) return;
        
        const filteredTasks = this.getTasksByFilter();
        const stats = this.getStats();
        
        this.updateStats(stats);
        
        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="
                    text-align: center;
                    padding: 4rem;
                    color: var(--text-tertiary);
                ">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
                    <h3>No tasks found</h3>
                    <p style="margin-top: 0.5rem;">Create your first task to get started</p>
                    <button onclick="window.tasksManager.openTaskModal()" class="btn-primary" style="margin-top: 1rem;">
                        + Create Task
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredTasks.map(task => this.renderTaskItem(task)).join('');
    }
    
    renderTaskItem(task) {
        const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
        const priorityColors = {
            high: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', icon: '🔴' },
            medium: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', icon: '🟠' },
            low: { bg: 'rgba(16,185,129,0.2)', color: '#10b981', icon: '🟢' }
        };
        
        const priorityStyle = priorityColors[task.priority] || priorityColors.medium;
        
        return `
            <div class="task-item" data-task-id="${task.id}" style="
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(139,92,246,0.2);
                border-radius: 16px;
                padding: 1rem;
                margin-bottom: 0.75rem;
                transition: all 0.3s;
                ${task.completed ? 'opacity: 0.7;' : ''}
                ${isOverdue ? 'border-left: 3px solid #ef4444;' : ''}
            ">
                <div style="display: flex; align-items: flex-start; gap: 1rem;">
                    <input type="checkbox" 
                        class="task-checkbox" 
                        ${task.completed ? 'checked' : ''} 
                        onchange="event.stopPropagation(); window.tasksManager.toggleComplete('${task.id}')"
                        style="margin-top: 0.25rem; width: 20px; height: 20px; cursor: pointer;">
                    
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                            <span style="
                                font-size: 0.7rem;
                                padding: 0.25rem 0.5rem;
                                background: ${priorityStyle.bg};
                                border-radius: 50px;
                                color: ${priorityStyle.color};
                            ">${priorityStyle.icon} ${task.priority}</span>
                            <span style="
                                font-size: 0.7rem;
                                padding: 0.25rem 0.5rem;
                                background: rgba(139,92,246,0.2);
                                border-radius: 50px;
                                color: #8B5CF6;
                            ">📁 ${task.category}</span>
                            ${task.starred ? '<span style="font-size: 0.8rem;">⭐</span>' : ''}
                            ${isOverdue ? '<span style="font-size: 0.7rem; color: #ef4444;">⚠️ Overdue</span>' : ''}
                        </div>
                        
                        <h4 style="
                            font-size: 1rem;
                            margin-bottom: 0.5rem;
                            ${task.completed ? 'text-decoration: line-through; color: var(--text-tertiary);' : ''}
                        ">${this.escapeHtml(task.title)}</h4>
                        
                        ${task.description ? `<p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${this.escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</p>` : ''}
                        
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.7rem; color: var(--text-tertiary);">
                            ${task.dueDate ? `<span>📅 Due: ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                            ${task.subtasks.length > 0 ? `<span>📋 ${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} subtasks</span>` : ''}
                            ${task.tags.length > 0 ? `<span>🏷️ ${task.tags.slice(0, 3).join(', ')}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="task-actions" style="display: flex; gap: 0.5rem; opacity: 0; transition: opacity 0.3s;">
                        <button onclick="event.stopPropagation(); window.tasksManager.openTaskModal('${task.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;">✏️</button>
                        <button onclick="event.stopPropagation(); window.tasksManager.toggleStar('${task.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;">⭐</button>
                        <button onclick="event.stopPropagation(); window.tasksManager.duplicateTask('${task.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;">📋</button>
                        <button onclick="event.stopPropagation(); window.tasksManager.deleteTask('${task.id}')" style="background: none; border: none; cursor: pointer; font-size: 1rem;">🗑️</button>
                    </div>
                </div>
                
                ${task.subtasks.length > 0 ? `
                    <div style="margin-left: 2.5rem; margin-top: 0.75rem; padding-left: 1rem; border-left: 2px solid rgba(139,92,246,0.3);">
                        ${task.subtasks.map(subtask => `
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <input type="checkbox" 
                                    ${subtask.completed ? 'checked' : ''} 
                                    onchange="window.tasksManager.toggleSubtask('${task.id}', '${subtask.id}')"
                                    style="cursor: pointer;">
                                <span style="${subtask.completed ? 'text-decoration: line-through; color: var(--text-tertiary);' : ''}">${this.escapeHtml(subtask.title)}</span>
                                <button onclick="window.tasksManager.deleteSubtask('${task.id}', '${subtask.id}')" style="background: none; border: none; cursor: pointer; font-size: 0.8rem; color: #ef4444;">✕</button>
                            </div>
                        `).join('')}
                        <input type="text" 
                            placeholder="+ Add subtask" 
                            onkeypress="if(event.key === 'Enter') window.tasksManager.addSubtaskFromInput('${task.id}', this)"
                            style="
                                width: 100%;
                                padding: 0.5rem;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 8px;
                                color: white;
                                font-size: 0.8rem;
                                margin-top: 0.5rem;
                            ">
                    </div>
                ` : `
                    <div style="margin-left: 2.5rem; margin-top: 0.5rem;">
                        <input type="text" 
                            placeholder="+ Add subtask" 
                            onkeypress="if(event.key === 'Enter') window.tasksManager.addSubtaskFromInput('${task.id}', this)"
                            style="
                                width: 100%;
                                padding: 0.5rem;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                border-radius: 8px;
                                color: white;
                                font-size: 0.8rem;
                            ">
                    </div>
                `}
            </div>
        `;
    }
    
    updateStats(stats) {
        const statsElements = {
            totalTasks: document.getElementById('totalTasks'),
            completedTasks: document.getElementById('completedTasks'),
            pendingTasks: document.getElementById('pendingTasks'),
            overdueTasks: document.getElementById('overdueTasks'),
            completionRate: document.getElementById('completionRate')
        };
        
        if (statsElements.totalTasks) statsElements.totalTasks.textContent = stats.total;
        if (statsElements.completedTasks) statsElements.completedTasks.textContent = stats.completed;
        if (statsElements.pendingTasks) statsElements.pendingTasks.textContent = stats.pending;
        if (statsElements.overdueTasks) statsElements.overdueTasks.textContent = stats.overdue;
        if (statsElements.completionRate) statsElements.completionRate.textContent = `${stats.completionRate}%`;
        
        // Update progress bar
        const progressBar = document.getElementById('tasksProgressBar');
        if (progressBar) {
            progressBar.style.width = `${stats.completionRate}%`;
        }
    }
    
    openTaskModal(taskId = null) {
        const task = taskId ? this.tasks.find(t => t.id === taskId) : null;
        
        const modal = document.createElement('div');
        modal.className = 'task-modal';
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
            <div class="task-modal-content" style="
                background: #1a1a2e;
                border-radius: 24px;
                padding: 2rem;
                width: 90%;
                max-width: 600px;
                max-height: 85vh;
                overflow-y: auto;
            ">
                <h3 style="margin-bottom: 1.5rem;">${task ? 'Edit Task' : 'Create New Task'}</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Task Title *</label>
                    <input type="text" id="taskTitle" value="${task ? this.escapeHtml(task.title) : ''}" placeholder="Enter task title" style="
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
                    <textarea id="taskDescription" rows="4" placeholder="Enter task description" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                        resize: vertical;
                    ">${task ? this.escapeHtml(task.description) : ''}</textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label>Priority</label>
                        <select id="taskPriority" style="
                            width: 100%;
                            padding: 0.75rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                        ">
                            <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select id="taskCategory" style="
                            width: 100%;
                            padding: 0.75rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                        ">
                            <option value="general" ${task?.category === 'general' ? 'selected' : ''}>General</option>
                            <option value="work" ${task?.category === 'work' ? 'selected' : ''}>Work</option>
                            <option value="personal" ${task?.category === 'personal' ? 'selected' : ''}>Personal</option>
                            <option value="shopping" ${task?.category === 'shopping' ? 'selected' : ''}>Shopping</option>
                            <option value="health" ${task?.category === 'health' ? 'selected' : ''}>Health</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" id="taskDueDate" value="${task?.dueDate || ''}" style="
                            width: 100%;
                            padding: 0.75rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                        ">
                    </div>
                    <div class="form-group">
                        <label>Reminder</label>
                        <input type="datetime-local" id="taskReminder" value="${task?.reminder || ''}" style="
                            width: 100%;
                            padding: 0.75rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                        ">
                    </div>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Tags (comma separated)</label>
                    <input type="text" id="taskTags" value="${task?.tags?.join(', ') || ''}" placeholder="work, important, urgent" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button onclick="this.closest('.task-modal').remove()" style="
                        padding: 0.5rem 1rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="window.tasksManager.saveTaskFromModal(this, '${task?.id || ''}')" style="
                        padding: 0.5rem 1rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">${task ? 'Update' : 'Create'}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    saveTaskFromModal(btn, taskId) {
        const modal = btn.closest('.task-modal');
        const title = modal.querySelector('#taskTitle').value;
        
        if (!title.trim()) {
            this.showError('Task title is required');
            return;
        }
        
        const taskData = {
            title: title.trim(),
            description: modal.querySelector('#taskDescription').value,
            priority: modal.querySelector('#taskPriority').value,
            category: modal.querySelector('#taskCategory').value,
            dueDate: modal.querySelector('#taskDueDate').value || null,
            reminder: modal.querySelector('#taskReminder').value || null,
            tags: modal.querySelector('#taskTags').value.split(',').map(t => t.trim()).filter(t => t)
        };
        
        if (taskId) {
            this.updateTask(taskId, taskData);
        } else {
            this.createTask(taskData);
        }
        
        modal.remove();
    }
    
    addSubtaskFromInput(taskId, input) {
        const title = input.value.trim();
        if (title) {
            this.addSubtask(taskId, title);
            input.value = '';
        }
    }
    
    duplicateTask(taskId) {
        const original = this.tasks.find(t => t.id === taskId);
        if (original) {
            this.createTask({
                title: `${original.title} (Copy)`,
                description: original.description,
                priority: original.priority,
                category: original.category,
                tags: [...original.tags]
            });
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        this.renderTasks();
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
    }
    
    setSort(sort) {
        this.currentSort = sort;
        this.sortTasks();
        this.renderTasks();
    }
    
    searchTasks(query) {
        this.searchQuery = query;
        this.renderTasks();
    }
    
    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });
        
        // Search input
        const searchInput = document.getElementById('searchTasks');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchTasks(e.target.value);
                }, 300);
            });
        }
        
        // New task button
        const newTaskBtn = document.getElementById('newTaskBtn');
        if (newTaskBtn) {
            newTaskBtn.addEventListener('click', () => this.openTaskModal());
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.openTaskModal();
            }
        });
    }
    
    startAutoReminders() {
        setInterval(() => {
            const now = new Date();
            this.tasks.forEach(task => {
                if (!task.completed && task.reminder && new Date(task.reminder) <= now) {
                    this.showReminder(task);
                    // Clear reminder to avoid duplicate notifications
                    task.reminder = null;
                    this.saveTasks();
                }
            });
        }, 60000); // Check every minute
    }
    
    showReminder(task) {
        if (window.notify) {
            window.notify.info(`Reminder: ${task.title}`, 'Task Due');
        }
        
        // Play sound if enabled
        if (localStorage.getItem('reminder_sound') !== 'false') {
            const audio = new Audio('/assets/notification.mp3');
            audio.play().catch(() => {});
        }
    }
    
    getCurrentUser() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        return user.username || 'Anonymous';
    }
    
    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

// Initialize tasks manager
const tasksManager = new TasksManager();
window.tasksManager = tasksManager;