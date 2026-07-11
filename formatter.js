/* ========================================
   ALAN VAULT - FORMATTER
   Data Formatting Utilities
   ======================================== */

class Formatter {
    // Format bytes to human readable
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    // Format number with commas
    static formatNumber(num, decimals = 0) {
        return num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    
    // Format currency
    static formatCurrency(amount, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
    
    // Format percentage
    static formatPercentage(value, decimals = 1) {
        return `${value.toFixed(decimals)}%`;
    }
    
    // Format date
    static formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }
    
    // Format relative time
    static formatRelativeTime(date) {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now - past;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        
        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
        if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
        return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    }
    
    // Format phone number
    static formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        
        if (match) {
            return '(' + match[1] + ') ' + match[2] + '-' + match[3];
        }
        
        return phone;
    }
    
    // Format credit card number
    static formatCreditCard(cardNumber) {
        const cleaned = cardNumber.replace(/\D/g, '');
        const groups = cleaned.match(/.{1,4}/g);
        return groups ? groups.join(' ') : cardNumber;
    }
    
    // Format file size
    static formatFileSize(bytes) {
        return this.formatBytes(bytes);
    }
    
    // Format duration (seconds to HH:MM:SS)
    static formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Format time ago
    static formatTimeAgo(date) {
        return this.formatRelativeTime(date);
    }
    
    // Format as JSON with indentation
    static formatJSON(obj, indent = 2) {
        return JSON.stringify(obj, null, indent);
    }
    
    // Truncate text
    static truncate(text, length, suffix = '...') {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + suffix;
    }
    
    // Format name (capitalize each word)
    static formatName(name) {
        return name
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    // Format initials (for avatar)
    static getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    // Format slug from title
    static formatSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    // Format bytes per second to speed
    static formatSpeed(bytesPerSecond) {
        if (bytesPerSecond === 0) return '0 B/s';
        return this.formatBytes(bytesPerSecond) + '/s';
    }
    
    // Format percentage change
    static formatPercentageChange(oldValue, newValue) {
        if (oldValue === 0) return '+100%';
        const change = ((newValue - oldValue) / oldValue) * 100;
        const sign = change > 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}%`;
    }
    
    // Format as list
    static formatList(items, conjunction = 'and') {
        if (!items || items.length === 0) return '';
        if (items.length === 1) return items[0];
        if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
        
        const last = items.pop();
        return `${items.join(', ')} ${conjunction} ${last}`;
    }
    
    // Format file extension with icon
    static getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
            ppt: '📙', pptx: '📙', jpg: '🖼️', jpeg: '🖼️', png: '🖼️',
            gif: '🖼️', mp4: '🎬', mp3: '🎵', zip: '📦', rar: '📦',
            txt: '📄', md: '📝', json: '🔧', html: '🌐', css: '🎨',
            js: '⚡', py: '🐍', java: '☕', cpp: '⚙️'
        };
        return icons[ext] || '📄';
    }
    
    // Format duration between dates
    static formatDurationBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end - start;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffDays > 0) {
            return `${diffDays}d ${diffHours}h`;
        }
        if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m`;
        }
        return `${diffMinutes}m`;
    }
}

window.Formatter = Formatter;