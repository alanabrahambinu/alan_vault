/* ========================================
   ALAN VAULT - APPEARANCE SETTINGS
   Theme, Layout & UI Customization
   ======================================== */

class AppearanceManager {
    constructor() {
        this.settings = {
            theme: 'dark',
            fontSize: 'medium',
            layout: 'comfortable',
            animations: true,
            sidebarCollapsed: false,
            compactMode: false,
            reducedMotion: false,
            accentColor: 'purple'
        };
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.applySettings();
        this.setupEventListeners();
    }
    
    loadSettings() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const settingsKey = `${CONFIG.STORAGE_KEYS.SETTINGS_PREFIX}${user.id}`;
        const saved = localStorage.getItem(settingsKey);
        
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }
    
    saveSettings() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        const settingsKey = `${CONFIG.STORAGE_KEYS.SETTINGS_PREFIX}${user.id}`;
        localStorage.setItem(settingsKey, JSON.stringify(this.settings));
    }
    
    applySettings() {
        this.applyTheme();
        this.applyFontSize();
        this.applyLayout();
        this.applyAnimations();
        this.applySidebarState();
        this.applyAccentColor();
    }
    
    applyTheme() {
        document.body.setAttribute('data-theme', this.settings.theme);
        
        if (this.settings.theme === 'dark') {
            document.documentElement.style.setProperty('--bg-primary', '#0a0a0f');
            document.documentElement.style.setProperty('--text-primary', '#ffffff');
        } else if (this.settings.theme === 'light') {
            document.documentElement.style.setProperty('--bg-primary', '#f8fafc');
            document.documentElement.style.setProperty('--text-primary', '#0f172a');
        }
        
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = this.settings.theme === 'dark' ? '🌙' : '☀️';
        }
    }
    
    applyFontSize() {
        const sizes = {
            small: '14px',
            medium: '16px',
            large: '18px',
            xlarge: '20px'
        };
        
        document.documentElement.style.fontSize = sizes[this.settings.fontSize] || '16px';
    }
    
    applyLayout() {
        const layouts = {
            compact: {
                '--spacing-sm': '0.25rem',
                '--spacing-md': '0.5rem',
                '--spacing-lg': '0.75rem',
                '--spacing-xl': '1rem'
            },
            comfortable: {
                '--spacing-sm': '0.5rem',
                '--spacing-md': '1rem',
                '--spacing-lg': '1.5rem',
                '--spacing-xl': '2rem'
            },
            relaxed: {
                '--spacing-sm': '0.75rem',
                '--spacing-md': '1.5rem',
                '--spacing-lg': '2rem',
                '--spacing-xl': '3rem'
            }
        };
        
        const layout = layouts[this.settings.layout] || layouts.comfortable;
        Object.entries(layout).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });
    }
    
    applyAnimations() {
        if (!this.settings.animations || this.settings.reducedMotion) {
            const style = document.createElement('style');
            style.id = 'disable-animations';
            style.textContent = `
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            const style = document.getElementById('disable-animations');
            if (style) style.remove();
        }
    }
    
    applySidebarState() {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar && this.settings.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }
    
    applyAccentColor() {
        const colors = {
            purple: { primary: '#4F46E5', secondary: '#8B5CF6' },
            blue: { primary: '#3B82F6', secondary: '#60A5FA' },
            green: { primary: '#10B981', secondary: '#34D399' },
            orange: { primary: '#F59E0B', secondary: '#FBBF24' },
            red: { primary: '#EF4444', secondary: '#F87171' },
            pink: { primary: '#EC4899', secondary: '#F472B6' }
        };
        
        const color = colors[this.settings.accentColor] || colors.purple;
        document.documentElement.style.setProperty('--primary', color.primary);
        document.documentElement.style.setProperty('--secondary', color.secondary);
        document.documentElement.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${color.primary}, ${color.secondary})`);
    }
    
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
        
        document.dispatchEvent(new CustomEvent('appearance:updated', {
            detail: { key, value }
        }));
    }
    
    setupEventListeners() {
        // Theme selector
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.updateSetting('theme', btn.dataset.theme);
            });
        });
        
        // Font size
        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                this.updateSetting('fontSize', e.target.value);
            });
            fontSizeSelect.value = this.settings.fontSize;
        }
        
        // Layout density
        const layoutSelect = document.getElementById('layoutDensity');
        if (layoutSelect) {
            layoutSelect.addEventListener('change', (e) => {
                this.updateSetting('layout', e.target.value);
            });
            layoutSelect.value = this.settings.layout;
        }
        
        // Animations toggle
        const animationsToggle = document.getElementById('animationsToggle');
        if (animationsToggle) {
            animationsToggle.checked = this.settings.animations;
            animationsToggle.addEventListener('change', (e) => {
                this.updateSetting('animations', e.target.checked);
            });
        }
        
        // Reduced motion
        const reducedMotionToggle = document.getElementById('reducedMotion');
        if (reducedMotionToggle) {
            reducedMotionToggle.checked = this.settings.reducedMotion;
            reducedMotionToggle.addEventListener('change', (e) => {
                this.updateSetting('reducedMotion', e.target.checked);
            });
        }
        
        // Accent color
        document.querySelectorAll('[data-accent]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.updateSetting('accentColor', btn.dataset.accent);
                document.querySelectorAll('[data-accent]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            if (btn.dataset.accent === this.settings.accentColor) {
                btn.classList.add('active');
            }
        });
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.updateSetting('sidebarCollapsed', !this.settings.sidebarCollapsed);
            });
        }
    }
}

// Initialize appearance manager
const appearanceManager = new AppearanceManager();
window.appearanceManager = appearanceManager;