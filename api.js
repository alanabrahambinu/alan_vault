/* ========================================
   ALAN VAULT - API SERVICE
   REST API Communication Layer
   ======================================== */

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
    API: {
        BASE_URL: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : '/api',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    STORAGE_KEYS: {
        AUTH_TOKEN: 'authToken',
        USER_DATA: 'currentUser',
        VAULT_PREFIX: 'vault_'
    },
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/auth/login',
            SIGNUP: '/auth/signup',
            LOGOUT: '/auth/logout',
            VERIFY: '/auth/verify'
        },
        FILES: {
            LIST: '/files/list',
            UPLOAD: '/files/upload',
            DELETE: '/files/delete',
            RENAME: '/files/rename'
        },
        NOTES: {
            LIST: '/notes/list',
            CREATE: '/notes/create',
            UPDATE: '/notes/update',
            DELETE: '/notes/delete'
        },
        TASKS: {
            LIST: '/tasks/list',
            CREATE: '/tasks/create',
            UPDATE: '/tasks/update',
            DELETE: '/tasks/delete'
        },
        BOOKMARKS: {
            LIST: '/bookmarks/list',
            CREATE: '/bookmarks/create',
            DELETE: '/bookmarks/delete'
        },
        USER: {
            PROFILE: '/user/profile',
            UPDATE: '/user/update',
            DELETE: '/user/delete'
        },
        ADMIN: {
            USERS: '/admin/users',
            DELETE_USER: '/users'
        }
    }
};

// ========================================
// API SERVICE CLASS
// ========================================

