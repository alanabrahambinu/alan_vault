/* ========================================
   ALAN VAULT - REMINDERS SYSTEM
   Task Reminders & Notifications
   ======================================== */

class RemindersManager {
    constructor() {
        this.reminders = [];
        this.notificationPermission = false;
        this.init();
    }
    
    async init() {
        this.loadReminders();
        await this.requestNotificationPermission();
        this.startReminderChecker();
        this.setupEventListeners();
    }
    
    loadReminders() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const remindersKey = `reminders_${user.id}`;
        const saved = localStorage.getItem(remindersKey);
        
        if (saved) {
            this.reminders = JSON.parse(saved);
        }
    }
    
    saveReminders() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const remindersKey = `reminders_${user.id}`;
        localStorage.setItem(remindersKey, JSON.stringify(this.reminders));
    }
    
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission === 'granted';
        }
    }
    
    addReminder(taskId, reminderData) {
        const reminder = {
            id: this.generateId(),
            taskId: taskId,
            title: reminderData.title,
            message: reminderData.message,
            datetime: reminderData.datetime,
            repeat: reminderData.repeat || 'none',
            enabled: true,
            triggered: false,
            createdAt: new Date().toISOString(),
            sound: reminderData.sound !== false,
            email: reminderData.email || null
        };
        
        this.reminders.push(reminder);
        this.saveReminders();
        
        document.dispatchEvent(new CustomEvent('reminder:created', {
            detail: { reminder }
        }));
        
        return reminder;
    }
    
    updateReminder(reminderId, updates) {
        const index = this.reminders.findIndex(r => r.id === reminderId);
        if (index !== -1) {
            this.reminders[index] = { ...this.reminders[index], ...updates };
            this.saveReminders();
            return true;
        }
        return false;
    }
    
    deleteReminder(reminderId) {
        this.reminders = this.reminders.filter(r => r.id !== reminderId);
        this.saveReminders();
    }
    
    getRemindersForTask(taskId) {
        return this.reminders.filter(r => r.taskId === taskId);
    }
    
    startReminderChecker() {
        setInterval(() => {
            this.checkReminders();
        }, 30000); // Check every 30 seconds
    }
    
    checkReminders() {
        const now = new Date();
        
        this.reminders.forEach(reminder => {
            if (!reminder.enabled || reminder.triggered) return;
            
            const reminderTime = new Date(reminder.datetime);
            
            if (reminderTime <= now) {
                this.triggerReminder(reminder);
                
                // Handle repeat
                if (reminder.repeat !== 'none') {
                    this.scheduleNextReminder(reminder);
                } else {
                    reminder.triggered = true;
                }
                
                this.saveReminders();
            }
        });
    }
    
    triggerReminder(reminder) {
        // Show browser notification
        if (this.notificationPermission) {
            new Notification(reminder.title, {
                body: reminder.message,
                icon: '/favicon.ico',
                tag: reminder.id,
                requireInteraction: true
            });
        }
        
        // Show in-app notification
        if (window.notify) {
            window.notify.info(reminder.message, reminder.title);
        }
        
        // Play sound
        if (reminder.sound) {
            this.playReminderSound();
        }
        
        // Send email reminder (simulated)
        if (reminder.email) {
            this.sendEmailReminder(reminder);
        }
        
        document.dispatchEvent(new CustomEvent('reminder:triggered', {
            detail: { reminder }
        }));
    }
    
    scheduleNextReminder(reminder) {
        const currentTime = new Date(reminder.datetime);
        let nextTime;
        
        switch (reminder.repeat) {
            case 'daily':
                nextTime = new Date(currentTime.setDate(currentTime.getDate() + 1));
                break;
            case 'weekly':
                nextTime = new Date(currentTime.setDate(currentTime.getDate() + 7));
                break;
            case 'monthly':
                nextTime = new Date(currentTime.setMonth(currentTime.getMonth() + 1));
                break;
            case 'yearly':
                nextTime = new Date(currentTime.setFullYear(currentTime.getFullYear() + 1));
                break;
            default:
                return;
        }
        
        reminder.datetime = nextTime.toISOString();
        reminder.triggered = false;
    }
    
    playReminderSound() {
        const audio = new Audio('/assets/reminder.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
    
    sendEmailReminder(reminder) {
        console.log(`Sending email reminder for: ${reminder.title}`);
        // In production, this would call an API endpoint
    }
    
    showReminderDialog(taskId, taskTitle) {
        const modal = document.createElement('div');
        modal.className = 'reminder-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 450px;">
                <h3 style="margin-bottom: 1rem;">Set Reminder</h3>
                <p style="color: #a1a1aa; margin-bottom: 1rem;">For: ${this.escapeHtml(taskTitle)}</p>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Date & Time</label>
                    <input type="datetime-local" id="reminderDateTime" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Repeat</label>
                    <select id="reminderRepeat" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="none">Never</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="reminderSound" checked>
                        Play sound
                    </label>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                    <button onclick="this.closest('.reminder-modal').remove()" style="
                        padding: 0.5rem 1rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="window.remindersManager.saveReminderFromDialog('${taskId}', '${this.escapeHtml(taskTitle)}', this)" style="
                        padding: 0.5rem 1rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Set Reminder</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set default datetime (1 hour from now)
        const defaultDateTime = new Date();
        defaultDateTime.setHours(defaultDateTime.getHours() + 1);
        const input = modal.querySelector('#reminderDateTime');
        if (input) {
            input.value = defaultDateTime.toISOString().slice(0, 16);
        }
    }
    
    saveReminderFromDialog(taskId, taskTitle, btn) {
        const modal = btn.closest('.reminder-modal');
        const datetime = modal.querySelector('#reminderDateTime').value;
        const repeat = modal.querySelector('#reminderRepeat').value;
        const sound = modal.querySelector('#reminderSound').checked;
        
        if (!datetime) {
            alert('Please select a date and time');
            return;
        }
        
        this.addReminder(taskId, {
            title: `Reminder: ${taskTitle}`,
            message: `Time to work on: ${taskTitle}`,
            datetime: datetime,
            repeat: repeat,
            sound: sound
        });
        
        modal.remove();
        this.showNotification('Reminder set successfully', 'success');
    }
    
    getUpcomingReminders(limit = 10) {
        const now = new Date();
        const upcoming = this.reminders
            .filter(r => r.enabled && !r.triggered && new Date(r.datetime) > now)
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
            .slice(0, limit);
        
        return upcoming;
    }
    
    renderRemindersList() {
        const container = document.getElementById('remindersList');
        if (!container) return;
        
        const upcoming = this.getUpcomingReminders();
        
        if (upcoming.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-tertiary);">No upcoming reminders</div>';
            return;
        }
        
        container.innerHTML = upcoming.map(reminder => `
            <div class="reminder-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem;
                background: rgba(255,255,255,0.02);
                border-radius: 12px;
                margin-bottom: 0.5rem;
            ">
                <div>
                    <div style="font-weight: 500;">${this.escapeHtml(reminder.title)}</div>
                    <div style="font-size: 0.7rem; color: #71717a;">${new Date(reminder.datetime).toLocaleString()}</div>
                    ${reminder.repeat !== 'none' ? `<div style="font-size: 0.7rem; color: #8B5CF6;">Repeats: ${reminder.repeat}</div>` : ''}
                </div>
                <button onclick="window.remindersManager.deleteReminder('${reminder.id}')" style="
                    background: none;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                ">Delete</button>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        document.addEventListener('tasks:updated', () => {
            this.renderRemindersList();
        });
    }
    
    generateId() {
        return 'reminder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    showNotification(message, type) {
        if (window.notify) {
            window.notify[type](message);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize reminders manager
const remindersManager = new RemindersManager();
window.remindersManager = remindersManager;