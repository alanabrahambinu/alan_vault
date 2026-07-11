/* ========================================
   ALAN VAULT - CALENDAR VIEW
   Calendar Visualization for Tasks
   ======================================== */

class CalendarView {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month'; // month, week, day
        this.events = [];
        this.init();
    }
    
    init() {
        this.loadEvents();
        this.renderCalendar();
        this.setupEventListeners();
    }
    
    loadEvents() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"tasks":[]}');
        
        this.events = vault.tasks
            .filter(task => task.dueDate)
            .map(task => ({
                id: task.id,
                title: task.title,
                start: new Date(task.dueDate),
                end: task.dueDate ? new Date(task.dueDate) : null,
                completed: task.completed,
                priority: task.priority,
                category: task.category
            }));
    }
    
    renderCalendar() {
        const container = document.getElementById('calendarContainer');
        if (!container) return;
        
        if (this.currentView === 'month') {
            this.renderMonthView(container);
        } else if (this.currentView === 'week') {
            this.renderWeekView(container);
        } else {
            this.renderDayView(container);
        }
        
        this.updateHeader();
    }
    
    renderMonthView(container) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        const weeks = [];
        let week = [];
        
        // Add empty cells for days before month starts
        for (let i = 0; i < startingDay; i++) {
            week.push(null);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            week.push(new Date(year, month, day));
            
            if (week.length === 7) {
                weeks.push(week);
                week = [];
            }
        }
        
        // Add remaining empty cells
        if (week.length > 0) {
            while (week.length < 7) week.push(null);
            weeks.push(week);
        }
        
        container.innerHTML = `
            <div class="calendar-month-view" style="
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
            ">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `
                    <div style="
                        text-align: center;
                        padding: 0.5rem;
                        font-weight: 600;
                        color: #8B5CF6;
                        font-size: 0.875rem;
                    ">${day}</div>
                `).join('')}
                
                ${weeks.map(week => week.map(date => this.renderMonthCell(date)).join('')).join('')}
            </div>
        `;
    }
    
    renderMonthCell(date) {
        if (!date) {
            return `<div style="padding: 0.5rem; min-height: 100px; background: rgba(255,255,255,0.02); border-radius: 8px;"></div>`;
        }
        
        const dayEvents = this.events.filter(event => 
            event.start.toDateString() === date.toDateString()
        );
        
        const isToday = date.toDateString() === new Date().toDateString();
        
        return `
            <div class="calendar-day" data-date="${date.toISOString()}" style="
                padding: 0.5rem;
                min-height: 100px;
                background: ${isToday ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)'};
                border: 1px solid ${isToday ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'};
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            ">
                <div style="
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    color: ${isToday ? '#8B5CF6' : 'inherit'};
                ">${date.getDate()}</div>
                <div style="font-size: 0.7rem;">
                    ${dayEvents.slice(0, 3).map(event => `
                        <div style="
                            padding: 2px 4px;
                            margin-bottom: 2px;
                            background: ${event.completed ? 'rgba(16,185,129,0.2)' : this.getPriorityColor(event.priority)};
                            border-radius: 4px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        " title="${this.escapeHtml(event.title)}">
                            ${event.completed ? '✓' : '○'} ${this.escapeHtml(event.title.substring(0, 20))}
                        </div>
                    `).join('')}
                    ${dayEvents.length > 3 ? `<div style="color: #8B5CF6; font-size: 0.7rem;">+${dayEvents.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
    }
    
    renderWeekView(container) {
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const days = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            days.push(date);
        }
        
        container.innerHTML = `
            <div class="calendar-week-view" style="display: flex; gap: 8px; overflow-x: auto;">
                ${days.map(day => this.renderWeekDay(day)).join('')}
            </div>
        `;
    }
    
    renderWeekDay(date) {
        const dayEvents = this.events.filter(event => 
            event.start.toDateString() === date.toDateString()
        );
        
        const isToday = date.toDateString() === new Date().toDateString();
        
        return `
            <div style="flex: 1; min-width: 120px;">
                <div style="
                    text-align: center;
                    padding: 0.5rem;
                    background: ${isToday ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.02)'};
                    border-radius: 8px;
                    margin-bottom: 8px;
                ">
                    <div>${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div style="font-size: 1.2rem; font-weight: 600;">${date.getDate()}</div>
                </div>
                <div style="min-height: 400px;">
                    ${dayEvents.map(event => `
                        <div class="calendar-event" data-task-id="${event.id}" onclick="window.tasksManager.openTaskModal('${event.id}')" style="
                            padding: 0.5rem;
                            margin-bottom: 4px;
                            background: ${event.completed ? 'rgba(16,185,129,0.2)' : this.getPriorityColor(event.priority)};
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.75rem;
                        ">
                            ${event.completed ? '✓' : '○'} ${this.escapeHtml(event.title)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderDayView(container) {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push(i);
        }
        
        const dayEvents = this.events.filter(event => 
            event.start.toDateString() === this.currentDate.toDateString()
        );
        
        container.innerHTML = `
            <div class="calendar-day-view">
                <div style="
                    text-align: center;
                    padding: 1rem;
                    background: rgba(139,92,246,0.1);
                    border-radius: 12px;
                    margin-bottom: 1rem;
                ">
                    <h3>${this.currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                </div>
                <div style="display: flex;">
                    <div style="width: 60px;">
                        ${hours.map(hour => `
                            <div style="height: 60px; font-size: 0.7rem; color: #71717a;">${hour}:00</div>
                        `).join('')}
                    </div>
                    <div style="flex: 1; position: relative;">
                        ${hours.map(hour => `
                            <div style="height: 60px; border-bottom: 1px solid rgba(255,255,255,0.05);"></div>
                        `).join('')}
                        ${dayEvents.map(event => {
                            const hour = event.start.getHours();
                            const minute = event.start.getMinutes();
                            const top = (hour * 60 + minute) * (60 / 60);
                            return `
                                <div class="calendar-event" data-task-id="${event.id}" onclick="window.tasksManager.openTaskModal('${event.id}')" style="
                                    position: absolute;
                                    top: ${top}px;
                                    left: 0;
                                    right: 0;
                                    padding: 0.5rem;
                                    background: ${event.completed ? 'rgba(16,185,129,0.2)' : this.getPriorityColor(event.priority)};
                                    border-radius: 6px;
                                    margin: 2px;
                                    cursor: pointer;
                                    font-size: 0.75rem;
                                ">
                                    ${event.completed ? '✓' : '○'} ${this.escapeHtml(event.title)}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    updateHeader() {
        const header = document.getElementById('calendarHeader');
        if (!header) return;
        
        if (this.currentView === 'month') {
            header.innerHTML = `
                <button onclick="window.calendarView.prevPeriod()">←</button>
                <h3>${this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <button onclick="window.calendarView.nextPeriod()">→</button>
                <button onclick="window.calendarView.goToToday()">Today</button>
            `;
        } else if (this.currentView === 'week') {
            const start = this.getStartOfWeek(this.currentDate);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            header.innerHTML = `
                <button onclick="window.calendarView.prevPeriod()">←</button>
                <h3>${start.toLocaleDateString()} - ${end.toLocaleDateString()}</h3>
                <button onclick="window.calendarView.nextPeriod()">→</button>
                <button onclick="window.calendarView.goToToday()">Today</button>
            `;
        } else {
            header.innerHTML = `
                <button onclick="window.calendarView.prevPeriod()">←</button>
                <h3>${this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                <button onclick="window.calendarView.nextPeriod()">→</button>
                <button onclick="window.calendarView.goToToday()">Today</button>
            `;
        }
    }
    
    prevPeriod() {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
        } else {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
        }
        this.renderCalendar();
    }
    
    nextPeriod() {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
        } else {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
        }
        this.renderCalendar();
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
    }
    
    setView(view) {
        this.currentView = view;
        this.renderCalendar();
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });
    }
    
    getStartOfWeek(date) {
        const start = new Date(date);
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        return start;
    }
    
    getPriorityColor(priority) {
        const colors = {
            high: 'rgba(239,68,68,0.2)',
            medium: 'rgba(245,158,11,0.2)',
            low: 'rgba(16,185,129,0.2)'
        };
        return colors[priority] || 'rgba(139,92,246,0.2)';
    }
    
    setupEventListeners() {
        document.addEventListener('tasks:updated', () => {
            this.loadEvents();
            this.renderCalendar();
        });
        
        document.addEventListener('click', (e) => {
            const dayCell = e.target.closest('.calendar-day');
            if (dayCell && dayCell.dataset.date) {
                this.currentDate = new Date(dayCell.dataset.date);
                this.setView('day');
            }
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize calendar view
const calendarView = new CalendarView();
window.calendarView = calendarView;