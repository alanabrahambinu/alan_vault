/* ========================================
   ALAN VAULT - API SERVICE
   REST API Communication Layer
   ======================================== */

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
                    throw new Error(data.message || `HTTP ${response.status}`);
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
        
        return {
            success: false,
            error: lastError.message,
            status: lastError.status || 500
        };
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
        // Remove leading slash if present
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
                    resolve(JSON.parse(xhr.response));
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => reject(new Error('Network error')));
            
            xhr.open('POST', this.buildURL(endpoint));
            xhr.setRequestHeader('Authorization', this.defaultHeaders['Authorization']);
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
    
    // Auth endpoints
    async login(email, password) {
        const response = await this.post(CONFIG.ENDPOINTS.AUTH.LOGIN, { email, password });
        if (response.success && response.data.token) {
            this.setAuthToken(response.data.token);
        }
        return response;
    }
    
    async signup(userData) {
        return this.post(CONFIG.ENDPOINTS.AUTH.SIGNUP, userData);
    }
    
    async logout() {
        const response = await this.post(CONFIG.ENDPOINTS.AUTH.LOGOUT);
        this.setAuthToken(null);
        return response;
    }
    
    async verifyToken() {
        return this.get(CONFIG.ENDPOINTS.AUTH.VERIFY);
    }
    
    // File endpoints
    async getFiles(folderId = null) {
        const params = folderId ? { folderId } : {};
        return this.get(CONFIG.ENDPOINTS.FILES.LIST, params);
    }
    
    async uploadFile(file, onProgress) {
        return this.upload(CONFIG.ENDPOINTS.FILES.UPLOAD, file, onProgress);
    }
    
    async deleteFile(fileId) {
        return this.delete(`${CONFIG.ENDPOINTS.FILES.DELETE}/${fileId}`);
    }
    
    async renameFile(fileId, newName) {
        return this.put(`${CONFIG.ENDPOINTS.FILES.RENAME}/${fileId}`, { name: newName });
    }
    
    // Note endpoints
    async getNotes() {
        return this.get(CONFIG.ENDPOINTS.NOTES.LIST);
    }
    
    async createNote(noteData) {
        return this.post(CONFIG.ENDPOINTS.NOTES.CREATE, noteData);
    }
    
    async updateNote(noteId, noteData) {
        return this.put(`${CONFIG.ENDPOINTS.NOTES.UPDATE}/${noteId}`, noteData);
    }
    
    async deleteNote(noteId) {
        return this.delete(`${CONFIG.ENDPOINTS.NOTES.DELETE}/${noteId}`);
    }
    
    // Task endpoints
    async getTasks() {
        return this.get(CONFIG.ENDPOINTS.TASKS.LIST);
    }
    
    async createTask(taskData) {
        return this.post(CONFIG.ENDPOINTS.TASKS.CREATE, taskData);
    }
    
    async updateTask(taskId, taskData) {
        return this.put(`${CONFIG.ENDPOINTS.TASKS.UPDATE}/${taskId}`, taskData);
    }
    
    async deleteTask(taskId) {
        return this.delete(`${CONFIG.ENDPOINTS.TASKS.DELETE}/${taskId}`);
    }
    
    // Bookmark endpoints
    async getBookmarks() {
        return this.get(CONFIG.ENDPOINTS.BOOKMARKS.LIST);
    }
    
    async createBookmark(bookmarkData) {
        return this.post(CONFIG.ENDPOINTS.BOOKMARKS.CREATE, bookmarkData);
    }
    
    async deleteBookmark(bookmarkId) {
        return this.delete(`${CONFIG.ENDPOINTS.BOOKMARKS.DELETE}/${bookmarkId}`);
    }
    
    // User endpoints
    async getProfile() {
        return this.get(CONFIG.ENDPOINTS.USER.PROFILE);
    }
    
    async updateProfile(profileData) {
        return this.put(CONFIG.ENDPOINTS.USER.UPDATE, profileData);
    }
    
    async deleteAccount() {
        return this.delete(CONFIG.ENDPOINTS.USER.DELETE);
    }
}

// Initialize API service
const API = new APIService();
window.API = API;