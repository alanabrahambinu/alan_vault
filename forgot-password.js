/* ========================================
   ALAN VAULT - FORGOT PASSWORD
   Password Reset Request Handler
   ======================================== */

class ForgotPasswordHandler {
    constructor() {
        this.form = document.getElementById('resetForm');
        this.emailInput = document.getElementById('email');
        this.submitBtn = document.querySelector('button[type="submit"]');
        this.messageDiv = document.getElementById('message');
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        this.setupEventListeners();
        this.checkRateLimit();
    }
    
    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.emailInput.addEventListener('input', () => this.validateEmail());
    }
    
    validateEmail() {
        const email = this.emailInput.value.trim();
        
        if (!email) {
            this.showFieldError('Email is required');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showFieldError('Please enter a valid email address');
            return false;
        }
        
        this.hideFieldError();
        return true;
    }
    
    showFieldError(message) {
        this.emailInput.style.borderColor = '#ef4444';
        const errorSpan = document.getElementById('emailError');
        if (errorSpan) {
            errorSpan.textContent = message;
            errorSpan.style.display = 'block';
        }
    }
    
    hideFieldError() {
        this.emailInput.style.borderColor = '';
        const errorSpan = document.getElementById('emailError');
        if (errorSpan) {
            errorSpan.textContent = '';
            errorSpan.style.display = 'none';
        }
    }
    
    checkRateLimit() {
        const lastRequest = localStorage.getItem('password_reset_last_request');
        const requestCount = parseInt(localStorage.getItem('password_reset_count') || '0');
        
        if (lastRequest && Date.now() - parseInt(lastRequest) < 15 * 60 * 1000) {
            if (requestCount >= 3) {
                this.showMessage('Too many requests. Please try again later.', 'error');
                this.submitBtn.disabled = true;
                setTimeout(() => {
                    this.submitBtn.disabled = false;
                }, 15 * 60 * 1000);
            }
        }
    }
    
    updateRateLimit() {
        const lastRequest = localStorage.getItem('password_reset_last_request');
        let count = parseInt(localStorage.getItem('password_reset_count') || '0');
        
        if (!lastRequest || Date.now() - parseInt(lastRequest) > 15 * 60 * 1000) {
            count = 1;
        } else {
            count++;
        }
        
        localStorage.setItem('password_reset_last_request', Date.now().toString());
        localStorage.setItem('password_reset_count', count.toString());
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const isValid = this.validateEmail();
        if (!isValid) return;
        
        await this.sendResetLink();
    }
    
    async sendResetLink() {
        const email = this.emailInput.value.trim();
        
        this.setLoading(true);
        this.hideMessage();
        
        // Simulate API call
        await this.sleep(1000);
        
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email);
            
            if (user) {
                // Generate reset token
                const resetToken = this.generateResetToken();
                const resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour expiry
                
                // Store reset token
                const resetData = {
                    token: resetToken,
                    email: email,
                    expiry: resetExpiry,
                    used: false
                };
                
                localStorage.setItem(`reset_${email}`, JSON.stringify(resetData));
                
                // In production, send email
                console.log(`Reset link: ${window.location.origin}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`);
                
                // Update rate limit
                this.updateRateLimit();
                
                this.showMessage(
                    `Password reset link sent to ${email}. Please check your email.`,
                    'success'
                );
                
                // Clear form
                this.emailInput.value = '';
                
                // Redirect to login after 5 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 5000);
                
            } else {
                // For security, don't reveal that email doesn't exist
                await this.sleep(1000);
                this.showMessage(
                    'If an account exists with this email, you will receive a reset link.',
                    'success'
                );
                this.emailInput.value = '';
            }
            
        } catch (error) {
            console.error('Reset request failed:', error);
            this.showMessage('Failed to send reset link. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    generateResetToken() {
        return 'reset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 32);
    }
    
    setLoading(isLoading) {
        if (this.submitBtn) {
            if (isLoading) {
                this.submitBtn.disabled = true;
                this.submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
            } else {
                this.submitBtn.disabled = false;
                this.submitBtn.innerHTML = 'Send Reset Link';
            }
        }
    }
    
    showMessage(message, type) {
        if (this.messageDiv) {
            this.messageDiv.textContent = message;
            this.messageDiv.className = `message ${type}`;
            this.messageDiv.style.display = 'block';
            
            setTimeout(() => {
                this.messageDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    hideMessage() {
        if (this.messageDiv) {
            this.messageDiv.style.display = 'none';
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize forgot password handler
document.addEventListener('DOMContentLoaded', () => {
    window.forgotPasswordHandler = new ForgotPasswordHandler();
});