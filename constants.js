/* ========================================
   ALAN VAULT - CONSTANTS
   Application-Wide Constants
   ======================================== */

const CONSTANTS = {
    // App Info
    APP: {
        NAME: 'Alan Vault',
        VERSION: '2.0.0',
        DESCRIPTION: 'Secure Cloud Platform for Modern Workspace',
        AUTHOR: 'Alan Vault Team',
        YEAR: new Date().getFullYear()
    },
    
    // File Types
    FILE_TYPES: {
        IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
        DOCUMENTS: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt'],
        SPREADSHEETS: ['xls', 'xlsx', 'csv', 'ods'],
        PRESENTATIONS: ['ppt', 'pptx', 'odp'],
        AUDIO: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
        VIDEO: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv'],
        ARCHIVES: ['zip', 'rar', '7z', 'tar', 'gz'],
        CODE: ['js', 'html', 'css', 'py', 'java', 'cpp', 'c', 'rb', 'go', 'php', 'sql', 'json', 'xml']
    },
    
    // MIME Types
    MIME_TYPES: {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'json': 'application/json',
        'xml': 'application/xml',
        'zip': 'application/zip',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'flv': 'video/x-flv',
        'rar': 'application/vnd.rar',
        '7z': 'application/x-7z-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip',
        'rtf': 'application/rtf',
        'odt': 'application/vnd.oasis.opendocument.text',
        'ods': 'application/vnd.oasis.opendocument.spreadsheet',
        'odp': 'application/vnd.oasis.opendocument.presentation',
        'flac': 'audio/flac',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac'
    },
    
    // Icon Mapping
    FILE_ICONS: {
        pdf: '📕',
        doc: '📘',
        docx: '📘',
        xls: '📗',
        xlsx: '📗',
        ppt: '📙',
        pptx: '📙',
        txt: '📄',
        md: '📝',
        json: '🔧',
        html: '🌐',
        css: '🎨',
        js: '⚡',
        py: '🐍',
        java: '☕',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        gif: '🖼️',
        webp: '🖼️',
        svg: '🎨',
        bmp: '🖼️',
        ico: '🔰',
        mp3: '🎵',
        wav: '🎵',
        ogg: '🎵',
        flac: '🎵',
        m4a: '🎵',
        aac: '🎵',
        mp4: '🎬',
        webm: '🎬',
        avi: '🎬',
        mov: '🎬',
        mkv: '🎬',
        flv: '🎬',
        zip: '📦',
        rar: '📦',
        '7z': '📦',
        tar: '📦',
        gz: '📦',
        rtf: '📄',
        odt: '📄',
        ods: '📊',
        odp: '📽️',
        cpp: '⚙️',
        c: '⚙️',
        rb: '💎',
        go: '🐹',
        php: '🐘',
        sql: '🗄️',
        xml: '📰',
        default: '📄'
    },
    
    // Storage Limits
    STORAGE: {
        FREE: 5 * 1024 * 1024 * 1024,      // 5GB
        PREMIUM: 50 * 1024 * 1024 * 1024,   // 50GB
        BUSINESS: 250 * 1024 * 1024 * 1024, // 250GB
        ENTERPRISE: 1024 * 1024 * 1024 * 1024 // 1TB
    },
    
    // Pricing Plans
    PLANS: {
        FREE: {
            id: 'free',
            name: 'Free',
            price: 0,
            storage: 5 * 1024 * 1024 * 1024,
            features: ['5GB Storage', 'Basic Support', 'Up to 3 Devices']
        },
        PREMIUM: {
            id: 'premium',
            name: 'Premium',
            price: 9.99,
            storage: 50 * 1024 * 1024 * 1024,
            features: ['50GB Storage', 'Priority Support', 'Unlimited Devices', 'Advanced Analytics']
        },
        BUSINESS: {
            id: 'business',
            name: 'Business',
            price: 19.99,
            storage: 250 * 1024 * 1024 * 1024,
            features: ['250GB Storage', '24/7 Support', 'Team Collaboration', 'Admin Controls', 'API Access']
        }
    },
    
    // Task Priorities
    TASK_PRIORITIES: {
        LOW: { value: 'low', label: 'Low', color: '#10b981', order: 1 },
        MEDIUM: { value: 'medium', label: 'Medium', color: '#f59e0b', order: 2 },
        HIGH: { value: 'high', label: 'High', color: '#ef4444', order: 3 }
    },
    
    // Task Statuses
    TASK_STATUSES: {
        PENDING: { value: 'pending', label: 'Pending', color: '#f59e0b' },
        IN_PROGRESS: { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
        COMPLETED: { value: 'completed', label: 'Completed', color: '#10b981' },
        ARCHIVED: { value: 'archived', label: 'Archived', color: '#6B7280' }
    },
    
    // Note Categories
    NOTE_CATEGORIES: [
        { id: 'general', name: 'General', icon: '📄', color: '#6B7280' },
        { id: 'work', name: 'Work', icon: '💼', color: '#4F46E5' },
        { id: 'personal', name: 'Personal', icon: '👤', color: '#8B5CF6' },
        { id: 'ideas', name: 'Ideas', icon: '💡', color: '#10b981' },
        { id: 'projects', name: 'Projects', icon: '🚀', color: '#f59e0b' },
        { id: 'journal', name: 'Journal', icon: '📔', color: '#ec4899' }
    ],
    
    // Date Formats
    DATE_FORMATS: {
        DEFAULT: 'YYYY-MM-DD',
        DISPLAY: 'MMM DD, YYYY',
        DISPLAY_TIME: 'MMM DD, YYYY HH:mm',
        TIME: 'HH:mm:ss',
        TIME_SHORT: 'HH:mm',
        FULL: 'dddd, MMMM DD, YYYY HH:mm:ss',
        ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ'
    },
    
    // HTTP Status Codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        ACCEPTED: 202,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        TOO_MANY_REQUESTS: 429,
        SERVER_ERROR: 500,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503
    },
    
    // Error Codes
    ERROR_CODES: {
        NETWORK_ERROR: 'NETWORK_ERROR',
        UNAUTHORIZED: 'UNAUTHORIZED',
        FORBIDDEN: 'FORBIDDEN',
        NOT_FOUND: 'NOT_FOUND',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        SERVER_ERROR: 'SERVER_ERROR',
        QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
        FILE_TOO_LARGE: 'FILE_TOO_LARGE',
        INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
        DUPLICATE_ENTRY: 'DUPLICATE_ENTRY'
    },
    
    // Event Names
    EVENTS: {
        // Auth Events
        LOGIN: 'auth:login',
        LOGOUT: 'auth:logout',
        SESSION_EXPIRED: 'auth:session_expired',
        
        // File Events
        FILE_UPLOADED: 'file:uploaded',
        FILE_DELETED: 'file:deleted',
        FILE_RENAMED: 'file:renamed',
        FILE_MOVED: 'file:moved',
        
        // Note Events
        NOTE_CREATED: 'note:created',
        NOTE_UPDATED: 'note:updated',
        NOTE_DELETED: 'note:deleted',
        
        // Task Events
        TASK_CREATED: 'task:created',
        TASK_UPDATED: 'task:updated',
        TASK_DELETED: 'task:deleted',
        TASK_COMPLETED: 'task:completed',
        
        // Bookmark Events
        BOOKMARK_ADDED: 'bookmark:added',
        BOOKMARK_DELETED: 'bookmark:deleted',
        
        // UI Events
        THEME_CHANGED: 'ui:theme_changed',
        SIDEBAR_TOGGLE: 'ui:sidebar_toggle',
        MODAL_OPEN: 'ui:modal_open',
        MODAL_CLOSE: 'ui:modal_close',
        
        // Data Events
        DATA_UPDATED: 'data:updated',
        CACHE_CLEARED: 'cache:cleared'
    },
    
    // Default Avatars
    DEFAULT_AVATARS: [
        'https://ui-avatars.com/api/?background=4F46E5&color=fff&bold=true',
        'https://ui-avatars.com/api/?background=8B5CF6&color=fff&bold=true',
        'https://ui-avatars.com/api/?background=10b981&color=fff&bold=true',
        'https://ui-avatars.com/api/?background=f59e0b&color=fff&bold=true',
        'https://ui-avatars.com/api/?background=ef4444&color=fff&bold=true',
        'https://ui-avatars.com/api/?background=3b82f6&color=fff&bold=true'
    ],
    
    // Breakpoints (in pixels)
    BREAKPOINTS: {
        MOBILE: 480,
        TABLET: 768,
        LAPTOP: 1024,
        DESKTOP: 1280,
        WIDE: 1440
    },
    
    // Animation Durations (in milliseconds)
    ANIMATION_DURATIONS: {
        INSTANT: 0,
        FAST: 150,
        NORMAL: 300,
        SLOW: 500,
        VERY_SLOW: 1000
    },
    
    // Keyboard Shortcuts
    KEYBOARD_SHORTCUTS: {
        'ctrl+n': 'Create new note',
        'ctrl+t': 'Create new task',
        'ctrl+b': 'Add bookmark',
        'ctrl+k': 'Focus search',
        'ctrl+s': 'Save current item',
        'ctrl+d': 'Download file',
        'ctrl+/': 'Show keyboard shortcuts',
        'escape': 'Close modal',
        'ctrl+shift+d': 'Toggle dark mode'
    },
    
    // Social Media Links
    SOCIAL_LINKS: {
        GITHUB: 'https://github.com/alanvault',
        TWITTER: 'https://twitter.com/alanvault',
        DISCORD: 'https://discord.gg/alanvault',
        DOCS: 'https://docs.alanvault.com'
    }
};

