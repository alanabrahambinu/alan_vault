/* ========================================
   ALAN VAULT - TWO-FACTOR AUTHENTICATION
   2FA Setup & Verification
   ======================================== */

class TwoFactorAuth {
    constructor() {
        this.secret = null;
        this.qrCode = null;
        this.recoveryCodes = [];
        this.isEnabled = false;
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.setupEventListeners();
    }
    
    loadSettings() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const twoFactorData = localStorage.getItem(`2fa_${user.id}`);
        
        if (twoFactorData) {
            const data = JSON.parse(twoFactorData);
            this.isEnabled = data.enabled;
            this.recoveryCodes = data.recoveryCodes || [];
        }
    }
    
    setupEventListeners() {
        // Setup 2FA toggle
        const toggle2fa = document.getElementById('toggle2FA');
        if (toggle2fa) {
            toggle2fa.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.setup2FA();
                } else {
                    this.disable2FA();
                }
            });
            toggle2fa.checked = this.isEnabled;
        }
        
        // Setup verify button
        const verifyBtn = document.getElementById('verify2FA');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.verifyCode());
        }
    }
    
    async setup2FA() {
        this.showLoader(true);
        
        try {
            // Generate secret
            this.secret = this.generateSecret();
            
            // Generate QR code
            this.qrCode = await this.generateQRCode(this.secret);
            
            // Generate recovery codes
            this.recoveryCodes = this.generateRecoveryCodes();
            
            // Show setup modal
            this.showSetupModal();
            
        } catch (error) {
            console.error('2FA setup failed:', error);
            this.showError('Failed to setup 2FA. Please try again.');
        } finally {
            this.showLoader(false);
        }
    }
    
    generateSecret() {
        // Generate a random base32 secret
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }
    
    async generateQRCode(secret) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const issuer = CONFIG.APP_NAME;
        const account = user.email;
        
        const otpauth = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`;
        
        // In production, use a QR code library
        // For demo, return a placeholder
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
    }
    
    generateRecoveryCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            const code = this.generateRecoveryCode();
            codes.push({
                code: code,
                used: false
            });
        }
        return codes;
    }
    
    generateRecoveryCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            if (i === 4) code += '-';
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    showSetupModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-overlay" style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div class="modal-content" style="background: #1a1a2e; border-radius: 24px; padding: 32px; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                    <h3 style="margin-bottom: 16px;">Set Up Two-Factor Authentication</h3>
                    
                    <div style="margin-bottom: 24px;">
                        <p style="color: #a1a1aa; margin-bottom: 16px;">Scan this QR code with your authenticator app:</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <img src="${this.qrCode}" alt="QR Code" style="background: white; padding: 10px; border-radius: 12px;">
                        </div>
                        <p style="color: #a1a1aa; font-size: 14px;">Or enter this code manually:</p>
                        <code style="display: block; text-align: center; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin: 8px 0; font-size: 18px; letter-spacing: 2px;">${this.secret.match(/.{1,4}/g).join(' ')}</code>
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <label>Enter verification code:</label>
                        <input type="text" id="verificationCode" maxlength="6" placeholder="000000" style="width: 100%; padding: 12px; margin-top: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; text-align: center; font-size: 20px; letter-spacing: 4px;">
                    </div>
                    
                    <div id="recoveryCodesSection" style="display: none; margin-bottom: 24px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 16px;">
                        <p style="color: #10b981; margin-bottom: 12px;">✓ 2FA Enabled! Save your recovery codes:</p>
                        <div id="recoveryCodesList" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-family: monospace;"></div>
                        <p style="font-size: 12px; color: #71717a; margin-top: 12px;">Store these codes in a safe place. Each code can only be used once.</p>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="cancel2FA" style="padding: 8px 16px; background: transparent; border: 1px solid rgba(139,92,246,0.5); border-radius: 8px; color: #8B5CF6; cursor: pointer;">Cancel</button>
                        <button id="verify2FABtn" style="padding: 8px 16px; background: linear-gradient(135deg, #4F46E5, #8B5CF6); border: none; border-radius: 8px; color: white; cursor: pointer;">Verify & Enable</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const verifyBtn = modal.querySelector('#verify2FABtn');
        const cancelBtn = modal.querySelector('#cancel2FA');
        const codeInput = modal.querySelector('#verificationCode');
        
        verifyBtn.onclick = () => {
            const code = codeInput.value;
            this.verifyAndEnable(code, modal);
        };
        
        cancelBtn.onclick = () => {
            modal.remove();
            this.disable2FA();
        };
        
        codeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    }
    
    async verifyAndEnable(code, modal) {
        if (!code || code.length !== 6) {
            this.showError('Please enter a valid 6-digit code', modal);
            return;
        }
        
        this.showLoader(true);
        
        // Simulate verification
        await this.sleep(800);
        
        // In production, verify with server
        const isValid = this.verifyTOTP(code, this.secret);
        
        if (isValid) {
            this.enable2FA(modal);
        } else {
            this.showError('Invalid verification code. Please try again.', modal);
            this.showLoader(false);
        }
    }
    
    verifyTOTP(code, secret) {
        // Simple TOTP verification for demo
        // In production, use proper TOTP library
        return code === '123456'; // Demo only
    }
    
    enable2FA(modal) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        
        // Save 2FA settings
        const twoFactorData = {
            enabled: true,
            secret: this.secret,
            recoveryCodes: this.recoveryCodes,
            enabledAt: new Date().toISOString()
        };
        
        localStorage.setItem(`2fa_${user.id}`, JSON.stringify(twoFactorData));
        this.isEnabled = true;
        
        // Show recovery codes
        const recoverySection = modal.querySelector('#recoveryCodesSection');
        const recoveryList = modal.querySelector('#recoveryCodesList');
        
        if (recoveryList) {
            recoveryList.innerHTML = this.recoveryCodes.map(rc => `
                <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; text-align: center;">
                    ${rc.code}
                </div>
            `).join('');
        }
        
        if (recoverySection) {
            recoverySection.style.display = 'block';
        }
        
        // Update toggle
        const toggle2fa = document.getElementById('toggle2FA');
        if (toggle2fa) toggle2fa.checked = true;
        
        // Hide verify button and show done
        const verifyBtn = modal.querySelector('#verify2FABtn');
        if (verifyBtn) {
            verifyBtn.textContent = 'Done';
            verifyBtn.onclick = () => modal.remove();
        }
        
        const codeInput = modal.querySelector('#verificationCode');
        if (codeInput) codeInput.style.display = 'none';
        
        this.showSuccess('Two-factor authentication enabled!');
        this.showLoader(false);
    }
    
    async disable2FA() {
        const confirmed = confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.');
        
        if (!confirmed) {
            const toggle = document.getElementById('toggle2FA');
            if (toggle) toggle.checked = true;
            return;
        }
        
        this.showLoader(true);
        
        // Simulate API call
        await this.sleep(800);
        
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        localStorage.removeItem(`2fa_${user.id}`);
        
        this.isEnabled = false;
        this.secret = null;
        this.recoveryCodes = [];
        
        this.showSuccess('Two-factor authentication disabled.');
        this.showLoader(false);
    }
    
    async verifyForLogin() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-overlay" style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                    <div class="modal-content" style="background: #1a1a2e; border-radius: 24px; padding: 32px; max-width: 400px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
                        <h3>Two-Factor Authentication</h3>
                        <p style="color: #a1a1aa; margin: 16px 0;">Enter the verification code from your authenticator app.</p>
                        
                        <input type="text" id="2faCode" maxlength="6" placeholder="000000" style="width: 100%; padding: 12px; margin: 16px 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; text-align: center; font-size: 20px; letter-spacing: 4px;">
                        
                        <div style="margin: 16px 0;">
                            <a href="#" id="useRecoveryCode" style="color: #8B5CF6; text-decoration: none; font-size: 14px;">Use recovery code instead</a>
                        </div>
                        
                        <div id="recoveryInput" style="display: none;">
                            <input type="text" id="recoveryCodeInput" placeholder="XXXX-XXXX" style="width: 100%; padding: 12px; margin: 16px 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; text-align: center;">
                        </div>
                        
                        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px;">
                            <button id="cancelLogin" style="padding: 8px 16px; background: transparent; border: 1px solid rgba(239,68,68,0.5); border-radius: 8px; color: #ef4444; cursor: pointer;">Cancel</button>
                            <button id="verifyLogin" style="padding: 8px 16px; background: linear-gradient(135deg, #4F46E5, #8B5CF6); border: none; border-radius: 8px; color: white; cursor: pointer;">Verify</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            let isRecovery = false;
            
            document.getElementById('useRecoveryCode').onclick = (e) => {
                e.preventDefault();
                isRecovery = true;
                document.getElementById('recoveryInput').style.display = 'block';
                document.querySelector('#2faCode').style.display = 'none';
                e.target.textContent = 'Use authenticator code instead';
                e.target.onclick = (e2) => {
                    e2.preventDefault();
                    isRecovery = false;
                    document.getElementById('recoveryInput').style.display = 'none';
                    document.querySelector('#2faCode').style.display = 'block';
                    e2.target.textContent = 'Use recovery code instead';
                };
            };
            
            document.getElementById('verifyLogin').onclick = async () => {
                let isValid = false;
                
                if (isRecovery) {
                    const recoveryCode = document.getElementById('recoveryCodeInput').value;
                    isValid = this.verifyRecoveryCode(recoveryCode);
                } else {
                    const code = document.getElementById('2faCode').value;
                    isValid = this.verifyTOTP(code, this.secret);
                }
                
                if (isValid) {
                    modal.remove();
                    resolve(true);
                } else {
                    alert('Invalid code. Please try again.');
                }
            };
            
            document.getElementById('cancelLogin').onclick = () => {
                modal.remove();
                resolve(false);
            };
        });
    }
    
    verifyRecoveryCode(code) {
        const recoveryCode = this.recoveryCodes.find(rc => rc.code === code && !rc.used);
        
        if (recoveryCode) {
            recoveryCode.used = true;
            
            // Save updated recovery codes
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            const twoFactorData = JSON.parse(localStorage.getItem(`2fa_${user.id}`) || '{}');
            twoFactorData.recoveryCodes = this.recoveryCodes;
            localStorage.setItem(`2fa_${user.id}`, JSON.stringify(twoFactorData));
            
            return true;
        }
        
        return false;
    }
    
    showLoader(show) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.toggle('hidden', !show);
        }
    }
    
    showError(message, modal = null) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10001; animation: slideInRight 0.3s ease;">
                ${message}
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 3000);
        
        if (modal) {
            const codeInput = modal.querySelector('#verificationCode');
            if (codeInput) {
                codeInput.style.borderColor = '#ef4444';
                setTimeout(() => {
                    codeInput.style.borderColor = '';
                }, 2000);
            }
        }
    }
    
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-toast';
        successDiv.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; z-index: 10001; animation: slideInRight 0.3s ease;">
                ${message}
            </div>
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => successDiv.remove(), 3000);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    is2FAEnabled() {
        return this.isEnabled;
    }
    
    getRecoveryCodes() {
        return this.recoveryCodes.filter(rc => !rc.used).map(rc => rc.code);
    }
}

// Initialize two-factor authentication
const twoFactorAuth = new TwoFactorAuth();
window.twoFactorAuth = twoFactorAuth;