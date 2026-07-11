/* ========================================
   ALAN VAULT - REPORTS GENERATOR
   Analytics & Reporting System
   ======================================== */

class ReportsGenerator {
    constructor() {
        this.reports = [];
        this.scheduledReports = [];
        this.init();
    }
    
    init() {
        this.loadReports();
        this.setupEventListeners();
        this.renderReports();
    }
    
    loadReports() {
        const saved = localStorage.getItem('generated_reports');
        if (saved) {
            this.reports = JSON.parse(saved);
        }
    }
    
    saveReports() {
        localStorage.setItem('generated_reports', JSON.stringify(this.reports));
    }
    
    generateReport(type, dateRange, options = {}) {
        const reportId = this.generateId();
        const report = {
            id: reportId,
            type: type, // 'usage', 'activity', 'storage', 'users', 'tasks'
            dateRange: dateRange,
            options: options,
            generatedAt: new Date().toISOString(),
            status: 'processing',
            data: null
        };
        
        this.reports.unshift(report);
        this.saveReports();
        this.renderReports();
        
        // Generate report asynchronously
        setTimeout(() => {
            const data = this.fetchReportData(type, dateRange, options);
            report.data = data;
            report.status = 'completed';
            this.saveReports();
            this.renderReports();
            
            if (window.notify) {
                window.notify.success(`Report "${type}" generated successfully`);
            }
        }, 1500);
        
        return report;
    }
    
    fetchReportData(type, dateRange, options) {
        const now = new Date();
        let startDate, endDate = now;
        
        switch(dateRange) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'yesterday':
                startDate = new Date(now.setDate(now.getDate() - 1));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                startDate = new Date(now.setDate(now.getDate() - 30));
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        let totalStorage = 0;
        let totalFiles = 0;
        let totalNotes = 0;
        let totalTasks = 0;
        let totalBookmarks = 0;
        
        users.forEach(user => {
            const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
            const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
            totalStorage += vault.files.reduce((sum, f) => sum + (f.size || 0), 0);
            totalFiles += vault.files.length;
            totalNotes += vault.notes.length;
            totalTasks += vault.tasks.length;
            totalBookmarks += vault.bookmarks.length;
        });
        
        const logs = JSON.parse(localStorage.getItem('system_logs') || '[]');
        const activityLogs = logs.filter(log => new Date(log.timestamp) >= startDate && new Date(log.timestamp) <= endDate);
        
        const activityByType = {
            auth: activityLogs.filter(l => l.type === 'auth').length,
            file: activityLogs.filter(l => l.type === 'file').length,
            note: activityLogs.filter(l => l.type === 'note').length,
            task: activityLogs.filter(l => l.type === 'task').length
        };
        
        return {
            generatedAt: new Date().toISOString(),
            dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
            summary: {
                totalUsers: users.length,
                activeUsers: users.filter(u => u.status === 'active').length,
                totalStorage: this.formatBytes(totalStorage),
                totalFiles,
                totalNotes,
                totalTasks,
                totalBookmarks
            },
            activity: {
                total: activityLogs.length,
                byType: activityByType
            },
            users: users.map(user => ({
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
                joinedAt: user.createdAt,
                lastLogin: user.lastLogin
            })),
            options: options
        };
    }
    
