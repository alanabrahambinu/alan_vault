/* ========================================
   ALAN VAULT - DEVICE MANAGEMENT
   Track & Manage Connected Devices
   ======================================== */

class DeviceManager {
    constructor() {
        this.devices = [];
        this.currentDeviceId = this.getDeviceId();
        this.init();
    }
    
    init() {
        this.loadDevices();
        this.registerCurrentDevice();
        this.setupEventListeners();
        this.renderDevices();
        this.startHeartbeat();
    }
    
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }
    
    getDeviceInfo() {
        return {
            id: this.currentDeviceId,
            name: this.getDeviceName(),
            browser: this.getBrowserInfo(),
            os: this.getOSInfo(),
            lastActive: new Date().toISOString(),
            current: true,
            ip: 'client-side',
            location: 'Unknown'
        };
    }
    
    getDeviceName() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const savedName = localStorage.getItem('device_name');
        if (savedName) return savedName;
        
        // Generate default device name
        const browser = this.getBrowserInfo();
        const os = this.getOSInfo();
        return `${browser} on ${os}`;
    }
    
    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown Browser';
    }
    
    getOSInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac')) return 'macOS';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS')) return 'iOS';
        return 'Unknown OS';
    }
    
    loadDevices() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const devicesKey = `devices_${user.id}`;
        const saved = localStorage.getItem(devicesKey);
        
        if (saved) {
            this.devices = JSON.parse(saved);
        }
    }
    
    saveDevices() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const devicesKey = `devices_${user.id}`;
        localStorage.setItem(devicesKey, JSON.stringify(this.devices));
    }
    
    registerCurrentDevice() {
        const existingIndex = this.devices.findIndex(d => d.id === this.currentDeviceId);
        const deviceInfo = this.getDeviceInfo();
        
        if (existingIndex !== -1) {
            this.devices[existingIndex] = { ...this.devices[existingIndex], ...deviceInfo, lastActive: new Date().toISOString() };
        } else {
            this.devices.unshift(deviceInfo);
        }
        
        // Keep only last 10 devices
        if (this.devices.length > 10) {
            this.devices = this.devices.slice(0, 10);
        }
        
        this.saveDevices();
    }
    
    startHeartbeat() {
        setInterval(() => {
            this.updateDeviceActivity();
        }, 60000); // Update every minute
    }
    
    updateDeviceActivity() {
        const device = this.devices.find(d => d.id === this.currentDeviceId);
        if (device) {
            device.lastActive = new Date().toISOString();
            this.saveDevices();
            this.renderDevices();
        }
    }
    
    renameDevice(deviceId, newName) {
        const device = this.devices.find(d => d.id === deviceId);
        if (device) {
            device.name = newName;
            this.saveDevices();
            this.renderDevices();
            
            if (deviceId === this.currentDeviceId) {
                localStorage.setItem('device_name', newName);
            }
            
            this.showNotification('Device renamed', 'success');
        }
    }
    
    removeDevice(deviceId) {
        if (deviceId === this.currentDeviceId) {
            this.showError('Cannot remove current device');
            return;
        }
        
        this.devices = this.devices.filter(d => d.id !== deviceId);
        this.saveDevices();
        this.renderDevices();
        
        this.showNotification('Device removed', 'success');
    }
    
    renderDevices() {
        const container = document.getElementById('devicesList');
        if (!container) return;
        
        if (this.devices.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #71717a;">No devices found</div>';
            return;
        }
        
        container.innerHTML = this.devices.map(device => `
            <div class="device-item" style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(139,92,246,0.2);
                border-radius: 12px;
                margin-bottom: 0.75rem;
            ">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="font-size: 1.5rem;">${device.current ? '🖥️' : '📱'}</div>
                    <div>
                        <div style="font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
                            ${this.escapeHtml(device.name)}
                            ${device.current ? '<span style="font-size: 0.7rem; color: #10b981;">(Current)</span>' : ''}
                        </div>
                        <div style="font-size: 0.7rem; color: #71717a;">
                            ${device.browser} • ${device.os}
                        </div>
                        <div style="font-size: 0.7rem; color: #71717a;">
                            Last active: ${this.formatRelativeTime(device.lastActive)}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="window.deviceManager.renameDevicePrompt('${device.id}')" style="
                        background: none;
                        border: none;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">✏️</button>
                    ${!device.current ? `
                        <button onclick="window.deviceManager.removeDevice('${device.id}')" style="
                            background: none;
                            border: none;
                            color: #ef4444;
                            cursor: pointer;
                        ">🗑️</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    renameDevicePrompt(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (device) {
            const newName = prompt('Enter device name:', device.name);
            if (newName && newName.trim()) {
                this.renameDevice(deviceId, newName.trim());
            }
        }
    }
    
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    
    setupEventListeners() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateDeviceActivity();
            }
        });
    }
    
    showNotification(message, type) {
        if (window.notify) {
            window.notify[type](message);
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize device manager
const deviceManager = new DeviceManager();
window.deviceManager = deviceManager;