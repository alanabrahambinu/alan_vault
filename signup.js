/* ========================================
   ALAN VAULT - SIGNUP HANDLER
   User Registration & Account Creation
   ======================================== */

class SignupHandler {
    constructor() {
        this.form = document.getElementById('signupForm');
        this.usernameInput = document.getElementById('username');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmInput = document.getElementById('confirmPassword');
        this.termsCheckbox = document.getElementById('terms');
        this.submitBtn = document.querySelector('button[type="submit"]');
        this.errorDiv = document.getElementById('errorMessage');
        this.successDiv = document.getElementById('successMessage');
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        this.setupEventListeners();
        this.setupPasswordStrength();
        this.setupUsernameAvailability();
        this.setupEmailValidation();
    }
    
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        this.usernameInput.addEventListener('input', () => this.validateUsername());
        this.usernameInput.addEventListener('blur', () => this.checkUsernameAvailability());
        
        this.emailInput.addEventListener('input', () => this.validateEmail());
        this.emailInput.addEventListener('blur', () => this.checkEmailAvailability());
        
        this.passwordInput.addEventListener('input', () => {
            this.validatePassword();
            this.updatePasswordStrength();
            this.checkPasswordMatch();
        });
        
        this.confirmInput.addEventListener('input', () => this.checkPasswordMatch());
    }
    
    setupPasswordStrength() {
        const strengthDiv = document.getElementById('passwordStrength');
        if (!strengthDiv) return;
        
        strengthDiv.classList.add('strength-meter');
        const fillDiv = document.createElement('div');
        fillDiv.className = 'strength-fill';
        strengthDiv.appendChild(fillDiv);
        
        const textSpan = document.createElement('span');
        textSpan.className = 'strength-text';
        strengthDiv.appendChild(textSpan);
    }
    
    updatePasswordStrength() {
        const password = this.passwordInput.value;
        const fillDiv = document.querySelector('.strength-fill');
        const textSpan = document.querySelector('.strength-text');
        
        if (!fillDiv || !textSpan) return;
        
        let strength = 0;
        
        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        const percentage = (strength / 5) * 100;
        fillDiv.style.width = `${percentage}%`;
        
        let strengthText = '';
        let strengthColor = '';
        
        if (strength <= 1) {
            strengthText = 'Weak password';
            strengthColor = '#ef4444';
        } else if (strength <= 3) {
            strengthText = 'Medium password';
            strengthColor = '#f59e0b';
        } else if (strength <= 4) {
            strengthText = 'Good password';
            strengthColor = '#10b981';
        } else {
            strengthText = 'Strong password!';
            strengthColor = '#10b981';
        }
        
        textSpan.textContent = strengthText;
        textSpan.style.color = strengthColor;
        fillDiv.style.background = strengthColor;
        
        if (!password) {
            fillDiv.style.width = '0';
            textSpan.textContent = '';
        }
    }
    
    async setupUsernameAvailability() {
        // Add availability indicator
        const indicator = document.createElement('span');
        indicator.className = 'availability-indicator';
        indicator.style.cssText = `
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.8rem;
        `;
        
        const wrapper = this.usernameInput.parentElement;
        if (wrapper.classList.contains('input-group')) {
            wrapper.style.position = 'relative';
            wrapper.appendChild(indicator);
            this.usernameIndicator = indicator;
        }
    }
    
    async checkUsernameAvailability() {
        const username = this.usernameInput.value.trim();
        if (!username || username.length < 3) return;
        
        // Simulate API call
        await this.sleep(500);
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const exists = users.some(u => u.username === username);
        
        if (this.usernameIndicator) {
            if (exists) {
                this.usernameIndicator.textContent = '❌';
                this.usernameIndicator.style.color = '#ef4444';
                this.showFieldError('usernameError', 'Username already taken');
                return false;
            } else {
                this.usernameIndicator.textContent = '✓';
                this.usernameIndicator.style.color = '#10b981';
                this.clearFieldError('usernameError');
                return true;
            }
        }
        return !exists;
    }
    
    async checkEmailAvailability() {
        const email = this.emailInput.value.trim();
        if (!email) return;
        
        await this.sleep(500);
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const exists = users.some(u => u.email === email);
        
        if (exists) {
            this.showFieldError('emailError', 'Email already registered');
            return false;
        }
        
        this.clearFieldError('emailError');
        return true;
    }
    
    setupEmailValidation() {
        // Add email domain suggestion
        this.emailInput.addEventListener('input', () => {
            const value = this.emailInput.value;
            if (value.includes('@') && !value.includes('.com') && !value.includes('.net')) {
                // Could show domain suggestions
            }
        });
    }
    
    validateUsername() {
        const username = this.usernameInput.value.trim();
        const errorSpan = document.getElementById('usernameError');
        
        if (!username) {
            this.showFieldError('usernameError', 'Username is required');
            return false;
        }
        
        if (username.length < 3) {
            this.showFieldError('usernameError', 'Username must be at least 3 characters');
            return false;
        }
        
        if (username.length > 20) {
            this.showFieldError('usernameError', 'Username must be less than 20 characters');
            return false;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showFieldError('usernameError', 'Username can only contain letters, numbers, and underscores');
            return false;
        }
        
        this.clearFieldError('usernameError');
        return true;
    }
    
    validateEmail() {
        const email = this.emailInput.value.trim();
        const errorSpan = document.getElementById('emailError');
        
        if (!email) {
            this.showFieldError('emailError', 'Email is required');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showFieldError('emailError', 'Please enter a valid email address');
            return false;
        }
        
        this.clearFieldError('emailError');
        return true;
    }
    
    validatePassword() {
        const password = this.passwordInput.value;
        const errorSpan = document.getElementById('passwordError');
        
        if (!password) {
            this.showFieldError('passwordError', 'Password is required');
            return false;
        }
        
        if (password.length < 6) {
            this.showFieldError('passwordError', 'Password must be at least 6 characters');
            return false;
        }
        
        this.clearFieldError('passwordError');
        return true;
    }
    
    checkPasswordMatch() {
        const password = this.passwordInput.value;
        const confirm = this.confirmInput.value;
        const errorSpan = document.getElementById('confirmError');
        
        if (confirm && password !== confirm) {
            this.showFieldError('confirmError', 'Passwords do not match');
            return false;
        }
        
        this.clearFieldError('confirmError');
        return true;
    }
    
    showFieldError(elementId, message) {
        const errorSpan = document.getElementById(elementId);
        if (errorSpan) {
            errorSpan.textContent = message;
            errorSpan.style.display = 'block';
        }
    }
    
    clearFieldError(elementId) {
        const errorSpan = document.getElementById(elementId);
        if (errorSpan) {
            errorSpan.textContent = '';
            errorSpan.style.display = 'none';
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const isValid = this.validateUsername() && 
                       this.validateEmail() && 
                       this.validatePassword() && 
                       this.checkPasswordMatch();
        
        if (!isValid) return;
        
        const termsChecked = this.termsCheckbox?.checked;
        if (!termsChecked) {
            this.showError('You must agree to the Terms of Service');
            return;
        }
        
        // Check availability
        const isUsernameAvailable = await this.checkUsernameAvailability();
        const isEmailAvailable = await this.checkEmailAvailability();
        
        if (!isUsernameAvailable || !isEmailAvailable) return;
        
        await this.createAccount();
    }
    
    async createAccount() {
        const username = this.usernameInput.value.trim();
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        
        this.setLoading(true);
        this.hideMessages();
        
        // Simulate API call
        await this.sleep(1000);
        
        try {
            // Create new user
            const newUser = {
                id: Date.now().toString(),
                username: username,
                email: email,
                password: password,
                role: 'user',
                verified: false,
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            
            // Create empty vault for user
            const emptyVault = {
                files: [],
                notes: [],
                tasks: [],
                bookmarks: []
            };
            localStorage.setItem(`${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${newUser.id}`, JSON.stringify(emptyVault));
            
            // Create user settings
            const defaultSettings = {
                theme: 'dark',
                notifications: true,
                emailNotifications: true,
                twoFactorEnabled: false
            };
            localStorage.setItem(`${CONFIG.STORAGE_KEYS.SETTINGS_PREFIX}${newUser.id}`, JSON.stringify(defaultSettings));
            
            // Send verification email (simulated)
            await this.sendVerificationEmail(email);
            
            this.showSuccess('Account created successfully! Please check your email for verification.');
            
            // Store email for verification
            sessionStorage.setItem('verifyEmail', email);
            
            // Redirect to verification page
            setTimeout(() => {
                window.location.href = 'verify-email.html';
            }, 2000);
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('Failed to create account. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    async sendVerificationEmail(email) {
        // Simulate sending verification email
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem(`verify_${email}`, verificationCode);
        console.log(`Verification code for ${email}: ${verificationCode}`);
        
        // In production, this would send an actual email
        return true;
    }
    
    setLoading(isLoading) {
        if (this.submitBtn) {
            if (isLoading) {
                this.submitBtn.disabled = true;
                this.submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';
            } else {
                this.submitBtn.disabled = false;
                this.submitBtn.innerHTML = 'Create Account';
            }
        }
    }
    
    showError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.style.display = 'block';
            this.errorDiv.className = 'error-message show';
            
            setTimeout(() => {
                this.errorDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    showSuccess(message) {
        if (this.successDiv) {
            this.successDiv.textContent = message;
            this.successDiv.style.display = 'block';
            this.successDiv.className = 'success-message show';
        }
    }
    
    hideMessages() {
        if (this.errorDiv) this.errorDiv.style.display = 'none';
        if (this.successDiv) this.successDiv.style.display = 'none';
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize signup handler
document.addEventListener('DOMContentLoaded', () => {
    window.signupHandler = new SignupHandler();
});