    downloadReport(reportId, format = 'json') {
        const report = this.reports.find(r => r.id === reportId);
        if (!report || report.status !== 'completed') {
            if (window.notify) window.notify.error('Report not ready');
            return;
        }
        
        let content, mimeType, extension;
        const data = report.data;
        
        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else if (format === 'csv') {
            const headers = ['Metric', 'Value'];
            const rows = [
                ['Generated At', data.generatedAt],
                ['Date Range Start', data.dateRange.start],
                ['Date Range End', data.dateRange.end],
                ['Total Users', data.summary.totalUsers],
                ['Active Users', data.summary.activeUsers],
                ['Total Storage', data.summary.totalStorage],
                ['Total Files', data.summary.totalFiles],
                ['Total Notes', data.summary.totalNotes],
                ['Total Tasks', data.summary.totalTasks],
                ['Total Bookmarks', data.summary.totalBookmarks],
                ['Activity Total', data.activity.total],
                ['Auth Activity', data.activity.byType.auth],
                ['File Activity', data.activity.byType.file],
                ['Note Activity', data.activity.byType.note],
                ['Task Activity', data.activity.byType.task]
            ];
            content = rows.map(row => row.join(',')).join('\n');
            mimeType = 'text/csv';
            extension = 'csv';
        } else if (format === 'html') {
            content = this.generateHtmlReport(data);
            mimeType = 'text/html';
            extension = 'html';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${report.type}_${new Date().toISOString().split('T')[0]}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (window.notify) {
            window.notify.success(`Report downloaded as ${format.toUpperCase()}`);
        }
    }
    
    generateHtmlReport(data) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Alan Vault Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #0a0a0f; color: #fff; }
                    .container { max-width: 800px; margin: 0 auto; }
                    h1 { color: #8B5CF6; }
                    .section { margin-bottom: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
                    .stat-card { padding: 15px; background: rgba(255,255,255,0.03); border-radius: 8px; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #8B5CF6; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Alan Vault Report</h1>
                    <p>Generated: ${new Date(data.generatedAt).toLocaleString()}</p>
                    <p>Period: ${new Date(data.dateRange.start).toLocaleDateString()} - ${new Date(data.dateRange.end).toLocaleDateString()}</p>
                    
                    <div class="section">
                        <h2>Summary</h2>
                        <div class="stats-grid">
                            <div class="stat-card"><div class="stat-value">${data.summary.totalUsers}</div><div>Total Users</div></div>
                            <div class="stat-card"><div class="stat-value">${data.summary.activeUsers}</div><div>Active Users</div></div>
                            <div class="stat-card"><div class="stat-value">${data.summary.totalStorage}</div><div>Storage Used</div></div>
                            <div class="stat-card"><div class="stat-value">${data.summary.totalFiles}</div><div>Total Files</div></div>
                            <div class="stat-card"><div class="stat-value">${data.summary.totalNotes}</div><div>Total Notes</div></div>
                            <div class="stat-card"><div class="stat-value">${data.summary.totalTasks}</div><div>Total Tasks</div></div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Activity</h2>
                        <div class="stats-grid">
                            <div class="stat-card"><div class="stat-value">${data.activity.total}</div><div>Total Activities</div></div>
                            <div class="stat-card"><div class="stat-value">${data.activity.byType.auth}</div><div>Auth Activities</div></div>
                            <div class="stat-card"><div class="stat-value">${data.activity.byType.file}</div><div>File Activities</div></div>
                            <div class="stat-card"><div class="stat-value">${data.activity.byType.note}</div><div>Note Activities</div></div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    deleteReport(reportId) {
        this.reports = this.reports.filter(r => r.id !== reportId);
        this.saveReports();
        this.renderReports();
        
        if (window.notify) {
            window.notify.success('Report deleted');
        }
    }
    
    scheduleReport(type, frequency, options = {}) {
        const schedule = {
            id: this.generateId(),
            type: type,
            frequency: frequency, // daily, weekly, monthly
            options: options,
            nextRun: this.calculateNextRun(frequency),
            enabled: true,
            createdAt: new Date().toISOString()
        };
        
        this.scheduledReports.push(schedule);
        localStorage.setItem('scheduled_reports', JSON.stringify(this.scheduledReports));
        
        if (window.notify) {
            window.notify.success(`Report scheduled ${frequency}`);
        }
        
        return schedule;
    }
    
    calculateNextRun(frequency) {
        const now = new Date();
        if (frequency === 'daily') {
            now.setDate(now.getDate() + 1);
            now.setHours(9, 0, 0, 0);
        } else if (frequency === 'weekly') {
            now.setDate(now.getDate() + 7);
            now.setHours(9, 0, 0, 0);
        } else if (frequency === 'monthly') {
            now.setMonth(now.getMonth() + 1);
            now.setDate(1);
            now.setHours(9, 0, 0, 0);
        }
        return now.toISOString();
    }
    
    renderReports() {
        const container = document.getElementById('reportsList');
        if (!container) return;
        
        if (this.reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: #71717a;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                    <p>No reports generated yet</p>
                    <button onclick="window.reportsGenerator.showGenerateModal()" class="btn-primary" style="margin-top: 1rem;">Generate Report</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.reports.map(report => `
            <div class="report-item" style="
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(139,92,246,0.2);
                border-radius: 16px;
                padding: 1rem;
                margin-bottom: 1rem;
            ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="margin-bottom: 0.25rem;">${report.type.toUpperCase()} Report</h4>
                        <div style="font-size: 0.75rem; color: #71717a;">Generated: ${new Date(report.generatedAt).toLocaleString()}</div>
                        <div style="font-size: 0.7rem; color: #8B5CF6; margin-top: 0.25rem;">Status: ${report.status}</div>
                    </div>
                    ${report.status === 'completed' ? `
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="window.reportsGenerator.downloadReport('${report.id}', 'json')" class="btn-icon" style="padding: 0.25rem 0.5rem;">JSON</button>
                            <button onclick="window.reportsGenerator.downloadReport('${report.id}', 'csv')" class="btn-icon" style="padding: 0.25rem 0.5rem;">CSV</button>
                            <button onclick="window.reportsGenerator.downloadReport('${report.id}', 'html')" class="btn-icon" style="padding: 0.25rem 0.5rem;">HTML</button>
                            <button onclick="window.reportsGenerator.deleteReport('${report.id}')" class="btn-icon btn-danger" style="padding: 0.25rem 0.5rem;">🗑️</button>
                        </div>
                    ` : `
                        <div class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid rgba(139,92,246,0.3); border-top-color: #8B5CF6; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
                    `}
                </div>
            </div>
        `).join('');
    }
    
    showGenerateModal() {
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
            <div style="background: #1a1a2e; border-radius: 24px; padding: 2rem; width: 90%; max-width: 450px;">
                <h3 style="margin-bottom: 1rem;">Generate Report</h3>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Report Type</label>
                    <select id="reportType" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="usage">Usage Report</option>
                        <option value="activity">Activity Report</option>
                        <option value="storage">Storage Report</option>
                        <option value="users">Users Report</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Date Range</label>
                    <select id="dateRange" style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: white;
                    ">
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="year">Last Year</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button onclick="this.closest('div').parentElement.remove()" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: transparent;
                        border: 1px solid rgba(139,92,246,0.5);
                        border-radius: 8px;
                        color: #8B5CF6;
                        cursor: pointer;
                    ">Cancel</button>
                    <button onclick="window.reportsGenerator.generateFromModal(this)" style="
                        flex: 1;
                        padding: 0.75rem;
                        background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Generate</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    generateFromModal(btn) {
        const modal = btn.closest('div').parentElement;
        const type = modal.querySelector('#reportType').value;
        const dateRange = modal.querySelector('#dateRange').value;
        
        this.generateReport(type, dateRange);
        modal.remove();
    }
    
    setupEventListeners() {
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.showGenerateModal());
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    generateId() {
        return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialize reports generator
const reportsGenerator = new ReportsGenerator();
window.reportsGenerator = reportsGenerator;