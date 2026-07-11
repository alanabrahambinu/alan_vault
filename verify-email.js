/* ========================================
   ALAN VAULT - EMAIL VERIFICATION
   Account Verification Handler
   ======================================== */

class EmailVerificationHandler {
    constructor() {
        this.codeInputs = document.querySelectorAll('.code-input');
        this.verifyBtn = document.getElementById('verifyBtn');
        this.resendLink = document.getElementById('resendLink');
        this.messageDiv = document.getElementById('message');
        this.emailDisplay = document.getElementById('userEmail');
        this.init();
    }
    
    init() {
        this.loadEmail();
        this.setupCodeInputs();
        this.setupEventListeners();
        this.startTimer();
        this.checkUrlToken();
    }
    
    loadEmail() {
        const email = sessionStorage.getItem('verifyEmail') || 
                     localStorage.getItem('pending_verification_email');
        
        if (email && this.emailDisplay) {
            this.emailDisplay.textContent = email;
            this.userEmail = email;
        }
    }
    
    setupCodeInputs() {
        // Auto-focus and navigate between inputs
        this.codeInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < this.codeInputs.length - 1) {
                    this.codeInputs[index + 1].focus();
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    this.codeInputs[index - 1].focus();
                }
            });
        });
        
        // Focus first input on load
        if (this.codeInputs[0]) {
            this.codeInputs[0].focus();
        }
    }
    
    setupEventListeners() {
        if (this.verifyBtn) {
            this.verifyBtn.addEventListener('click', () => this.verifyCode());
        }
        
        if (this.resendLink) {
            this.resendLink.addEventListener('click', () => this.resendCode());
        }
        
        // Paste entire code
        document.addEventListener('paste', (e) => {
            const paste = e.clipboardData.getData('text');
            if (paste.length === 6 && /^\d+$/.test(paste)) {
                e.preventDefault();
                this.fillCode(paste);
            }
        });
    }
    
    fillCode(code) {
        const digits = code.split('');
        this.codeInputs.forEach((input, index) => {
            if (digits[index]) {
                input.value = digits[index];
            }
        });
        this.codeInputs[this.codeInputs.length - 1].focus();
    }
    
    getEnteredCode() {
        let code = '';
        this.codeInputs.forEach(input => {
            code += input.value;
        });
        return code;
    }
    
    async verifyCode() {
        const code = this.getEnteredCode();
        
        if (code.length !== 6) {
            this.showMessage('Please enter the complete 6-digit code', 'error');
            return;
        }
        
        this.setLoading(true);
        this.hideMessage();
        
        await this.sleep(800);
        
        try {
            const expectedCode = localStorage.getItem(`verify_${this.userEmail}`);
            
            if (code === expectedCode) {
                await this.handleSuccessfulVerification();
            } else {
                this.showMessage('Invalid verification code. Please try again.', 'error');
                this.shakeInputs();
            }
            
        } catch (error) {
            console.error('Verification failed:', error);
            this.showMessage('Verification failed. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleSuccessfulVerification() {
        // Update user as verified
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.email === this.userEmail);
        
        if (userIndex !== -1) {
            users[userIndex].verified = true;
            users[userIndex].verifiedAt = new Date().toISOString();
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        // Clear verification data
        localStorage.removeItem(`verify_${this.userEmail}`);
        sessionStorage.removeItem('verifyEmail');
        localStorage.removeItem('pending_verification_email');
        
        this.showMessage('✓ Email verified successfully!', 'success');
        
        // Auto-login after verification
        const user = users[userIndex];
        if (user) {
            const token = this.generateToken();
            localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify({
                id: user.id,
                username: user.username,
                email: user.email,
                verified: true
            }));
            localStorage.setItem('loggedIn', 'true');
        }
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    }
    
    async resendCode() {
        if (this.isRateLimited()) {
            this.showMessage('Please wait before requesting another code.', 'error');
            return;
        }
        
        this.setLoading(true);
        this.hideMessage();
        
        await this.sleep(800);
        
        try {
            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
            localStorage.setItem(`verify_${this.userEmail}`, newCode);
            
            console.log(`New verification code: ${newCode}`);
            
            this.showMessage('New verification code sent!', 'success');
            this.startTimer();
            this.clearCodeInputs();
            
        } catch (error) {
            this.showMessage('Failed to resend code. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    isRateLimited() {
        const lastResend = localStorage.getItem('last_verification_resend');
        if (lastResend && Date.now() - parseInt(lastResend) < 60000) {
            return true;
        }
        return false;
    }
    
    startTimer() {
        let timeLeft = 60;
        const timerDisplay = document.getElementById('timerDisplay');
        
        if (!timerDisplay) return;
        
        localStorage.setItem('last_verification_resend', Date.now().toString());
        
        const interval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = `${timeLeft}s`;
            
            if (timeLeft <= 0) {
                clearInterval(interval);
                timerDisplay.textContent = '';
                if (this.resendLink) {
                    this.resendLink.style.pointerEvents = 'auto';
                    this.resendLink.style.opacity = '1';
                }
            }
        }, 1000);
        
        if (this.resendLink) {
            this.resendLink.style.pointerEvents = 'none';
            this.resendLink.style.opacity = '0.5';
        }
    }
    
    clearCodeInputs() {
        this.codeInputs.forEach(input => {
            input.value = '';
        });
        if (this.codeInputs[0]) {
            this.codeInputs[0].focus();
        }
    }
    
    shakeInputs() {
        this.codeInputs.forEach(input => {
            input.style.animation = 'shake 0.3s ease';
            setTimeout(() => {
                input.style.animation = '';
            }, 300);
        });
    }
    
    checkUrlToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const email = urlParams.get('email');
        
        if (token && email) {
            this.verifyWithToken(token, email);
        }
    }
    
    async verifyWithToken(token, email) {
        this.showMessage('Verifying your email...', 'info');
        
        await this.sleep(1000);
        
        const resetData = localStorage.getItem(`reset_${email}`);
        if (resetData) {
            const data = JSON.parse(resetData);
            if (data.token === token && !data.used && Date.now() < data.expiry) {
                data.used = true;
                localStorage.setItem(`reset_${email}`, JSON.stringify(data));
                await this.handleSuccessfulVerification();
            } else {
                this.showMessage('Invalid or expired verification link.', 'error');
            }
        } else {
            this.showMessage('Invalid verification link.', 'error');
        }
    }
    
    setLoading(isLoading) {
        if (this.verifyBtn) {
            if (isLoading) {
                this.verifyBtn.disabled = true;
                this.verifyBtn.innerHTML = '<span class="spinner"></span> Verifying...';
            } else {
                this.verifyBtn.disabled = false;
                this.verifyBtn.innerHTML = 'Verify Account';
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
    
    generateToken() {
        return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 32);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize verification handler
document.addEventListener('DOMContentLoaded', () => {
    window.verificationHandler = new EmailVerificationHandler();
});