class APIService {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL;
        this.timeout = CONFIG.API.TIMEOUT;
        this.retryAttempts = CONFIG.API.RETRY_ATTEMPTS;
        this.retryDelay = CONFIG.API.RETRY_DELAY;
        this.interceptors = {
            request: [],
            response: []
        };
        this.init();
    }
    
    init() {
        this.setupDefaultHeaders();
        this.loadAuthToken();
        this.setupSupabaseFallback();
    }
    
    setupSupabaseFallback() {
        // Check if Supabase is available via server
        this.useSupabase = true;
    }
    
    setupDefaultHeaders() {
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }
    
    loadAuthToken() {
        this.authToken = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        if (this.authToken) {
            this.defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
        }
    }
    
    setAuthToken(token) {
        this.authToken = token;
        if (token) {
            this.defaultHeaders['Authorization'] = `Bearer ${token}`;
            localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
        } else {
            delete this.defaultHeaders['Authorization'];
            localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        }
    }
    
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }
    
    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }
    
    async request(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        const config = this.buildConfig(options);
        
        // Apply request interceptors
        let processedConfig = config;
        for (const interceptor of this.interceptors.request) {
            processedConfig = await interceptor(processedConfig);
        }
        
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await this.fetchWithTimeout(url, processedConfig);
                const data = await this.parseResponse(response);
                
                // Apply response interceptors
                let processedData = data;
                for (const interceptor of this.interceptors.response) {
                    processedData = await interceptor(processedData);
                }
                
                if (!response.ok) {
                    throw new Error(data.message || data.error || `HTTP ${response.status}`);
                }
                
                return {
                    success: true,
                    data: processedData,
                    status: response.status,
                    headers: response.headers
                };
                
            } catch (error) {
                lastError = error;
                console.error(`API request failed (attempt ${attempt}/${this.retryAttempts}):`, error);
                
                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        
        // If all retries fail, try localStorage fallback for GET requests
        if (options.method === 'GET' || !options.method) {
            const fallbackData = this.getLocalFallback(endpoint);
            if (fallbackData) {
                console.log('Using localStorage fallback for:', endpoint);
                return {
                    success: true,
                    data: fallbackData,
                    status: 200,
                    fromFallback: true
                };
            }
        }
        
        return {
            success: false,
            error: lastError ? lastError.message : 'Request failed',
            status: lastError ? lastError.status || 500 : 500
        };
    }
    
    getLocalFallback(endpoint) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        if (!user.id) return null;
        
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        
        if (endpoint.includes('/files/list')) return { files: vault.files || [] };
        if (endpoint.includes('/notes/list')) return { notes: vault.notes || [] };
        if (endpoint.includes('/tasks/list')) return { tasks: vault.tasks || [] };
        if (endpoint.includes('/bookmarks/list')) return { bookmarks: vault.bookmarks || [] };
        if (endpoint.includes('/admin/users')) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            return { users: users };
        }
        
        return null;
    }
    
    async fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    buildURL(endpoint) {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${this.baseURL}/${cleanEndpoint}`;
    }
    
    buildConfig(options) {
        const config = {
            method: options.method || 'GET',
            headers: { ...this.defaultHeaders, ...options.headers },
            credentials: 'include'
        };
        
        if (options.body && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        } else if (options.body instanceof FormData) {
            config.body = options.body;
            delete config.headers['Content-Type'];
        }
        
        if (options.params) {
            config.params = options.params;
        }
        
        return config;
    }
    
    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else if (contentType && contentType.includes('text/')) {
            return await response.text();
        } else {
            return await response.blob();
        }
    }
    
    // HTTP Methods
    async get(endpoint, params = {}, options = {}) {
        const url = this.buildURLWithParams(endpoint, params);
        return this.request(url, { ...options, method: 'GET' });
    }
    
    async post(endpoint, data = {}, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body: data });
    }
    
    async put(endpoint, data = {}, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body: data });
    }
    
    async patch(endpoint, data = {}, options = {}) {
        return this.request(endpoint, { ...options, method: 'PATCH', body: data });
    }
    
    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
    
    async upload(endpoint, file, onProgress, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress(e.loaded / e.total);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        resolve(JSON.parse(xhr.response));
                    } catch (e) {
                        resolve({ success: true, message: 'Upload complete' });
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => reject(new Error('Network error')));
            
            xhr.open('POST', this.buildURL(endpoint));
            xhr.setRequestHeader('Authorization', this.defaultHeaders['Authorization'] || '');
            xhr.send(formData);
        });
    }
    
    buildURLWithParams(endpoint, params) {
        const url = this.buildURL(endpoint);
        if (!params || Object.keys(params).length === 0) return url;
        
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, value);
            }
        });
        
        return `${url}?${queryParams.toString()}`;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ========================================
    // AUTH ENDPOINTS
    // ========================================
    
    async login(email, password) {
        try {
            const response = await this.post(CONFIG.ENDPOINTS.AUTH.LOGIN, { email, password });
            if (response.success && response.data.token) {
                this.setAuthToken(response.data.token);
                if (response.data.user) {
                    localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
                }
            }
            return response;
        } catch (error) {
            console.error('Login error:', error);
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                const token = 'local_' + Date.now();
                this.setAuthToken(token);
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role || 'user'
                }));
                return { success: true, data: { token, user } };
            }
            return { success: false, error: 'Invalid credentials' };
        }
    }
    
    async signup(userData) {
        try {
            const response = await this.post(CONFIG.ENDPOINTS.AUTH.SIGNUP, userData);
            return response;
        } catch (error) {
            console.error('Signup error:', error);
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            if (users.find(u => u.email === userData.email)) {
                return { success: false, error: 'Email already registered' };
            }
            const newUser = {
                id: 'user_' + Date.now(),
                ...userData,
                role: 'user',
                status: 'active',
                createdAt: new Date().toISOString()
            };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            return { success: true, data: { user: newUser } };
        }
    }
    
    async logout() {
        const response = await this.post(CONFIG.ENDPOINTS.AUTH.LOGOUT);
        this.setAuthToken(null);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        return response;
    }
    
    async verifyToken() {
        return this.get(CONFIG.ENDPOINTS.AUTH.VERIFY);
    }
    
    // ========================================
    // FILE ENDPOINTS
    // ========================================
    
    async getFiles(folderId = null) {
        const params = folderId ? { folderId } : {};
        const response = await this.get(CONFIG.ENDPOINTS.FILES.LIST, params);
        if (response.success && response.data.files) {
            // Cache to localStorage
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.files = response.data.files;
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    async uploadFile(file, onProgress) {
        return this.upload(CONFIG.ENDPOINTS.FILES.UPLOAD, file, onProgress);
    }
    
    async deleteFile(fileId) {
        const response = await this.delete(`${CONFIG.ENDPOINTS.FILES.DELETE}/${fileId}`);
        if (response.success) {
            // Update local cache
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.files = vault.files.filter(f => f.id !== fileId);
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    async renameFile(fileId, newName) {
        return this.put(`${CONFIG.ENDPOINTS.FILES.RENAME}/${fileId}`, { name: newName });
    }
    
    // ========================================
    // NOTE ENDPOINTS
    // ========================================
    
    async getNotes() {
        const response = await this.get(CONFIG.ENDPOINTS.NOTES.LIST);
        if (response.success && response.data.notes) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.notes = response.data.notes;
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    async createNote(noteData) {
        const response = await this.post(CONFIG.ENDPOINTS.NOTES.CREATE, noteData);
        if (response.success) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.notes.push(response.data.note);
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    async updateNote(noteId, noteData) {
        return this.put(`${CONFIG.ENDPOINTS.NOTES.UPDATE}/${noteId}`, noteData);
    }
    
    async deleteNote(noteId) {
        const response = await this.delete(`${CONFIG.ENDPOINTS.NOTES.DELETE}/${noteId}`);
        if (response.success) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.notes = vault.notes.filter(n => n.id !== noteId);
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    // ========================================
    // TASK ENDPOINTS
    // ========================================
    
    async getTasks() {
        const response = await this.get(CONFIG.ENDPOINTS.TASKS.LIST);
        if (response.success && response.data.tasks) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.tasks = response.data.tasks;
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    async createTask(taskData) {
        const response = await this.post(CONFIG.ENDPOINTS.TASKS.CREATE, taskData);
        if (response.success) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.tasks.push(response.data.task);
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    async updateTask(taskId, taskData) {
        return this.put(`${CONFIG.ENDPOINTS.TASKS.UPDATE}/${taskId}`, taskData);
    }
    
    async deleteTask(taskId) {
        const response = await this.delete(`${CONFIG.ENDPOINTS.TASKS.DELETE}/${taskId}`);
        if (response.success) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.tasks = vault.tasks.filter(t => t.id !== taskId);
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    // ========================================
    // BOOKMARK ENDPOINTS
    // ========================================
    
    async getBookmarks() {
        const response = await this.get(CONFIG.ENDPOINTS.BOOKMARKS.LIST);
        if (response.success && response.data.bookmarks) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.bookmarks = response.data.bookmarks;
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    async createBookmark(bookmarkData) {
        const response = await this.post(CONFIG.ENDPOINTS.BOOKMARKS.CREATE, bookmarkData);
        if (response.success) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.bookmarks.push(response.data.bookmark);
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    async deleteBookmark(bookmarkId) {
        const response = await this.delete(`${CONFIG.ENDPOINTS.BOOKMARKS.DELETE}/${bookmarkId}`);
        if (response.success) {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            if (user.id) {
                const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
                const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
                vault.bookmarks = vault.bookmarks.filter(b => b.id !== bookmarkId);
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            }
        }
        return response;
    }
    
    // ========================================
    // USER ENDPOINTS
    // ========================================
    
    async getProfile() {
        return this.get(CONFIG.ENDPOINTS.USER.PROFILE);
    }
    
    async updateProfile(profileData) {
        return this.put(CONFIG.ENDPOINTS.USER.UPDATE, profileData);
    }
    
    async deleteAccount() {
        return this.delete(CONFIG.ENDPOINTS.USER.DELETE);
    }
    
    // ========================================
    // ADMIN ENDPOINTS
    // ========================================
    
    async getUsers() {
        const response = await this.get(CONFIG.ENDPOINTS.ADMIN.USERS);
        if (response.success && response.data.users) {
            localStorage.setItem('users', JSON.stringify(response.data.users));
        }
        return response;
    }
    
    async deleteUser(userId) {
        const response = await this.delete(`${CONFIG.ENDPOINTS.ADMIN.DELETE_USER}/${userId}`);
        if (response.success) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            localStorage.setItem('users', JSON.stringify(users.filter(u => u.id !== userId)));
        }
        return response;
    }
    
    // ========================================
    // MIGRATION
    // ========================================
    
    async migrateData(data) {
        return this.post('/migrate', { data });
    }
}

// ========================================
// INITIALIZE API SERVICE
// ========================================

const API = new APIService();
window.API = API;

console.log('🌐 API Service loaded (Supabase Ready)');
console.log('📡 API Base URL:', CONFIG.API.BASE_URL);
console.log('💡 Using localStorage fallback when API fails');