/* ========================================
   ALAN VAULT - CONTENT MODERATION
   Content Review & Moderation System
   ======================================== */

class ModerationManager {
    constructor() {
        this.reportedContent = [];
        this.moderationQueue = [];
        this.moderationRules = {
            profanity: true,
            spam: true,
            sensitiveContent: true,
            externalLinks: false
        };
        this.init();
    }
    
    init() {
        this.loadReportedContent();
        this.setupEventListeners();
        this.renderModerationQueue();
    }
    
    loadReportedContent() {
        const saved = localStorage.getItem('reported_content');
        if (saved) {
            this.reportedContent = JSON.parse(saved);
        }
    }
    
    saveReportedContent() {
        localStorage.setItem('reported_content', JSON.stringify(this.reportedContent));
    }
    
    reportContent(contentType, contentId, reason, reportedBy) {
        const report = {
            id: this.generateId(),
            contentType: contentType, // 'note', 'file', 'comment', 'user'
            contentId: contentId,
            reason: reason,
            reportedBy: reportedBy,
            status: 'pending', // pending, reviewed, dismissed, action_taken
            createdAt: new Date().toISOString(),
            reviewedAt: null,
            reviewedBy: null,
            actionTaken: null
        };
        
        this.reportedContent.unshift(report);
        this.saveReportedContent();
        this.moderationQueue.unshift(report);
        this.renderModerationQueue();
        
        this.addToLog('warning', 'moderation', `Content reported: ${reason}`, `Type: ${contentType}, ID: ${contentId}`);
        
        if (window.notify) {
            window.notify.info('Content reported. Our team will review it.', 'Report Submitted');
        }
        
        return report;
    }
    
    reviewContent(reportId, action, notes = '') {
        const report = this.reportedContent.find(r => r.id === reportId);
        if (!report) return false;
        
        const currentUser = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        
        report.status = action === 'dismiss' ? 'dismissed' : 'action_taken';
        report.reviewedAt = new Date().toISOString();
        report.reviewedBy = currentUser.id;
        report.actionTaken = action;
        report.reviewNotes = notes;
        
        // Take action on content
        if (action === 'hide') {
            this.hideContent(report.contentType, report.contentId);
        } else if (action === 'delete') {
            this.deleteContent(report.contentType, report.contentId);
        } else if (action === 'warn') {
            this.warnUser(report.reportedBy);
        }
        
        this.saveReportedContent();
        this.moderationQueue = this.moderationQueue.filter(r => r.id !== reportId);
        this.renderModerationQueue();
        
        this.addToLog('info', 'moderation', `Content reviewed: ${action}`, `Report ID: ${reportId}, Notes: ${notes}`);
        
        if (window.notify) {
            window.notify.success(`Content ${action === 'dismiss' ? 'dismissed' : 'action taken'}`);
        }
        
        return true;
    }
    
    hideContent(contentType, contentId) {
        // Hide content from public view
        const hiddenKey = 'hidden_content';
        const hidden = JSON.parse(localStorage.getItem(hiddenKey) || '[]');
        hidden.push({ contentType, contentId, hiddenAt: new Date().toISOString() });
        localStorage.setItem(hiddenKey, JSON.stringify(hidden));
        
        this.addToLog('warning', 'moderation', `Content hidden`, `Type: ${contentType}, ID: ${contentId}`);
    }
    
    deleteContent(contentType, contentId) {
        // Delete content from system
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        
        if (contentType === 'note') {
            vault.notes = vault.notes.filter(n => n.id !== contentId);
        } else if (contentType === 'file') {
            vault.files = vault.files.filter(f => f.id !== contentId);
        } else if (contentType === 'task') {
            vault.tasks = vault.tasks.filter(t => t.id !== contentId);
        }
        
        localStorage.setItem(vaultKey, JSON.stringify(vault));
        
        this.addToLog('error', 'moderation', `Content deleted`, `Type: ${contentType}, ID: ${contentId}`);
    }
    
