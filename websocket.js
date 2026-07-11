/* ========================================
   ALAN VAULT - WEBSOCKET MANAGER
   Real-time Communication
   ======================================== */

class WebSocketService {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.listeners = {};
        this.isConnected = false;
        this.messageQueue = [];
        this.init();
    }
    
    init() {
        if (!CONFIG.FEATURES.WEBSOCKET_ENABLED) {
            console.log('WebSocket feature is disabled');
            return;
        }
        
        this.connect();
        
        // Handle online/offline
        window.addEventListener('online', () => this.connect());
        window.addEventListener('offline', () => this.disconnect());
    }
    
    connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return;
        }
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => this.handleOpen();
            this.socket.onmessage = (event) => this.handleMessage(event);
            this.socket.onerror = (error) => this.handleError(error);
            this.socket.onclose = () => this.handleClose();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.handleClose();
        }
    }
    
    handleOpen() {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send authentication
        this.authenticate();
        
        // Send queued messages
        this.flushQueue();
        
        this.dispatchEvent('connected');
    }
    
    authenticate() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
            this.send('auth', { token });
        }
    }
    
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;
            
            this.dispatchEvent(`message:${type}`, payload);
            this.dispatchEvent('message', { type, payload });
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }
    
    handleError(error) {
        console.error('WebSocket error:', error);
        this.dispatchEvent('error', error);
    }
    
    handleClose() {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.dispatchEvent('disconnected');
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => this.connect(), delay);
        }
    }
    
    send(type, payload = {}) {
        const message = {
            id: this.generateMessageId(),
            type: type,
            payload: payload,
            timestamp: new Date().toISOString()
        };
        
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            this.dispatchEvent(`sent:${type}`, payload);
        } else {
            this.messageQueue.push(message);
            console.log('Message queued (offline):', type);
        }
    }
    
    flushQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message.type, message.payload);
        }
    }
    
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    
    dispatchEvent(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
        
        // Also dispatch DOM event
        const domEvent = new CustomEvent(`websocket:${event}`, { detail: data });
        document.dispatchEvent(domEvent);
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
    }
    
    // Real-time features
    subscribeToRoom(roomId) {
        this.send('subscribe', { room: roomId });
    }
    
    unsubscribeFromRoom(roomId) {
        this.send('unsubscribe', { room: roomId });
    }
    
    sendTypingIndicator(roomId, isTyping) {
        this.send('typing', { room: roomId, typing: isTyping });
    }
    
    // Collaboration features
    broadcastNoteUpdate(noteId, content) {
        this.send('note_update', { noteId, content });
    }
    
    broadcastTaskUpdate(taskId, updates) {
        this.send('task_update', { taskId, updates });
    }
    
    // Presence
    updatePresence(status) {
        this.send('presence', { status, timestamp: Date.now() });
    }
    
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            attempts: this.reconnectAttempts,
            queueSize: this.messageQueue.length
        };
    }
}

// Initialize WebSocket service (if enabled)
let wsService = null;
if (CONFIG.FEATURES.WEBSOCKET_ENABLED) {
    wsService = new WebSocketService();
    window.wsService = wsService;
}