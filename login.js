/* ========================================
   ALAN VAULT - LOGIN HANDLER
   User Authentication & Session Management
   ======================================== */

class LoginHandler {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.rememberCheckbox = document.getElementById('rememberMe');
        this.errorDiv = document.getElementById('errorMessage');
        this.submitBtn = document.querySelector('button[type="submit"]');
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        this.setupEventListeners();
        this.checkAutoFill();
        this.loadSavedEmail();
        this.setupPasswordToggle();
        this.setupSocialLogin();
    }
    
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.emailInput.addEventListener('input', () => this.validateEmail());
        this.passwordInput.addEventListener('input', () => this.validatePassword());
        
        // Real-time validation
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
    }
    
    checkAutoFill() {
        // Check if browser autofilled credentials
        setTimeout(() => {
            if (this.emailInput.value && this.passwordInput.value) {
                this.validateEmail();
                this.validatePassword();
            }
        }, 100);
    }
    
    loadSavedEmail() {
        const savedEmail = localStorage.getItem('saved_email');
        if (savedEmail && this.emailInput) {
            this.emailInput.value = savedEmail;
            if (this.rememberCheckbox) {
                this.rememberCheckbox.checked = true;
            }
        }
    }
    
    setupPasswordToggle() {
        // Add show/hide password toggle
        const wrapper = this.passwordInput.parentElement;
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'password-toggle';
        toggleBtn.innerHTML = '👁️';
        toggleBtn.style.cssText = `
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            cursor: pointer;
            opacity: 0.6;
        `;
        
        if (wrapper.classList.contains('input-group')) {
            wrapper.style.position = 'relative';
            wrapper.appendChild(toggleBtn);
            
            toggleBtn.addEventListener('click', () => {
                const type = this.passwordInput.type === 'password' ? 'text' : 'password';
                this.passwordInput.type = type;
                toggleBtn.innerHTML = type === 'password' ? '👁️' : '🙈';
            });
        }
    }
    
    setupSocialLogin() {
        const socialBtns = document.querySelectorAll('.social-btn');
        socialBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const provider = btn.textContent.trim();
                this.handleSocialLogin(provider);
            });
        });
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
        
        const isValid = this.validateEmail() && this.validatePassword();
        if (!isValid) return;
        
        await this.attemptLogin();
    }
    
    async attemptLogin() {
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const rememberMe = this.rememberCheckbox?.checked || false;
        
        this.setLoading(true);
        this.hideError();
        
        // Simulate API call delay
        await this.sleep(800);
        
        try {
            // Get users from localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);
            
            if (user) {
                await this.handleSuccessfulLogin(user, rememberMe);
            } else {
                this.handleFailedLogin();
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleSuccessfulLogin(user, rememberMe) {
        // Generate session token
        const token = this.generateToken();
        const sessionId = this.generateSessionId();
        
        // Store user data
        const userData = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            avatar: user.avatar || null,
            loginAt: new Date().toISOString()
        };
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
        localStorage.setItem('loggedIn', 'true');
        
        // Set session expiry
        const expiry = Date.now() + CONFIG.SECURITY.SESSION_TIMEOUT;
        localStorage.setItem('session_expiry', expiry);
        
        // Save email if remember me
        if (rememberMe) {
            localStorage.setItem('saved_email', user.email);
        } else {
            localStorage.removeItem('saved_email');
        }
        
        // Track login event
        this.trackLoginEvent(user.id);
        
        // Show success message
        this.showSuccess('Login successful! Redirecting...');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }
    
    handleFailedLogin() {
        const attempts = this.getFailedAttempts();
        const newAttempts = attempts + 1;
        localStorage.setItem('failed_login_attempts', newAttempts);
        
        if (newAttempts >= CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS) {
            const lockoutUntil = Date.now() + CONFIG.SECURITY.LOCKOUT_DURATION;
            localStorage.setItem('lockout_until', lockoutUntil);
            this.showError(`Too many failed attempts. Please try again in ${CONFIG.SECURITY.LOCKOUT_DURATION / 60000} minutes.`);
        } else {
            const remaining = CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS - newAttempts;
            this.showError(`Invalid email or password. ${remaining} attempts remaining.`);
        }
    }
    
    getFailedAttempts() {
        const lockoutUntil = localStorage.getItem('lockout_until');
        if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
            return CONFIG.SECURITY.MAX_LOGIN_ATTEMPTS; // Locked out
        }
        
        if (lockoutUntil && Date.now() > parseInt(lockoutUntil)) {
            localStorage.removeItem('lockout_until');
            localStorage.removeItem('failed_login_attempts');
            return 0;
        }
        
        return parseInt(localStorage.getItem('failed_login_attempts') || '0');
    }
    
    async handleSocialLogin(provider) {
        this.setLoading(true);
        
        // Simulate OAuth flow
        await this.sleep(1000);
        
        // For demo purposes, create/authenticate user
        const email = `user@${provider.toLowerCase()}.com`;
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        let user = users.find(u => u.email === email);
        
        if (!user) {
            // Create new user
            user = {
                id: Date.now().toString(),
                username: `${provider} User`,
                email: email,
                password: this.generateToken(8),
                provider: provider,
                createdAt: new Date().toISOString()
            };
            users.push(user);
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        await this.handleSuccessfulLogin(user, true);
        
        this.setLoading(false);
    }
    
    setLoading(isLoading) {
        if (this.submitBtn) {
            if (isLoading) {
                this.submitBtn.disabled = true;
                this.submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';
            } else {
                this.submitBtn.disabled = false;
                this.submitBtn.innerHTML = 'Sign In';
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
    
    hideError() {
        if (this.errorDiv) {
            this.errorDiv.style.display = 'none';
        }
    }
    
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
    
    generateToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < length; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }
    
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
    }
    
    trackLoginEvent(userId) {
        const loginEvent = {
            userId: userId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: 'client-side', // In production, get from server
            location: 'unknown'
        };
        
        // Store login history
        const history = JSON.parse(localStorage.getItem('login_history') || '[]');
        history.unshift(loginEvent);
        
        // Keep only last 20 logins
        if (history.length > 20) history.pop();
        
        localStorage.setItem('login_history', JSON.stringify(history));
        
        // Track with analytics if available
        if (window.analytics) {
            window.analytics.trackEvent('auth', 'login', userId);
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize login handler
document.addEventListener('DOMContentLoaded', () => {
    window.loginHandler = new LoginHandler();
});