    warnUser(userId) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.id === userId);
        
        if (user) {
            const warnings = JSON.parse(localStorage.getItem('user_warnings') || '[]');
            warnings.push({ userId, timestamp: new Date().toISOString(), type: 'content_moderation' });
            localStorage.setItem('user_warnings', JSON.stringify(warnings));
            
            this.addToLog('warning', 'moderation', `User warned`, `User: ${user.email}`);
        }
    }
    
    getReportedContent() {
        return this.reportedContent.filter(r => r.status === 'pending');
    }
    
    getModerationStats() {
        const pending = this.reportedContent.filter(r => r.status === 'pending').length;
        const reviewed = this.reportedContent.filter(r => r.status !== 'pending').length;
        const actionTaken = this.reportedContent.filter(r => r.actionTaken === 'delete' || r.actionTaken === 'hide').length;
        const dismissed = this.reportedContent.filter(r => r.actionTaken === 'dismiss').length;
        
        const byType = {
            note: this.reportedContent.filter(r => r.contentType === 'note').length,
            file: this.reportedContent.filter(r => r.contentType === 'file').length,
            task: this.reportedContent.filter(r => r.contentType === 'task').length,
            user: this.reportedContent.filter(r => r.contentType === 'user').length
        };
        
        return { pending, reviewed, actionTaken, dismissed, byType };
    }
    
    renderModerationQueue() {
        const container = document.getElementById('moderationQueue');
        if (!container) return;
        
        const pendingReports = this.getReportedContent();
        const stats = this.getModerationStats();
        
        this.updateStats(stats);
        
        if (pendingReports.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: #71717a;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                    <p>No pending reports</p>
                    <p style="font-size: 0.875rem;">All content has been reviewed</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = pendingReports.map(report => `
            <div class="report-item" style="
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(239,68,68,0.3);
                border-radius: 16px;
                padding: 1rem;
                margin-bottom: 1rem;
            ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                    <div>
                        <span class="report-type" style="
                            padding: 0.25rem 0.75rem;
                            background: rgba(239,68,68,0.2);
                            border-radius: 50px;
                            font-size: 0.7rem;
                            color: #ef4444;
                        ">${report.contentType}</span>
                        <span class="report-id" style="
                            font-size: 0.7rem;
                            color: #71717a;
                            margin-left: 0.5rem;
                        ">ID: ${report.contentId}</span>
                    </div>
                    <div class="report-time" style="font-size: 0.7rem; color: #71717a;">
                        ${new Date(report.createdAt).toLocaleString()}
                    </div>
                </div>
                
                <div class="report-reason" style="margin-bottom: 0.75rem;">
                    <strong>Reason:</strong> ${this.escapeHtml(report.reason)}
                </div>
                
                <div class="report-actions" style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                    <button onclick="window.moderationManager.showContentPreview('${report.contentType}', '${report.contentId}')" style="
                        padding: 0.5rem 1rem;
                        background: rgba(139,92,246,0.2);
                        border: none;
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Preview</button>
                    <button onclick="window.moderationManager.reviewContent('${report.id}', 'dismiss')" style="
                        padding: 0.5rem 1rem;
                        background: rgba(16,185,129,0.2);
                        border: none;
                        border-radius: 8px;
                        color: #10b981;
                        cursor: pointer;
                    ">Dismiss</button>
                    <button onclick="window.moderationManager.showActionMenu('${report.id}')" style="
                        padding: 0.5rem 1rem;
                        background: rgba(239,68,68,0.2);
                        border: none;
                        border-radius: 8px;
                        color: #ef4444;
                        cursor: pointer;
                    ">Take Action</button>
                </div>
            </div>
        `).join('');
    }
    
    showActionMenu(reportId) {
        const modal = document.createElement('div');
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
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 400px;">
                <h3 style="margin-bottom: 1rem;">Take Action</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Action</label>
                    <select id="actionSelect" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="hide">Hide Content</option>
                        <option value="delete">Delete Content</option>
                        <option value="warn">Warn User</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Notes (optional)</label>
                    <textarea id="actionNotes" rows="3" placeholder="Add notes about this action..." style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    "></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button onclick="this.closest('div').parentElement.remove()" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="window.moderationManager.executeAction('${reportId}', this)" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Apply</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    executeAction(reportId, btn) {
        const modal = btn.closest('div').parentElement;
        const action = modal.querySelector('#actionSelect').value;
        const notes = modal.querySelector('#actionNotes').value;
        
        this.reviewContent(reportId, action, notes);
        modal.remove();
    }
    
    showContentPreview(contentType, contentId) {
        // Fetch and display content preview
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        
        let content = null;
        if (contentType === 'note') {
            content = vault.notes.find(n => n.id === contentId);
        } else if (contentType === 'file') {
            content = vault.files.find(f => f.id === contentId);
        } else if (contentType === 'task') {
            content = vault.tasks.find(t => t.id === contentId);
        }
        
        if (!content) {
            if (window.notify) window.notify.error('Content not found');
            return;
        }
        
        const modal = document.createElement('div');
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
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3>Content Preview</h3>
                    <button onclick="this.closest('div').parentElement.remove()" style="background: none; border: none; color: #a1a1aa; font-size: 1.2rem; cursor: pointer;">✕</button>
                </div>
                
                <div class="preview-content">
                    ${contentType === 'note' ? `
                        <h4>${this.escapeHtml(content.title)}</h4>
                        <p style="color: #a1a1aa; margin-top: 0.5rem;">${this.escapeHtml(content.content.substring(0, 500))}${content.content.length > 500 ? '...' : ''}</p>
                        <div style="margin-top: 0.5rem; font-size: 0.7rem; color: #71717a;">Created: ${new Date(content.createdAt).toLocaleString()}</div>
                    ` : contentType === 'file' ? `
                        <h4>${this.escapeHtml(content.name)}</h4>
                        <p>Size: ${this.formatBytes(content.size)}</p>
                        <p>Type: ${content.type}</p>
                        <p>Uploaded: ${new Date(content.date).toLocaleString()}</p>
                    ` : `
                        <h4>${this.escapeHtml(content.title)}</h4>
                        <p>Priority: ${content.priority}</p>
                        <p>Status: ${content.completed ? 'Completed' : 'Pending'}</p>
                        ${content.dueDate ? `<p>Due: ${new Date(content.dueDate).toLocaleString()}</p>` : ''}
                    `}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    updateStats(stats) {
        const elements = {
            pendingReports: document.getElementById('pendingReports'),
            reviewedReports: document.getElementById('reviewedReports'),
            actionTaken: document.getElementById('actionTaken'),
            dismissedReports: document.getElementById('dismissedReports'),
            reportedNotes: document.getElementById('reportedNotes'),
            reportedFiles: document.getElementById('reportedFiles'),
            reportedTasks: document.getElementById('reportedTasks')
        };
        
        if (elements.pendingReports) elements.pendingReports.textContent = stats.pending;
        if (elements.reviewedReports) elements.reviewedReports.textContent = stats.reviewed;
        if (elements.actionTaken) elements.actionTaken.textContent = stats.actionTaken;
        if (elements.dismissedReports) elements.dismissedReports.textContent = stats.dismissed;
        if (elements.reportedNotes) elements.reportedNotes.textContent = stats.byType.note;
        if (elements.reportedFiles) elements.reportedFiles.textContent = stats.byType.file;
        if (elements.reportedTasks) elements.reportedTasks.textContent = stats.byType.task;
    }
    
    addToLog(level, type, action, details) {
        if (window.logManager) {
            window.logManager.addLog(level, type, action, details);
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshModeration');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.renderModerationQueue());
        }
    }
    
    generateId() {
        return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize moderation manager
const moderationManager = new ModerationManager();
window.moderationManager = moderationManager;