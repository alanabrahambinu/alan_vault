/* ========================================
   ALAN VAULT - USER MANAGEMENT
   Admin User Management System
   ======================================== */

class UserManager {
    constructor() {
        this.users = [];
        this.currentUser = null;
        this.filters = {
            role: 'all',
            status: 'all',
            search: ''
        };
        this.init();
    }
    
    init() {
        this.loadUsers();
        this.setupEventListeners();
        this.renderUsers();
    }
    
    loadUsers() {
        const saved = localStorage.getItem('users');
        if (saved) {
            this.users = JSON.parse(saved);
        } else {
            // Create default admin user
            this.users = [
                {
                    id: '1',
                    username: 'Admin',
                    email: 'admin@alanvault.com',
                    password: 'admin123',
                    role: 'admin',
                    status: 'active',
                    verified: true,
                    createdAt: new Date().toISOString(),
                    lastLogin: null,
                    storageUsed: 0,
                    plan: 'premium'
                }
            ];
            this.saveUsers();
        }
        
        // Set current user
        const currentUserData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        if (currentUserData) {
            this.currentUser = JSON.parse(currentUserData);
        }
    }
    
    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
        this.dispatchEvent('users:updated', { count: this.users.length });
    }
    
    getAllUsers() {
        let filtered = [...this.users];
        
        // Filter by role
        if (this.filters.role !== 'all') {
            filtered = filtered.filter(u => u.role === this.filters.role);
        }
        
        // Filter by status
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(u => u.status === this.filters.status);
        }
        
        // Filter by search
        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(u => 
                u.username.toLowerCase().includes(search) ||
                u.email.toLowerCase().includes(search)
            );
        }
        
        return filtered;
    }
    
    getUser(userId) {
        return this.users.find(u => u.id === userId);
    }
    
    getUserStats() {
        const total = this.users.length;
        const admins = this.users.filter(u => u.role === 'admin').length;
        const premium = this.users.filter(u => u.plan === 'premium').length;
        const active = this.users.filter(u => u.status === 'active').length;
        const verified = this.users.filter(u => u.verified).length;
        
        let totalStorage = 0;
        this.users.forEach(user => {
            const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
            const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
            totalStorage += vault.files.reduce((sum, f) => sum + (f.size || 0), 0);
        });
        
        return {
            total,
            admins,
            premium,
            active,
            verified,
            totalStorage: this.formatBytes(totalStorage),
            averageStorage: this.formatBytes(total / (total || 1))
        };
    }
    
    createUser(userData) {
        // Check if email exists
        if (this.users.find(u => u.email === userData.email)) {
            this.showError('Email already exists');
            return null;
        }
        
        const newUser = {
            id: this.generateId(),
            username: userData.username,
            email: userData.email,
            password: userData.password || 'temp123',
            role: userData.role || 'user',
            status: userData.status || 'active',
            verified: userData.verified || false,
            plan: userData.plan || 'free',
            createdAt: new Date().toISOString(),
            lastLogin: null,
            storageUsed: 0,
            metadata: userData.metadata || {}
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        // Create empty vault for new user
        const emptyVault = {
            files: [],
            notes: [],
            tasks: [],
            bookmarks: []
        };
        localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${newUser.id}`, JSON.stringify(emptyVault));
        
        this.dispatchEvent('user:created', { user: newUser });
        this.renderUsers();
        this.showNotification(`User ${newUser.username} created`, 'success');
        
        return newUser;
    }
    
    updateUser(userId, updates) {
        const index = this.users.findIndex(u => u.id === userId);
        if (index === -1) return false;
        
        const oldUser = { ...this.users[index] };
        this.users[index] = { ...this.users[index], ...updates, updatedAt: new Date().toISOString() };
        this.saveUsers();
        
        this.dispatchEvent('user:updated', { userId, oldUser, newUser: this.users[index] });
        this.renderUsers();
        this.showNotification(`User ${this.users[index].username} updated`, 'success');
        
        return true;
    }
    
    deleteUser(userId) {
        if (userId === this.currentUser?.id) {
            this.showError('Cannot delete your own account');
            return false;
        }
        
        const index = this.users.findIndex(u => u.id === userId);
        if (index === -1) return false;
        
        const deletedUser = this.users[index];
        this.users.splice(index, 1);
        this.saveUsers();
        
        // Delete user data
        localStorage.removeItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${userId}`);
        localStorage.removeItem(`${CONFIG.STORAGE_KEYS.PROFILE_PREFIX}${userId}`);
        localStorage.removeItem(`${CONFIG.STORAGE_KEYS.SETTINGS_PREFIX}${userId}`);
        
        this.dispatchEvent('user:deleted', { user: deletedUser });
        this.renderUsers();
        this.showNotification(`User ${deletedUser.username} deleted`, 'success');
        
        return true;
    }
    
    resetUserPassword(userId) {
        const user = this.getUser(userId);
        if (!user) return false;
        
        const newPassword = this.generateTempPassword();
        user.password = newPassword;
        this.saveUsers();
        
        this.showNotification(`Password reset for ${user.username}. New password: ${newPassword}`, 'info');
        
        return newPassword;
    }
    
    toggleUserStatus(userId) {
        const user = this.getUser(userId);
        if (!user) return false;
        
        const newStatus = user.status === 'active' ? 'suspended' : 'active';
        this.updateUser(userId, { status: newStatus });
        
        return true;
    }
    
    changeUserRole(userId, newRole) {
        const user = this.getUser(userId);
        if (!user) return false;
        
        if (userId === this.currentUser?.id && newRole !== 'admin') {
            this.showError('Cannot demote yourself');
            return false;
        }
        
        this.updateUser(userId, { role: newRole });
        return true;
    }
    
    changeUserPlan(userId, newPlan) {
        return this.updateUser(userId, { plan: newPlan });
    }
    
    getUserStorageUsage(userId) {
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${userId}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        const totalSize = vault.files.reduce((sum, f) => sum + (f.size || 0), 0);
        
        return {
            used: totalSize,
            usedFormatted: this.formatBytes(totalSize),
            limit: CONFIG.LIMITS.STORAGE_LIMIT,
            limitFormatted: this.formatBytes(CONFIG.LIMITS.STORAGE_LIMIT),
            percentage: (totalSize / CONFIG.LIMITS.STORAGE_LIMIT) * 100
        };
    }
    
    setFilter(filterType, value) {
        this.filters[filterType] = value;
        this.renderUsers();
    }
    
    searchUsers(query) {
        this.filters.search = query;
        this.renderUsers();
    }
    
    renderUsers() {
        const container = document.getElementById('usersTableBody');
        if (!container) return;
        
        const filteredUsers = this.getAllUsers();
        const stats = this.getUserStats();
        
        this.updateStats(stats);
        
        if (filteredUsers.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem; color: #71717a;">
                        No users found
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = filteredUsers.map(user => `
            <tr class="user-row" data-user-id="${user.id}">
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="user-avatar" style="
                            width: 36px;
                            height: 36px;
                            background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">${user.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <div style="font-weight: 500;">${this.escapeHtml(user.username)}</div>
                            <div style="font-size: 0.7rem; color: #71717a;">ID: ${user.id}</div>
                        </div>
                    </div>
                </td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>
                    <span class="role-badge role-${user.role}" style="
                        padding: 0.25rem 0.5rem;
                        border-radius: 50px;
                        font-size: 0.7rem;
                        background: ${user.role === 'admin' ? 'rgba(79,70,229,0.2)' : 'rgba(16,185,129,0.2)'};
                        color: ${user.role === 'admin' ? '#4F46E5' : '#10b981'};
                    ">${user.role}</span>
                </td>
                <td>
                    <span class="status-badge status-${user.status}" style="
                        padding: 0.25rem 0.5rem;
                        border-radius: 50px;
                        font-size: 0.7rem;
                        background: ${user.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};
                        color: ${user.status === 'active' ? '#10b981' : '#ef4444'};
                    ">${user.status}</span>
                </td>
                <td>${user.plan || 'free'}</td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                <td>
                    <div class="user-actions" style="display: flex; gap: 0.5rem;">
                        <button onclick="window.userManager.viewUser('${user.id}')" class="action-btn" title="View">👁️</button>
                        <button onclick="window.userManager.editUser('${user.id}')" class="action-btn" title="Edit">✏️</button>
                        <button onclick="window.userManager.resetUserPassword('${user.id}')" class="action-btn" title="Reset Password">🔑</button>
                        <button onclick="window.userManager.toggleUserStatus('${user.id}')" class="action-btn" title="${user.status === 'active' ? 'Suspend' : 'Activate'}">
                            ${user.status === 'active' ? '🔒' : '🔓'}
                        </button>
                        ${user.id !== window.userManager.currentUser?.id ? `
                            <button onclick="window.userManager.deleteUser('${user.id}')" class="action-btn delete" title="Delete">🗑️</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    updateStats(stats) {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            activeUsers: document.getElementById('activeUsers'),
            adminUsers: document.getElementById('adminUsers'),
            premiumUsers: document.getElementById('premiumUsers'),
            verifiedUsers: document.getElementById('verifiedUsers'),
            totalStorage: document.getElementById('totalStorage'),
            avgStorage: document.getElementById('avgStorage')
        };
        
        if (elements.totalUsers) elements.totalUsers.textContent = stats.total;
        if (elements.activeUsers) elements.activeUsers.textContent = stats.active;
        if (elements.adminUsers) elements.adminUsers.textContent = stats.admins;
        if (elements.premiumUsers) elements.premiumUsers.textContent = stats.premium;
        if (elements.verifiedUsers) elements.verifiedUsers.textContent = stats.verified;
        if (elements.totalStorage) elements.totalStorage.textContent = stats.totalStorage;
        if (elements.avgStorage) elements.avgStorage.textContent = stats.averageStorage;
    }
    
    viewUser(userId) {
        const user = this.getUser(userId);
        if (!user) return;
        
        const storage = this.getUserStorageUsage(userId);
        
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
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 500px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3>User Details</h3>
                    <button onclick="this.closest('div').parentElement.remove()" style="background: none; border: none; color: #a1a1aa; font-size: 1.2rem; cursor: pointer;">✕</button>
                </div>
                
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                    ">${user.username.charAt(0).toUpperCase()}</div>
                    <div>
                        <h4>${this.escapeHtml(user.username)}</h4>
                        <p style="color: #a1a1aa;">${this.escapeHtml(user.email)}</p>
                    </div>
                </div>
                
                <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div><label style="color: #71717a;">Role</label><div>${user.role}</div></div>
                    <div><label style="color: #71717a;">Status</label><div>${user.status}</div></div>
                    <div><label style="color: #71717a;">Plan</label><div>${user.plan || 'free'}</div></div>
                    <div><label style="color: #71717a;">Verified</label><div>${user.verified ? 'Yes' : 'No'}</div></div>
                    <div><label style="color: #71717a;">Joined</label><div>${new Date(user.createdAt).toLocaleDateString()}</div></div>
                    <div><label style="color: #71717a;">Last Login</label><div>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div></div>
                    <div><label style="color: #71717a;">Storage Used</label><div>${storage.usedFormatted} / ${storage.limitFormatted}</div></div>
                    <div><label style="color: #71717a;">Usage</label><div>${storage.percentage.toFixed(1)}%</div></div>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button onclick="window.userManager.editUser('${userId}')" style="
                        flex: 1;
                        padding: 0.5rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Edit User</button>
                    <button onclick="window.userManager.viewUserActivity('${userId}')" style="
                        flex: 1;
                        padding: 0.5rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">View Activity</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    editUser(userId) {
        const user = this.getUser(userId);
        if (!user) return;
        
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
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 500px;">
                <h3 style="margin-bottom: 1rem;">Edit User</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Username</label>
                    <input type="text" id="editUsername" value="${this.escapeHtml(user.username)}" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Email</label>
                    <input type="email" id="editEmail" value="${this.escapeHtml(user.email)}" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Role</label>
                    <select id="editRole" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Status</label>
                    <select id="editStatus" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Plan</label>
                    <select id="editPlan" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="free" ${user.plan === 'free' ? 'selected' : ''}>Free</option>
                        <option value="premium" ${user.plan === 'premium' ? 'selected' : ''}>Premium</option>
                    </select>
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
                    <button onclick="window.userManager.saveUserEdit('${userId}', this)" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Save Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    saveUserEdit(userId, btn) {
        const modal = btn.closest('div').parentElement;
        const username = modal.querySelector('#editUsername').value.trim();
        const email = modal.querySelector('#editEmail').value.trim();
        const role = modal.querySelector('#editRole').value;
        const status = modal.querySelector('#editStatus').value;
        const plan = modal.querySelector('#editPlan').value;
        
        if (!username || !email) {
            this.showError('Username and email are required');
            return;
        }
        
        this.updateUser(userId, { username, email, role, status, plan });
        modal.remove();
    }
    
    viewUserActivity(userId) {
        const user = this.getUser(userId);
        if (!user) return;
        
        // Get user activity from logs
        const logs = JSON.parse(localStorage.getItem('system_logs') || '[]');
        const userLogs = logs.filter(log => log.userId === userId || log.userEmail === user.email);
        
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
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 800px; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3>User Activity: ${this.escapeHtml(user.username)}</h3>
                    <button onclick="this.closest('div').parentElement.remove()" style="background: none; border: none; color: #a1a1aa; font-size: 1.2rem; cursor: pointer;">✕</button>
                </div>
                
                <div class="activity-list">
                    ${userLogs.length === 0 ? '<p style="text-align: center; color: #71717a;">No activity found</p>' : 
                        userLogs.slice(0, 50).map(log => `
                            <div class="activity-item" style="
                                padding: 0.75rem;
                                border-bottom: 1px solid rgba(255,255,255,0.05);
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            ">
                                <div>
                                    <div style="font-weight: 500;">${this.escapeHtml(log.action)}</div>
                                    <div style="font-size: 0.7rem; color: #71717a;">${this.escapeHtml(log.details || '')}</div>
                                </div>
                                <div style="font-size: 0.7rem; color: #71717a;">${new Date(log.timestamp).toLocaleString()}</div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    showAddUserModal() {
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
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 500px;">
                <h3 style="margin-bottom: 1rem;">Add New User</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Username</label>
                    <input type="text" id="newUsername" placeholder="johndoe" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Email</label>
                    <input type="email" id="newEmail" placeholder="john@example.com" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Role</label>
                    <select id="newRole" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Plan</label>
                    <select id="newPlan" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                    </select>
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
                    <button onclick="window.userManager.createUserFromModal(this)" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Create User</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    createUserFromModal(btn) {
        const modal = btn.closest('div').parentElement;
        const username = modal.querySelector('#newUsername').value.trim();
        const email = modal.querySelector('#newEmail').value.trim();
        const role = modal.querySelector('#newRole').value;
        const plan = modal.querySelector('#newPlan').value;
        
        if (!username || !email) {
            this.showError('Username and email are required');
            return;
        }
        
        this.createUser({ username, email, role, plan });
        modal.remove();
    }
    
    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.user-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                const type = filter.dataset.filterType;
                const value = filter.dataset.filterValue;
                this.setFilter(type, value);
                
                document.querySelectorAll('.user-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
            });
        });
        
        // Search input
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchUsers(e.target.value);
                }, 300);
            });
        }
        
        // Add user button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showAddUserModal());
        }
    }
    
    generateId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
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

// Initialize user manager
const userManager = new UserManager();
window.userManager = userManager;