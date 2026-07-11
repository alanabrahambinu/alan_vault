/* ========================================
   ALAN VAULT - HELPER FUNCTIONS
   Utility & Helper Methods
   ======================================== */

const Helpers = {
    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Merge objects deeply
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        return this.deepMerge(target, ...sources);
    },
    
    // Check if value is object
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Generate random ID
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Sleep/delay
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Retry function
    async retry(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        } catch (error) {
            if (retries <= 0) throw error;
            await this.sleep(delay);
            return this.retry(fn, retries - 1, delay * 2);
        }
    },
    
    // Get URL parameters
    getUrlParams() {
        const params = {};
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        
        return params;
    },
    
    // Update URL without reload
    updateUrlParams(params, replace = false) {
        const url = new URL(window.location.href);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        
        if (replace) {
            window.history.replaceState({}, '', url.toString());
        } else {
            window.history.pushState({}, '', url.toString());
        }
    },
    
    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy:', error);
            return false;
        }
    },
    
    // Download blob as file
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    },
    
    // Read file as data URL
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    },
    
    // Get file extension
    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    },
    
    // Check if running on mobile
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Check if running on touch device
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    // Get color based on string hash
    stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    },
    
    // Detect if element is in viewport
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    // Smooth scroll to element
    scrollToElement(element, offset = 0) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    },
    
    // Get dominant color from image
    getDominantColor(imageUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const colorCounts = {};
                
                for (let i = 0; i < data.length; i += 4) {
                    const rgb = `${data[i]},${data[i+1]},${data[i+2]}`;
                    colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
                }
                
                let dominantColor = Object.keys(colorCounts).reduce((a, b) => 
                    colorCounts[a] > colorCounts[b] ? a : b
                );
                
                resolve(`rgb(${dominantColor})`);
            };
            img.src = imageUrl;
        });
    },
    
    // Parse CSV
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const result = [];
        
        for (let i = 1; i < lines.length; i++) {
            const obj = {};
            const currentLine = lines[i].split(',');
            
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j].trim()] = currentLine[j]?.trim();
            }
            result.push(obj);
        }
        
        return result;
    },
    
    // Convert to CSV
    toCSV(data) {
        if (!data || !data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        csvRows.push(headers.join(','));
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    },
    
    // Escape HTML
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    // Unescape HTML
    unescapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent;
    },
    
    // Truncate text
    truncate(str, length, suffix = '...') {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length) + suffix;
    },
    
    // Capitalize first letter
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    // Title case
    titleCase(str) {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    },
    
    // Slugify
    slugify(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },
    
    // Compare semantic versions
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;
            
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        
        return 0;
    },
    
    // Wait for condition
    async waitFor(condition, interval = 100, timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) return true;
            await this.sleep(interval);
        }
        
        return false;
    }
};

window.Helpers = Helpers;