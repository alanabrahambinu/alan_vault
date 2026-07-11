/* ========================================
   ALAN VAULT - ACCOUNT MANAGEMENT
   User Account Settings & Profile
   ======================================== */

class AccountManager {
    constructor() {
        this.currentUser = null;
        this.profile = {};
        this.init();
    }
    
    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.renderProfile();
    }
    
    loadUserData() {
        this.currentUser = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const profileKey = `${CONFIG.STORAGE_KEYS.PROFILE_PREFIX}${this.currentUser.id}`;
        this.profile = JSON.parse(localStorage.getItem(profileKey) || '{}');
    }
    
    saveProfile() {
        const profileKey = `${CONFIG.STORAGE_KEYS.PROFILE_PREFIX}${this.currentUser.id}`;
        localStorage.setItem(profileKey, JSON.stringify(this.profile));
    }
    
    updateProfile(updates) {
        this.profile = { ...this.profile, ...updates };
        this.saveProfile();
        this.renderProfile();
        
        document.dispatchEvent(new CustomEvent('profile:updated', {
            detail: { profile: this.profile }
        }));
        
        this.showNotification('Profile updated successfully', 'success');
    }
    
    updateUser(updates) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates };
            localStorage.setItem('users', JSON.stringify(users));
            
            // Update current user
            this.currentUser = { ...this.currentUser, ...updates };
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
            
            this.showNotification('Account updated successfully', 'success');
        }
    }
    
    async changePassword(currentPassword, newPassword, confirmPassword) {
        if (newPassword !== confirmPassword) {
            this.showError('New passwords do not match');
            return false;
        }
        
        if (newPassword.length < 6) {
            this.showError('Password must be at least 6 characters');
            return false;
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1 && users[userIndex].password === currentPassword) {
            users[userIndex].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));
            
            this.showNotification('Password changed successfully', 'success');
            return true;
        } else {
            this.showError('Current password is incorrect');
            return false;
        }
    }
    
    async deleteAccount() {
        const confirmed = await this.showDeleteConfirmation();
        if (!confirmed) return false;
        
        // Delete all user data
        localStorage.removeItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${this.currentUser.id}`);
        localStorage.removeItem(`${CONFIG.STORAGE_KEYS.PROFILE_PREFIX}${this.currentUser.id}`);
        localStorage.removeItem(`${CONFIG.STORAGE_KEYS.SETTINGS_PREFIX}${this.currentUser.id}`);
        
        // Remove from users list
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const filteredUsers = users.filter(u => u.id !== this.currentUser.id);
        localStorage.setItem('users', JSON.stringify(filteredUsers));
        
        // Clear session
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem('loggedIn');
        
        this.showNotification('Account deleted successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'signup.html';
        }, 2000);
        
        return true;
    }
    
    showDeleteConfirmation() {
        return new Promise((resolve) => {
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
                z-index: 10000;
            `;
            
            modal.innerHTML = `
                <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; max-width: 400px; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin-bottom: 0.5rem;">Delete Account</h3>
                    <p style="color: #a1a1aa; margin-bottom: 1rem;">
                        This action cannot be undone. All your data will be permanently deleted.
                    </p>
                    <p style="color: #ef4444; margin-bottom: 1rem; font-size: 0.875rem;">
                        Type "DELETE" to confirm
                    </p>
                    <input type="text" id="deleteConfirm" placeholder="DELETE" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                        text-align: center;
                        margin-bottom: 1rem;
                    ">
                    <div style="display: flex; gap: 1rem;">
                        <button id="cancelDelete" style="
                            flex: 1;
                            padding: 0.5rem;
                            background: transparent;
                            border: 1px solid rgba(139,92,246,0.5);
                            border-radius: 8px;
                            color: #8B5CF6;
                            cursor: pointer;
                        ">Cancel</button>
                        <button id="confirmDelete" style="
                            flex: 1;
                            padding: 0.5rem;
                            background: #ef4444;
                            border: none;
                            border-radius: 8px;
                            color: white;
                            cursor: pointer;
                        ">Delete</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const confirmInput = modal.querySelector('#deleteConfirm');
            const cancelBtn = modal.querySelector('#cancelDelete');
            const confirmBtn = modal.querySelector('#confirmDelete');
            
            cancelBtn.onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            confirmBtn.onclick = () => {
                if (confirmInput.value === 'DELETE') {
                    modal.remove();
                    resolve(true);
                } else {
                    alert('Please type DELETE to confirm');
                }
            };
        });
    }
    
    renderProfile() {
        const elements = {
            username: document.getElementById('profileUsername'),
            email: document.getElementById('profileEmail'),
            fullName: document.getElementById('profileFullName'),
            bio: document.getElementById('profileBio'),
            company: document.getElementById('profileCompany'),
            location: document.getElementById('profileLocation'),
            website: document.getElementById('profileWebsite'),
            joinDate: document.getElementById('profileJoinDate')
        };
        
        if (elements.username) elements.username.textContent = this.currentUser.username;
        if (elements.email) elements.email.textContent = this.currentUser.email;
        if (elements.fullName) elements.fullName.value = this.profile.fullName || '';
        if (elements.bio) elements.bio.value = this.profile.bio || '';
        if (elements.company) elements.company.value = this.profile.company || '';
        if (elements.location) elements.location.value = this.profile.location || '';
        if (elements.website) elements.website.value = this.profile.website || '';
        if (elements.joinDate) elements.joinDate.textContent = new Date(this.currentUser.createdAt).toLocaleDateString();
    }
    
    setupEventListeners() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile({
                    fullName: document.getElementById('profileFullName')?.value,
                    bio: document.getElementById('profileBio')?.value,
                    company: document.getElementById('profileCompany')?.value,
                    location: document.getElementById('profileLocation')?.value,
                    website: document.getElementById('profileWebsite')?.value
                });
            });
        }
        
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const currentPassword = document.getElementById('currentPassword')?.value;
                const newPassword = document.getElementById('newPassword')?.value;
                const confirmPassword = document.getElementById('confirmPassword')?.value;
                
                await this.changePassword(currentPassword, newPassword, confirmPassword);
                passwordForm.reset();
            });
        }
        
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
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
}

// Initialize account manager
const accountManager = new AccountManager();
window.accountManager = accountManager;