// Freeze the main CONSTANTS object
Object.freeze(CONSTANTS);

// Freeze nested objects safely
if (CONSTANTS.FILE_TYPES) Object.freeze(CONSTANTS.FILE_TYPES);
if (CONSTANTS.MIME_TYPES) Object.freeze(CONSTANTS.MIME_TYPES);
if (CONSTANTS.FILE_ICONS) Object.freeze(CONSTANTS.FILE_ICONS);
if (CONSTANTS.STORAGE) Object.freeze(CONSTANTS.STORAGE);
if (CONSTANTS.PLANS) {
    Object.freeze(CONSTANTS.PLANS);
    if (CONSTANTS.PLANS.FREE) Object.freeze(CONSTANTS.PLANS.FREE);
    if (CONSTANTS.PLANS.PREMIUM) Object.freeze(CONSTANTS.PLANS.PREMIUM);
    if (CONSTANTS.PLANS.BUSINESS) Object.freeze(CONSTANTS.PLANS.BUSINESS);
}
if (CONSTANTS.TASK_PRIORITIES) Object.freeze(CONSTANTS.TASK_PRIORITIES);
if (CONSTANTS.TASK_STATUSES) Object.freeze(CONSTANTS.TASK_STATUSES);
if (CONSTANTS.NOTE_CATEGORIES) Object.freeze(CONSTANTS.NOTE_CATEGORIES);
if (CONSTANTS.DATE_FORMATS) Object.freeze(CONSTANTS.DATE_FORMATS);
if (CONSTANTS.HTTP_STATUS) Object.freeze(CONSTANTS.HTTP_STATUS);
if (CONSTANTS.ERROR_CODES) Object.freeze(CONSTANTS.ERROR_CODES);
if (CONSTANTS.EVENTS) Object.freeze(CONSTANTS.EVENTS);
if (CONSTANTS.DEFAULT_AVATARS) Object.freeze(CONSTANTS.DEFAULT_AVATARS);
if (CONSTANTS.BREAKPOINTS) Object.freeze(CONSTANTS.BREAKPOINTS);
if (CONSTANTS.ANIMATION_DURATIONS) Object.freeze(CONSTANTS.ANIMATION_DURATIONS);
if (CONSTANTS.KEYBOARD_SHORTCUTS) Object.freeze(CONSTANTS.KEYBOARD_SHORTCUTS);
if (CONSTANTS.SOCIAL_LINKS) Object.freeze(CONSTANTS.SOCIAL_LINKS);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTS;
}

// Make available globally
window.CONSTANTS = CONSTANTS;