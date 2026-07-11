/* ========================================
   ALAN VAULT - ENCRYPTION SERVICE
   Data Security & Encryption
   ======================================== */

class EncryptionService {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.saltLength = 16;
        this.iterations = 100000;
        this.init();
    }
    
    async init() {
        // Check if Web Crypto API is available
        if (!window.crypto || !window.crypto.subtle) {
            console.warn('Web Crypto API not available. Encryption disabled.');
            this.isAvailable = false;
        } else {
            this.isAvailable = true;
        }
    }
    
    // Generate a cryptographic key from a password
    async deriveKey(password, salt) {
        if (!this.isAvailable) return null;
        
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
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
        
        return key;
    }
    
    // Generate a random salt
    generateSalt() {
        return window.crypto.getRandomValues(new Uint8Array(this.saltLength));
    }
    
    // Generate a random IV (Initialization Vector)
    generateIV() {
        return window.crypto.getRandomValues(new Uint8Array(this.ivLength));
    }
    
    // Encrypt text data
    async encryptText(text, password) {
        if (!this.isAvailable) {
            console.warn('Encryption not available');
            return { encrypted: btoa(text), iv: null, salt: null };
        }
        
        try {
            const encoder = new TextEncoder();
            const salt = this.generateSalt();
            const iv = this.generateIV();
            const key = await this.deriveKey(password, salt);
            
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encoder.encode(text)
            );
            
            return {
                encrypted: this.arrayBufferToBase64(encrypted),
                iv: this.arrayBufferToBase64(iv),
                salt: this.arrayBufferToBase64(salt)
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    
    // Decrypt text data
    async decryptText(encryptedData, password) {
        if (!this.isAvailable) {
            console.warn('Decryption not available');
            return atob(encryptedData.encrypted);
        }
        
        try {
            const decoder = new TextDecoder();
            const encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);
            const iv = this.base64ToArrayBuffer(encryptedData.iv);
            const salt = this.base64ToArrayBuffer(encryptedData.salt);
            const key = await this.deriveKey(password, salt);
            
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encrypted
            );
            
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    
    // Encrypt file
    async encryptFile(file, password) {
        if (!this.isAvailable) {
            console.warn('File encryption not available');
            return file;
        }
        
        try {
            const fileBuffer = await file.arrayBuffer();
            const salt = this.generateSalt();
            const iv = this.generateIV();
            const key = await this.deriveKey(password, salt);
            
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                fileBuffer
            );
            
            // Create encrypted file with metadata
            const encryptedFile = new Blob([encrypted], { type: 'application/octet-stream' });
            const metadata = {
                iv: this.arrayBufferToBase64(iv),
                salt: this.arrayBufferToBase64(salt),
                originalName: file.name,
                originalType: file.type,
                originalSize: file.size
            };
            
            return {
                file: encryptedFile,
                metadata: metadata
            };
        } catch (error) {
            console.error('File encryption failed:', error);
            throw new Error('Failed to encrypt file');
        }
    }
    
    // Decrypt file
    async decryptFile(encryptedFile, metadata, password) {
        if (!this.isAvailable) {
            console.warn('File decryption not available');
            return encryptedFile;
        }
        
        try {
            const fileBuffer = await encryptedFile.arrayBuffer();
            const iv = this.base64ToArrayBuffer(metadata.iv);
            const salt = this.base64ToArrayBuffer(metadata.salt);
            const key = await this.deriveKey(password, salt);
            
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                fileBuffer
            );
            
            return new File([decrypted], metadata.originalName, {
                type: metadata.originalType
            });
        } catch (error) {
            console.error('File decryption failed:', error);
            throw new Error('Failed to decrypt file');
        }
    }
    
    // Generate a secure random token
    generateToken(length = 32) {
        const bytes = new Uint8Array(length);
        window.crypto.getRandomValues(bytes);
        return this.arrayBufferToBase64(bytes).replace(/[^a-zA-Z0-9]/g, '');
    }
    
    // Hash a password (for storage, not for encryption)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await window.crypto.subtle.digest('SHA-256', data);
        return this.arrayBufferToBase64(hash);
    }
    
    // Verify password hash
    async verifyPassword(password, hash) {
        const newHash = await this.hashPassword(password);
        return newHash === hash;
    }
    
    // Encrypt object (JSON)
    async encryptObject(obj, password) {
        const jsonString = JSON.stringify(obj);
        return await this.encryptText(jsonString, password);
    }
    
    // Decrypt object (JSON)
    async decryptObject(encryptedData, password) {
        const jsonString = await this.decryptText(encryptedData, password);
        return JSON.parse(jsonString);
    }
    
    // ArrayBuffer to Base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    // Base64 to ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    // Simple XOR encryption for lightweight cases (not for sensitive data)
    xorEncrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result);
    }
    
    xorDecrypt(encrypted, key) {
        const decoded = atob(encrypted);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }
    
    // Encrypt localStorage data
    encryptLocalStorage(key, data, password) {
        const encrypted = this.xorEncrypt(JSON.stringify(data), password);
        localStorage.setItem(key, encrypted);
    }
    
    decryptLocalStorage(key, password) {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        const decrypted = this.xorDecrypt(encrypted, password);
        return JSON.parse(decrypted);
    }
    
    // Generate key pair for asymmetric encryption (future use)
    async generateKeyPair() {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256'
            },
            true,
            ['encrypt', 'decrypt']
        );
        
        return keyPair;
    }
    
    // Export public key
    async exportPublicKey(keyPair) {
        const exported = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
        return this.arrayBufferToBase64(exported);
    }
    
    // Import public key
    async importPublicKey(base64Key) {
        const keyBuffer = this.base64ToArrayBuffer(base64Key);
        return await window.crypto.subtle.importKey(
            'spki',
            keyBuffer,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['encrypt']
        );
    }
    
    // Check if encryption is available
    isEncryptionAvailable() {
        return this.isAvailable;
    }
}

// Initialize encryption service
const encryptionService = new EncryptionService();
window.encryptionService = encryptionService;