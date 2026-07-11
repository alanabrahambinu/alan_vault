/* ========================================
   ALAN VAULT - CHARTS MANAGER
   Data Visualization & Analytics Charts
   ======================================== */

class ChartManager {
    constructor() {
        this.charts = {};
        this.chartInstances = {};
        this.init();
    }
    
    init() {
        this.loadChartJS();
    }
    
    loadChartJS() {
        // Check if Chart.js is already loaded
        if (typeof Chart !== 'undefined') {
            this.Chart = Chart;
            return;
        }
        
        // Dynamically load Chart.js
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => {
            this.Chart = Chart;
            this.initCharts();
        };
        document.head.appendChild(script);
    }
    
    initCharts(vaultData) {
        if (!this.Chart) return;
        
        this.vaultData = vaultData || this.getVaultData();
        this.createActivityChart();
        this.createStorageChart();
        this.createTasksChart();
        this.createCategoryChart();
        this.createTrendChart();
    }
    
    getVaultData() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const vaultKey = `${CONFIG.STORAGE_KEYS.VAULT_PREFIX}${user.id}`;
        return JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
    }
    
    createActivityChart() {
        const canvas = document.getElementById('activityChart');
        if (!canvas) return;
        
        // Prepare data for last 7 days
        const days = this.getLast7Days();
        const activityData = this.getActivityData(days);
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.chartInstances.activity) {
            this.chartInstances.activity.destroy();
        }
        
        this.chartInstances.activity = new this.Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Files',
                        data: activityData.files,
                        borderColor: '#4F46E5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Notes',
                        data: activityData.notes,
                        borderColor: '#8B5CF6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Tasks',
                        data: activityData.tasks,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#a1a1aa',
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1a1a2e',
                        titleColor: '#ffffff',
                        bodyColor: '#a1a1aa',
                        borderColor: '#4F46E5',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#a1a1aa',
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#a1a1aa'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
    
    createStorageChart() {
        const canvas = document.getElementById('storageChart');
        if (!canvas) return;
        
        const totalSize = this.vaultData.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const usedPercent = (totalSize / CONFIG.LIMITS.STORAGE_LIMIT) * 100;
        const remainingPercent = 100 - usedPercent;
        
        const ctx = canvas.getContext('2d');
        
        if (this.chartInstances.storage) {
            this.chartInstances.storage.destroy();
        }
        
        this.chartInstances.storage = new this.Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Used Space', 'Available Space'],
                datasets: [{
                    data: [usedPercent, remainingPercent],
                    backgroundColor: ['#4F46E5', 'rgba(79, 70, 229, 0.2)'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a1a1aa',
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                return `${context.label}: ${value.toFixed(1)}%`;
                            }
                        }
                    }
                }
            }
        });
        
        // Add center text
        this.addCenterText(canvas, `${usedPercent.toFixed(1)}%`);
    }
    
    addCenterText(canvas, text) {
        const ctx = canvas.getContext('2d');
        const centerText = () => {
            const width = canvas.width;
            const height = canvas.height;
            ctx.font = 'bold 20px "Inter"';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, width / 2, height / 2);
        };
        
        // Override after draw
        const originalDraw = this.chartInstances.storage.draw;
        this.chartInstances.storage.draw = function() {
            originalDraw.apply(this, arguments);
            centerText();
        };
    }
    
    createTasksChart() {
        const canvas = document.getElementById('tasksChart');
        if (!canvas) return;
        
        const completed = this.vaultData.tasks.filter(t => t.completed).length;
        const pending = this.vaultData.tasks.length - completed;
        
        const ctx = canvas.getContext('2d');
        
        if (this.chartInstances.tasks) {
            this.chartInstances.tasks.destroy();
        }
        
        this.chartInstances.tasks = new this.Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Completed', 'Pending'],
                datasets: [{
                    data: [completed, pending],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a1a1aa',
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = completed + pending;
                                const percent = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    createCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        
        // Group notes by category
        const categories = {};
        this.vaultData.notes.forEach(note => {
            const cat = note.category || 'General';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        
        const colors = ['#4F46E5', '#8B5CF6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
        const labels = Object.keys(categories);
        const data = Object.values(categories);
        
        const ctx = canvas.getContext('2d');
        
        if (this.chartInstances.category) {
            this.chartInstances.category.destroy();
        }
        
        this.chartInstances.category = new this.Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Notes',
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 8,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#ffffff',
                        bodyColor: '#a1a1aa'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#a1a1aa',
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#a1a1aa'
                        }
                    }
                }
            }
        });
    }
    
    createTrendChart() {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        
        // Get last 6 months data
        const months = this.getLast6Months();
        const trendData = this.getTrendData(months);
        
        const ctx = canvas.getContext('2d');
        
        if (this.chartInstances.trend) {
            this.chartInstances.trend.destroy();
        }
        
        this.chartInstances.trend = new this.Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Total Items',
                    data: trendData,
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#8B5CF6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#a1a1aa'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#ffffff',
                        bodyColor: '#a1a1aa'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#a1a1aa'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#a1a1aa'
                        }
                    }
                }
            }
        });
    }
    
    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        return days;
    }
    
    getLast6Months() {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            months.push(date.toLocaleDateString('en-US', { month: 'short' }));
        }
        return months;
    }
    
    getActivityData(days) {
        const filesData = new Array(7).fill(0);
        const notesData = new Array(7).fill(0);
        const tasksData = new Array(7).fill(0);
        
        this.vaultData.files.forEach(file => {
            const fileDate = new Date(file.date);
            const dayIndex = this.getDayIndex(fileDate);
            if (dayIndex >= 0) filesData[dayIndex]++;
        });
        
        this.vaultData.notes.forEach(note => {
            const noteDate = new Date(note.updated || note.created);
            const dayIndex = this.getDayIndex(noteDate);
            if (dayIndex >= 0) notesData[dayIndex]++;
        });
        
        this.vaultData.tasks.forEach(task => {
            const taskDate = new Date(task.updated || task.created);
            const dayIndex = this.getDayIndex(taskDate);
            if (dayIndex >= 0) tasksData[dayIndex]++;
        });
        
        return { files: filesData, notes: notesData, tasks: tasksData };
    }
    
    getDayIndex(date) {
        const today = new Date();
        const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
            return 6 - diffDays;
        }
        return -1;
    }
    
    getTrendData(months) {
        const trendData = new Array(6).fill(0);
        
        const allItems = [
            ...this.vaultData.files,
            ...this.vaultData.notes,
            ...this.vaultData.tasks,
            ...this.vaultData.bookmarks
        ];
        
        allItems.forEach(item => {
            const itemDate = new Date(item.date || item.updated || item.created);
            const monthIndex = this.getMonthIndex(itemDate);
            if (monthIndex >= 0) trendData[monthIndex]++;
        });
        
        return trendData;
    }
    
    getMonthIndex(date) {
        const today = new Date();
        const diffMonths = (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());
        if (diffMonths >= 0 && diffMonths < 6) {
            return 5 - diffMonths;
        }
        return -1;
    }
    
    refreshAllCharts() {
        this.vaultData = this.getVaultData();
        this.createActivityChart();
        this.createStorageChart();
        this.createTasksChart();
        this.createCategoryChart();
        this.createTrendChart();
    }
    
    destroyAllCharts() {
        Object.values(this.chartInstances).forEach(chart => {
            if (chart && chart.destroy) chart.destroy();
        });
        this.chartInstances = {};
    }
}

// Initialize chart manager
const chartManager = new ChartManager();
window.chartManager = chartManager;