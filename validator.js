/* ========================================
   ALAN VAULT - VALIDATOR
   Input Validation & Sanitization
   ======================================== */

class Validator {
    // Email validation
    static isEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // URL validation
    static isURL(url, requireProtocol = true) {
        try {
            const urlObj = new URL(url);
            return requireProtocol ? true : ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }
    
    // Phone number validation
    static isPhone(phone) {
        const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/;
        return phoneRegex.test(phone);
    }
    
    // Username validation
    static isUsername(username, minLength = 3, maxLength = 20) {
        if (!username) return false;
        if (username.length < minLength || username.length > maxLength) return false;
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        return usernameRegex.test(username);
    }
    
    // Password validation
    static isPassword(password, minLength = 6) {
        if (!password) return false;
        if (password.length < minLength) return false;
        return true;
    }
    
    // Strong password validation
    static isStrongPassword(password) {
        if (!password || password.length < 8) return false;
        
        let strength = 0;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        return strength >= 3;
    }
    
    // UUID validation
    static isUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    
    // IP Address validation
    static isIP(ip) {
        const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }
    
    // Date validation
    static isDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
    
    // Future date validation
    static isFutureDate(dateString) {
        const date = new Date(dateString);
        return date > new Date();
    }
    
    // Past date validation
    static isPastDate(dateString) {
        const date = new Date(dateString);
        return date < new Date();
    }
    
    // Number validation
    static isNumber(value, min = null, max = null) {
        const num = Number(value);
        if (isNaN(num)) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    }
    
    // Integer validation
    static isInteger(value, min = null, max = null) {
        if (!Number.isInteger(Number(value))) return false;
        return this.isNumber(value, min, max);
    }
    
    // Credit card validation (Luhn algorithm)
    static isCreditCard(cardNumber) {
        const sanitized = cardNumber.replace(/\D/g, '');
        if (sanitized.length < 13 || sanitized.length > 19) return false;
        
        let sum = 0;
        let double = false;
        
        for (let i = sanitized.length - 1; i >= 0; i--) {
            let digit = parseInt(sanitized.charAt(i), 10);
            
            if (double) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            
            sum += digit;
            double = !double;
        }
        
        return (sum % 10) === 0;
    }
    
    // Hex color validation
    static isHexColor(color) {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return hexRegex.test(color);
    }
    
    // RGB color validation
    static isRGBColor(color) {
        const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;
        if (!rgbRegex.test(color)) return false;
        
        const matches = color.match(/\d+/g);
        return matches.every(value => value >= 0 && value <= 255);
    }
    
    // JSON validation
    static isJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch {
            return false;
        }
    }
    
    // Base64 validation
    static isBase64(str) {
        const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        return base64Regex.test(str);
    }
    
    // Empty check
    static isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }
    
    // Between check
    static isBetween(value, min, max) {
        if (typeof value === 'number') {
            return value >= min && value <= max;
        }
        if (typeof value === 'string') {
            return value.length >= min && value.length <= max;
        }
        if (Array.isArray(value)) {
            return value.length >= min && value.length <= max;
        }
        return false;
    }
    
    // In array check
    static isInArray(value, array) {
        return array.includes(value);
    }
    
    // Regex match
    static matchesRegex(value, regex) {
        return regex.test(value);
    }
    
    // File type validation
    static isFileType(file, allowedTypes) {
        return allowedTypes.includes(file.type);
    }
    
    // File size validation
    static isFileSize(file, maxSize) {
        return file.size <= maxSize;
    }
    
    // Object schema validation
    static validateObject(obj, schema) {
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = obj[field];
            
            if (rules.required && this.isEmpty(value)) {
                errors.push(`${field} is required`);
                continue;
            }
            
            if (!this.isEmpty(value) && rules.type) {
                const type = typeof value;
                if (type !== rules.type) {
                    errors.push(`${field} must be of type ${rules.type}`);
                }
            }
            
            if (!this.isEmpty(value) && rules.min !== undefined) {
                if (typeof value === 'string' && value.length < rules.min) {
                    errors.push(`${field} must be at least ${rules.min} characters`);
                }
                if (typeof value === 'number' && value < rules.min) {
                    errors.push(`${field} must be at least ${rules.min}`);
                }
            }
            
            if (!this.isEmpty(value) && rules.max !== undefined) {
                if (typeof value === 'string' && value.length > rules.max) {
                    errors.push(`${field} must be at most ${rules.max} characters`);
                }
                if (typeof value === 'number' && value > rules.max) {
                    errors.push(`${field} must be at most ${rules.max}`);
                }
            }
            
            if (!this.isEmpty(value) && rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${field} has invalid format`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Sanitize input (XSS prevention)
    static sanitize(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    // Sanitize for SQL (basic)
    static sanitizeSQL(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
                switch (char) {
                    case '\0': return '\\0';
                    case '\b': return '\\b';
                    case '\t': return '\\t';
                    case '\n': return '\\n';
                    case '\r': return '\\r';
                    case '"': return '\\"';
                    case "'": return "\\'";
                    case '\\': return '\\\\';
                    case '%': return '\\%';
                    default: return char;
                }
            });
    }
    
    // Sanitize filename
    static sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9.\-_]/g, '_')
            .replace(/_{2,}/g, '_');
    }
}

window.Validator = Validator;