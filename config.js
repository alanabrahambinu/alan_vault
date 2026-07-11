/* ========================================
   ALAN VAULT - CONFIGURATION
   Application Settings & Constants
   ======================================== */

const CONFIG = {
    // App Information
    APP_NAME: 'Alan Vault',
    APP_VERSION: '2.0.0',
    APP_DESCRIPTION: 'Secure Cloud Platform for Modern Workspace',
    
    // API Configuration (for future backend integration)
    API: {
        BASE_URL: window.location.origin + '/api',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    
    // Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'auth_token',
        USER_DATA: 'currentUser',
        THEME: 'theme',
        SESSION_ID: 'session_id',
        LOGGED_IN: 'loggedIn',
        VAULT_PREFIX: 'vault_',
        SETTINGS_PREFIX: 'settings_',
        PROFILE_PREFIX: 'profile_',
        OFFLINE_QUEUE: 'offline_queue',
        CACHE_VERSION: 'cache_version'
    },
    
    // Security Settings
    SECURITY: {
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
        TOKEN_REFRESH_INTERVAL: 60 * 60 * 1000, // 1 hour
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
        ENCRYPTION_ENABLED: true,
        SALT_ROUNDS: 10
    },
    
    // File Settings
    FILES: {
        MAX_SIZE: 100 * 1024 * 1024, // 100MB
        ALLOWED_TYPES: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown',
            'application/json',
            'application/zip',
            'application/x-rar-compressed'
        ],
        CHUNK_SIZE: 1024 * 1024, // 1MB chunks for large files
        MAX_CONCURRENT_UPLOADS: 3
    },
    
    // Limits
    LIMITS: {
        MAX_NOTE_LENGTH: 100000,
        MAX_TASKS: 1000,
        MAX_BOOKMARKS: 500,
        MAX_FILES: 1000,
        MAX_FOLDERS: 100,
        MAX_NOTES: 500,
        STORAGE_LIMIT: 5 * 1024 * 1024 * 1024 // 5GB
    },
    
    // Feature Flags
    FEATURES: {
        OFFLINE_MODE: true,
        TWO_FACTOR_AUTH: false,
        FILE_ENCRYPTION: true,
        DARK_MODE: true,
        ANALYTICS: true,
        PWA_ENABLED: true,
        WEBSOCKET_ENABLED: false,
        SOCIAL_LOGIN: false
    },
    
    // UI Settings
    UI: {
        DEFAULT_THEME: 'dark',
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 3000,
        DEBOUNCE_DELAY: 300,
        ITEMS_PER_PAGE: 20,
        SIDEBAR_COLLAPSED: false
    },
    
    // Date Formats
    DATE_FORMATS: {
        FULL: 'MMMM DD, YYYY HH:mm:ss',
        DATE: 'MMMM DD, YYYY',
        TIME: 'HH:mm:ss',
        SHORT: 'MM/DD/YYYY',
        RELATIVE: true
    },
    
    // Endpoints (for future backend)
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/auth/login',
            SIGNUP: '/auth/signup',
            LOGOUT: '/auth/logout',
            VERIFY: '/auth/verify',
            REFRESH: '/auth/refresh',
            FORGOT_PASSWORD: '/auth/forgot-password',
            RESET_PASSWORD: '/auth/reset-password'
        },
        USER: {
            PROFILE: '/user/profile',
            UPDATE: '/user/update',
            DELETE: '/user/delete',
            SETTINGS: '/user/settings'
        },
        FILES: {
            UPLOAD: '/files/upload',
            LIST: '/files/list',
            DELETE: '/files/delete',
            RENAME: '/files/rename',
            DOWNLOAD: '/files/download',
            SHARE: '/files/share'
        },
        NOTES: {
            CREATE: '/notes/create',
            UPDATE: '/notes/update',
            DELETE: '/notes/delete',
            LIST: '/notes/list'
        },
        TASKS: {
            CREATE: '/tasks/create',
            UPDATE: '/tasks/update',
            DELETE: '/tasks/delete',
            LIST: '/tasks/list'
        },
        BOOKMARKS: {
            CREATE: '/bookmarks/create',
            UPDATE: '/bookmarks/update',
            DELETE: '/bookmarks/delete',
            LIST: '/bookmarks/list'
        }
    },
    
    // Error Messages
    ERRORS: {
        NETWORK_ERROR: 'Network error. Please check your connection.',
        UNAUTHORIZED: 'Session expired. Please login again.',
        FORBIDDEN: 'You do not have permission to access this resource.',
        NOT_FOUND: 'Resource not found.',
        SERVER_ERROR: 'Server error. Please try again later.',
        FILE_TOO_LARGE: 'File size exceeds the maximum limit of 100MB.',
        INVALID_FILE_TYPE: 'File type not allowed.',
        QUOTA_EXCEEDED: 'Storage quota exceeded.',
        RATE_LIMIT: 'Too many requests. Please slow down.'
    },
    
    // Success Messages
    SUCCESS: {
        LOGIN: 'Login successful! Redirecting...',
        LOGOUT: 'Logged out successfully.',
        UPLOAD: 'File uploaded successfully!',
        DELETE: 'Item deleted successfully.',
        UPDATE: 'Changes saved successfully!',
        CREATE: 'Item created successfully!'
    }
};

// Freeze configuration to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.API);
Object.freeze(CONFIG.SECURITY);
Object.freeze(CONFIG.FILES);
Object.freeze(CONFIG.LIMITS);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.UI);

// Export for use in other files
window.CONFIG = CONFIG;