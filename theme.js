/* ========================================
   ALAN VAULT - THEME MANAGER
   Complete Theme System
   ======================================== */

class ThemeManager {
    constructor() {
        this.themes = {
            dark: {
                name: 'Dark',
                icon: '🌙',
                colors: {
                    primary: '#4F46E5',
                    secondary: '#8B5CF6',
                    background: '#0a0a0f',
                    surface: '#1a1a2e',
                    text: '#ffffff',
                    card: 'rgba(255,255,255,0.03)',
                    border: 'rgba(255,255,255,0.05)'
                }
            },
            light: {
                name: 'Light',
                icon: '☀️',
                colors: {
                    primary: '#4F46E5',
                    secondary: '#8B5CF6',
                    background: '#f8fafc',
                    surface: '#ffffff',
                    text: '#0f172a',
                    card: 'rgba(0,0,0,0.02)',
                    border: 'rgba(0,0,0,0.05)'
                }
            },
            purple: {
                name: 'Purple Haze',
                icon: '💜',
                colors: {
                    primary: '#9333ea',
                    secondary: '#a855f7',
                    background: '#0f0717',
                    surface: '#1a0b2e',
                    text: '#f3e8ff',
                    card: 'rgba(255,255,255,0.03)',
                    border: 'rgba(139,92,246,0.2)'
                }
            },
            ocean: {
                name: 'Ocean Blue',
                icon: '🌊',
                colors: {
                    primary: '#0284c7',
                    secondary: '#0ea5e9',
                    background: '#082f49',
                    surface: '#0c4a6e',
                    text: '#e0f2fe',
                    card: 'rgba(255,255,255,0.03)',
                    border: 'rgba(14,165,233,0.2)'
                }
            },
            forest: {
                name: 'Forest Green',
                icon: '🌲',
                colors: {
                    primary: '#059669',
                    secondary: '#10b981',
                    background: '#064e3b',
                    surface: '#065f46',
                    text: '#d1fae5',
                    card: 'rgba(255,255,255,0.03)',
                    border: 'rgba(16,185,129,0.2)'
                }
            },
            sunset: {
                name: 'Sunset',
                icon: '🌅',
                colors: {
                    primary: '#ea580c',
                    secondary: '#f97316',
                    background: '#431407',
                    surface: '#7c2d12',
                    text: '#fed7aa',
                    card: 'rgba(255,255,255,0.03)',
                    border: 'rgba(249,115,22,0.2)'
                }
            }
        };
        
        this.currentTheme = 'dark';
        this.listeners = [];
        this.init();
    }
    
    init() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && this.themes[savedTheme]) {
            this.currentTheme = savedTheme;
        }
        this.applyTheme();
    }
    
    applyTheme() {
        const theme = this.themes[this.currentTheme];
        if (!theme) return;
        
        const root = document.documentElement;
        
        // Apply CSS variables
        root.style.setProperty('--primary', theme.colors.primary);
        root.style.setProperty('--secondary', theme.colors.secondary);
        root.style.setProperty('--bg-primary', theme.colors.background);
        root.style.setProperty('--bg-card', theme.colors.surface);
        root.style.setProperty('--text-primary', theme.colors.text);
        root.style.setProperty('--bg-card-alt', theme.colors.card);
        root.style.setProperty('--border-light', theme.colors.border);
        
        // Set gradient
        const gradient = `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`;
        root.style.setProperty('--gradient-primary', gradient);
        
        // Set data attribute for CSS targeting
        document.body.setAttribute('data-theme', this.currentTheme);
        
        // Save to localStorage
        localStorage.setItem('theme', this.currentTheme);
        
        // Dispatch event
        this.dispatchEvent('theme:changed', { theme: this.currentTheme });
        
        // Notify listeners
        this.listeners.forEach(listener => listener(this.currentTheme));
    }
    
    setTheme(themeName) {
        if (this.themes[themeName]) {
            this.currentTheme = themeName;
            this.applyTheme();
            
            // Update UI elements
            this.updateThemeUI();
            
            return true;
        }
        return false;
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    getThemeInfo() {
        return {
            ...this.themes[this.currentTheme],
            id: this.currentTheme
        };
    }
    
    getAllThemes() {
        return Object.entries(this.themes).map(([id, theme]) => ({
            id: id,
            ...theme
        }));
    }
    
    toggleTheme() {
        const themes = Object.keys(this.themes);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        return this.setTheme(themes[nextIndex]);
    }
    
    updateThemeUI() {
        // Update theme selector buttons
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === this.currentTheme) {
                btn.classList.add('active');
            }
        });
        
        // Update theme label if exists
        const label = document.getElementById('currentThemeLabel');
        if (label) {
            const info = this.getThemeInfo();
            label.textContent = `${info.icon} ${info.name}`;
        }
    }
    
    onThemeChange(callback) {
        this.listeners.push(callback);
    }
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();
window.themeManager = themeManager;