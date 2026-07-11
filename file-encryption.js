/* ========================================
   ALAN VAULT - FILE ENCRYPTION HANDLER
   Encrypt & Decrypt Files
   ======================================== */

class FileEncryptionHandler {
    constructor() {
        this.encryptionKey = null;
        this.isAvailable = false;
        this.encryptedFiles = new Map();
        this.init();
    }
    
    async init() {
        await this.checkAvailability();
        this.loadEncryptedFiles();
        this.setupEventListeners();
    }
    
    async checkAvailability() {
        if (window.crypto && window.crypto.subtle) {
            this.isAvailable = true;
            console.log('Web Crypto API available for file encryption');
        } else {
            console.warn('Web Crypto API not available. File encryption disabled.');
            this.isAvailable = false;
        }
    }
    
    loadEncryptedFiles() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const encKey = `encrypted_files_${user.id}`;
        const saved = localStorage.getItem(encKey);
        
        if (saved) {
            const data = JSON.parse(saved);
            this.encryptedFiles = new Map(Object.entries(data));
        }
    }
    
    saveEncryptedFiles() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const encKey = `encrypted_files_${user.id}`;
        const obj = Object.fromEntries(this.encryptedFiles);
        localStorage.setItem(encKey, JSON.stringify(obj));
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const encryptBtn = e.target.closest('[data-encrypt]');
            if (encryptBtn) {
                const fileId = encryptBtn.dataset.fileId || encryptBtn.closest('[data-file-id]')?.dataset.fileId;
                if (fileId) {
                    this.toggleEncryption(fileId);
                }
            }
        });
    }
    
    async toggleEncryption(fileId) {
        const isEncrypted = this.isFileEncrypted(fileId);
        
        if (isEncrypted) {
            await this.decryptFile(fileId);
        } else {
            await this.encryptFile(fileId);
        }
    }
    
    async encryptFile(fileId) {
        if (!this.isAvailable) {
            this.showError('Encryption not available in this browser');
            return false;
        }
        
        const file = await this.getFileData(fileId);
        if (!file) {
            this.showError('File not found');
            return false;
        }
        
        const password = await this.getPassword('Enter encryption password:', true);
        if (!password) return false;
        
        this.showLoading(true);
        
        try {
            // Fetch file data
            const response = await fetch(file.data);
            const fileBuffer = await response.arrayBuffer();
            
            // Generate salt and IV
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            // Derive key from password
            const key = await this.deriveKey(password, salt);
            
            // Encrypt the file
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                fileBuffer
            );
            
            // Store encrypted file data
            const encryptedData = {
                encrypted: this.arrayBufferToBase64(encrypted),
                iv: this.arrayBufferToBase64(iv),
                salt: this.arrayBufferToBase64(salt),
                originalName: file.name,
                originalSize: file.size,
                originalType: file.type,
                encryptedAt: new Date().toISOString()
            };
            
            this.encryptedFiles.set(fileId, encryptedData);
            this.saveEncryptedFiles();
            
            // Update file in vault to mark as encrypted
            await this.markFileAsEncrypted(fileId, true);
            
            this.showNotification(`File "${file.name}" encrypted successfully`, 'success');
            
            document.dispatchEvent(new CustomEvent('file:encrypted', {
                detail: { fileId, fileName: file.name }
            }));
            
            return true;
            
        } catch (error) {
            console.error('Encryption failed:', error);
            this.showError('Failed to encrypt file');
            return false;
        } finally {
            this.showLoading(false);
        }
    }
    
    async decryptFile(fileId) {
        if (!this.isAvailable) {
            this.showError('Decryption not available in this browser');
            return false;
        }
        
        const encryptedData = this.encryptedFiles.get(fileId);
        if (!encryptedData) {
            this.showError('File is not encrypted');
            return false;
        }
        
        const password = await this.getPassword('Enter decryption password:');
        if (!password) return false;
        
        this.showLoading(true);
        
        try {
            // Get encrypted data
            const encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);
            const iv = this.base64ToArrayBuffer(encryptedData.iv);
            const salt = this.base64ToArrayBuffer(encryptedData.salt);
            
            // Derive key from password
            const key = await this.deriveKey(password, salt);
            
            // Decrypt the file
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encrypted
            );
            
            // Create new file from decrypted data
            const decryptedFile = new File([decrypted], encryptedData.originalName, {
                type: encryptedData.originalType
            });
            
            // Update file in vault
            await this.replaceWithDecryptedFile(fileId, decryptedFile);
            
            // Remove from encrypted files map
            this.encryptedFiles.delete(fileId);
            this.saveEncryptedFiles();
            
            this.showNotification(`File "${encryptedData.originalName}" decrypted successfully`, 'success');
            
            document.dispatchEvent(new CustomEvent('file:decrypted', {
                detail: { fileId, fileName: encryptedData.originalName }
            }));
            
            return true;
            
        } catch (error) {
            console.error('Decryption failed:', error);
            this.showError('Failed to decrypt file. Incorrect password?');
            return false;
        } finally {
            this.showLoading(false);
        }
    }
    
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        const key = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: 256
            },
            false,
            ['encrypt', 'decrypt']
        );
        
        return key;
    }
    
    getPassword(message, confirm = false) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'password-modal';
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
                <div class="password-modal-content" style="
                    background: #1a1a2e;
                    border-radius: 24px;
                    padding: 2rem;
                    width: 90%;
                    max-width: 400px;
                ">
                    <h3 style="margin-bottom: 1rem;">${message}</h3>
                    <input type="password" id="passwordInput" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                        margin-bottom: 1rem;
                    ">
                    ${confirm ? `
                        <input type="password" id="confirmPasswordInput" placeholder="Confirm password" style="
                            width: 100%;
                            padding: 0.75rem;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 8px;
                            color: white;
                            margin-bottom: 1rem;
                        ">
                    ` : ''}
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button id="cancelPassword" style="
                            padding: 0.5rem 1rem;
                            background: transparent;
                            border: 1px solid rgba(139,92,246,0.5);
                            border-radius: 8px;
                            color: #8B5CF6;
                            cursor: pointer;
                        ">Cancel</button>
                        <button id="confirmPassword" style="
                            padding: 0.5rem 1rem;
                            background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            cursor: pointer;
                        ">OK</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const passwordInput = modal.querySelector('#passwordInput');
            const confirmInput = modal.querySelector('#confirmPasswordInput');
            const confirmBtn = modal.querySelector('#confirmPassword');
            const cancelBtn = modal.querySelector('#cancelPassword');
            
            passwordInput.focus();
            
            confirmBtn.onclick = () => {
                const password = passwordInput.value;
                
                if (confirm && password !== confirmInput?.value) {
                    this.showError('Passwords do not match');
                    return;
                }
                
                if (!password) {
                    this.showError('Password cannot be empty');
                    return;
                }
                
                modal.remove();
                resolve(password);
            };
            
            cancelBtn.onclick = () => {
                modal.remove();
                resolve(null);
            };
            
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') confirmBtn.click();
            });
            
            if (confirmInput) {
                confirmInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') confirmBtn.click();
                });
            }
        });
    }
    
    async getFileData(fileId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        return vault.files.find(f => f.id === fileId);
    }
    
    async markFileAsEncrypted(fileId, isEncrypted) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        
        const fileIndex = vault.files.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
            vault.files[fileIndex].encrypted = isEncrypted;
            vault.files[fileIndex].encryptedAt = isEncrypted ? new Date().toISOString() : null;
            localStorage.setItem(vaultKey, JSON.stringify(vault));
            
            // Update UI
            this.updateEncryptionUI(fileId, isEncrypted);
        }
    }
    
    async replaceWithDecryptedFile(fileId, decryptedFile) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[]}');
        
        const fileIndex = vault.files.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
            // Update file data
            vault.files[fileIndex].data = URL.createObjectURL(decryptedFile);
            vault.files[fileIndex].size = decryptedFile.size;
            vault.files[fileIndex].encrypted = false;
            vault.files[fileIndex].decryptedAt = new Date().toISOString();
            
            localStorage.setItem(vaultKey, JSON.stringify(vault));
            
            // Refresh UI
            if (window.renderFiles) window.renderFiles();
        }
    }
    
    isFileEncrypted(fileId) {
        return this.encryptedFiles.has(fileId);
    }
    
    updateEncryptionUI(fileId, isEncrypted) {
        const encryptBtn = document.querySelector(`[data-file-id="${fileId}"] [data-encrypt], [data-encrypt][data-file-id="${fileId}"]`);
        if (encryptBtn) {
            encryptBtn.textContent = isEncrypted ? '🔓' : '🔒';
            encryptBtn.title = isEncrypted ? 'Decrypt file' : 'Encrypt file';
        }
    }
    
    getEncryptedFilesList() {
        return Array.from(this.encryptedFiles.keys());
    }
    
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    showLoading(show) {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.toggle('hidden', !show);
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

// Initialize file encryption handler
const fileEncryption = new FileEncryptionHandler();
window.fileEncryption = fileEncryption;