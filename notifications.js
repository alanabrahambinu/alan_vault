/* ========================================
   ALAN VAULT - NOTIFICATION MANAGER
   Toast, Alert & Push Notifications
   ======================================== */

class NotificationService {
    constructor() {
        this.container = null;
        this.permission = false;
        this.queue = [];
        this.defaultDuration = CONFIG.UI.TOAST_DURATION;
        this.init();
    }
    
    init() {
        this.createContainer();
        this.requestPermission();
    }
    
    createContainer() {
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }
        this.container = document.getElementById('notification-container');
    }
    
    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.permission = permission === 'granted';
        }
    }
    
    show(options) {
        const {
            title = 'Notification',
            message = '',
            type = 'info',
            duration = this.defaultDuration,
            onClick = null,
            onClose = null
        } = options;
        
        const notification = this.createToast(title, message, type, onClick, onClose);
        this.container.appendChild(notification);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
                if (onClose) onClose();
            }, duration);
        }
        
        // Also show system notification if permission granted
        if (this.permission && type !== 'error') {
            this.showSystemNotification(title, message);
        }
        
        return notification;
    }
    
    createToast(title, message, type, onClick, onClose) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        toast.innerHTML = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">
                <div class="notification-title">${this.escapeHtml(title)}</div>
                <div class="notification-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="notification-close">×</button>
        `;
        
        // Add close button handler
        const closeBtn = toast.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(toast);
            if (onClose) onClose();
        });
        
        // Add click handler
        if (onClick) {
            toast.addEventListener('click', onClick);
            toast.style.cursor = 'pointer';
        }
        
        // Animation
        toast.style.animation = 'slideInRight 0.3s ease';
        
        return toast;
    }
    
    remove(toast) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }
    
    clearAll() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }
    
    showSystemNotification(title, body) {
        if (this.permission) {
            const notification = new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            setTimeout(() => notification.close(), 5000);
        }
    }
    
    // Convenience methods
    success(message, title = 'Success') {
        return this.show({ title, message, type: 'success' });
    }
    
    error(message, title = 'Error') {
        return this.show({ title, message, type: 'error' });
    }
    
    warning(message, title = 'Warning') {
        return this.show({ title, message, type: 'warning' });
    }
    
    info(message, title = 'Info') {
        return this.show({ title, message, type: 'info' });
    }
    
    // Loading notification
    loading(message, title = 'Loading') {
        const notification = this.show({ 
            title, 
            message, 
            type: 'info', 
            duration: 0 
        });
        
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.style.cssText = `
            width: 16px;
            height: 16px;
            border: 2px solid rgba(139,92,246,0.3);
            border-top-color: #8B5CF6;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            display: inline-block;
            margin-left: 8px;
        `;
        
        const iconDiv = notification.querySelector('.notification-icon');
        if (iconDiv) {
            iconDiv.innerHTML = '';
            iconDiv.appendChild(loader);
        }
        
        return notification;
    }
    
    updateLoading(notification, success, message) {
        const iconDiv = notification.querySelector('.notification-icon');
        if (iconDiv) {
            iconDiv.innerHTML = success ? '✓' : '✕';
            notification.className = `notification-toast ${success ? 'success' : 'error'}`;
        }
        
        const messageDiv = notification.querySelector('.notification-message');
        if (messageDiv) {
            messageDiv.textContent = message;
        }
        
        setTimeout(() => this.remove(notification), 2000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize notification service
const notify = new NotificationService();
window.notify = notify;