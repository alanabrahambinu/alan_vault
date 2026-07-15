/* ========================================
   ALAN VAULT - RESPONSIVE MANAGER
   Complete Device Detection & UI Adjustment
   ======================================== */

// ========================================
// RESPONSIVE MANAGER CLASS
// ========================================

class ResponsiveManager {
    constructor() {
        this.breakpoints = {
            mobile: 640,
            tablet: 768,
            laptop: 1024,
            desktop: 1280,
            wide: 1440
        };
        this.currentBreakpoint = this.getBreakpoint();
        this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.init();
    }

    init() {
        this.setupResizeListener();
        this.setupOrientationListener();
        this.applyResponsiveClasses();
        this.setupTouchOptimizations();
        this.setupKeyboardShortcuts();
        this.setupScrollHandling();
        this.dispatchEvent('responsive:ready', {
            breakpoint: this.currentBreakpoint,
            isTouch: this.isTouch
        });
    }

    // ========================================
    // BREAKPOINT DETECTION
    // ========================================

    getBreakpoint() {
        const width = window.innerWidth;
        if (width < this.breakpoints.mobile) return 'mobile';
        if (width < this.breakpoints.tablet) return 'tablet';
        if (width < this.breakpoints.laptop) return 'laptop';
        if (width < this.breakpoints.desktop) return 'desktop';
        return 'wide';
    }

    getDeviceType() {
        const ua = navigator.userAgent;
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            return 'mobile';
        }
        if (/iPad|Android|Touch/i.test(ua) && window.innerWidth >= 768) {
            return 'tablet';
        }
        return 'desktop';
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    setupResizeListener() {
        let timeout;
        window.addEventListener('resize', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const newBreakpoint = this.getBreakpoint();
                if (newBreakpoint !== this.currentBreakpoint) {
                    this.currentBreakpoint = newBreakpoint;
                    this.applyResponsiveClasses();
                    this.dispatchEvent('breakpoint:changed', {
                        breakpoint: newBreakpoint,
                        width: window.innerWidth,
                        height: window.innerHeight
                    });
                }
            }, 250);
        });
    }

    setupOrientationListener() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.applyResponsiveClasses();
                this.dispatchEvent('orientation:changed', {
                    orientation: screen.orientation?.type || 'unknown',
                    angle: screen.orientation?.angle || 0
                });
            }, 300);
        });
    }

    // ========================================
    // APPLY RESPONSIVE CLASSES
    // ========================================

    applyResponsiveClasses() {
        // Remove existing breakpoint classes
        document.body.classList.remove('mobile', 'tablet', 'laptop', 'desktop', 'wide');
        document.body.classList.remove('mobile-view', 'tablet-view', 'desktop-view');
        
        // Add current breakpoint class
        document.body.classList.add(this.currentBreakpoint);
        document.body.classList.add(this.currentBreakpoint + '-view');

        // Add device type class
        const deviceType = this.getDeviceType();
        document.body.classList.add('device-' + deviceType);

        // Handle touch devices
        if (this.isTouch) {
            document.body.classList.add('touch-device');
        } else {
            document.body.classList.add('no-touch');
        }

        // Handle sidebar on desktop
        if (this.currentBreakpoint === 'desktop' || this.currentBreakpoint === 'wide') {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Dispatch event
        this.dispatchEvent('classes:applied', {
            breakpoint: this.currentBreakpoint,
            deviceType: deviceType,
            isTouch: this.isTouch
        });
    }

    // ========================================
    // TOUCH OPTIMIZATIONS
    // ========================================

    setupTouchOptimizations() {
        if (!this.isTouch) return;

        // Add touch-specific class
        document.body.classList.add('touch-device');

        // Ensure minimum touch targets
        const elements = document.querySelectorAll(
            'button, .nav-item, .stat-card, .quick-action-btn, ' +
            '.activity-item, .file-card, .note-card, .task-item, ' +
            '.folder-card, .btn, a, .clickable, .modal-close'
        );
        
        elements.forEach(el => {
            if (el) {
                el.style.minHeight = '44px';
                el.style.minWidth = '44px';
            }
        });

        // Remove hover effects on touch
        document.addEventListener('touchstart', () => {
            document.body.classList.add('touch-active');
        });

        document.addEventListener('touchend', () => {
            setTimeout(() => {
                document.body.classList.remove('touch-active');
            }, 100);
        });
    }

    // ========================================
    // KEYBOARD SHORTCUTS
    // ========================================

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + B or Cmd + B to toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                if (typeof toggleSidebar === 'function') {
                    toggleSidebar();
                } else if (window.toggleSidebar) {
                    window.toggleSidebar();
                }
            }

            // Escape to close modals and sidebar
            if (e.key === 'Escape') {
                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    const overlay = document.getElementById('sidebarOverlay');
                    if (sidebar && sidebar.classList.contains('active')) {
                        if (typeof toggleSidebar === 'function') {
                            toggleSidebar();
                        } else if (window.toggleSidebar) {
                            window.toggleSidebar();
                        }
                    }
                }

                // Close any open modal
                const modals = document.querySelectorAll('.modal.active, .modal-overlay.active');
                modals.forEach(modal => {
                    if (typeof closeModal === 'function') {
                        closeModal();
                    } else if (window.closeModal) {
                        window.closeModal();
                    }
                });
            }

            // Ctrl + F or Cmd + F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                const searchInput = document.querySelector(
                    '.search-box, #searchInput, #globalSearch, ' +
                    '#navbarSearch, .searchbar-input'
                );
                if (searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                    searchInput.select();
                }
            }

            // Ctrl + / or Cmd + / to show keyboard shortcuts help
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showShortcutsHelp();
            }

            // Ctrl + S or Cmd + S to save (if form is present)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const form = document.querySelector('form');
                if (form && document.activeElement?.closest('form')) {
                    e.preventDefault();
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    // ========================================
    // SCROLL HANDLING
    // ========================================

    setupScrollHandling() {
        let lastScrollY = window.scrollY;
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;
                    const scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
                    
                    this.dispatchEvent('scroll:changed', {
                        scrollY: currentScrollY,
                        direction: scrollDirection,
                        percentage: (currentScrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
                    });

                    // Hide/show top bar on scroll (mobile only)
                    if (window.innerWidth <= 768) {
                        const topBar = document.querySelector('.top-bar');
                        if (topBar) {
                            if (currentScrollY > 100 && scrollDirection === 'down') {
                                topBar.style.transform = 'translateY(-100%)';
                                topBar.style.opacity = '0';
                            } else if (scrollDirection === 'up' || currentScrollY < 50) {
                                topBar.style.transform = 'translateY(0)';
                                topBar.style.opacity = '1';
                            }
                        }
                    }

                    lastScrollY = currentScrollY;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ========================================
    // SHORTCUTS HELP
    // ========================================

    showShortcutsHelp() {
        const shortcuts = [
            { key: 'Ctrl/Cmd + B', description: 'Toggle Sidebar' },
            { key: 'Ctrl/Cmd + F', description: 'Focus Search' },
            { key: 'Ctrl/Cmd + S', description: 'Save Current Form' },
            { key: 'Ctrl/Cmd + /', description: 'Show Shortcuts Help' },
            { key: 'Escape', description: 'Close Modals & Sidebar' },
            { key: 'Ctrl/Cmd + N', description: 'New Note' },
            { key: 'Ctrl/Cmd + T', description: 'New Task' },
            { key: 'Ctrl/Cmd + K', description: 'Open Chat' },
        ];

        const modal = document.createElement('div');
        modal.className = 'shortcuts-modal modal-overlay active';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.2s ease;
        `;

        modal.innerHTML = `
            <div style="
                background: #1a1a2e;
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 24px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0;">⌨️ Keyboard Shortcuts</h3>
                    <button onclick="this.closest('.shortcuts-modal').remove()" style="
                        background: transparent;
                        border: none;
                        color: #a1a1aa;
                        font-size: 1.5rem;
                        cursor: pointer;
                    ">✕</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${shortcuts.map(s => `
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 0.5rem 0.75rem;
                            border-bottom: 1px solid rgba(255,255,255,0.05);
                            font-size: 0.9rem;
                        ">
                            <span style="
                                font-family: monospace;
                                background: rgba(139,92,246,0.15);
                                padding: 0.25rem 0.75rem;
                                border-radius: 6px;
                                color: #8B5CF6;
                                font-size: 0.85rem;
                            ">${s.key}</span>
                            <span style="color: #a1a1aa;">${s.description}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    font-size: 0.75rem;
                    color: #71717a;
                    text-align: center;
                ">
                    <p>💡 Tip: Press <kbd style="
                        background: rgba(139,92,246,0.2);
                        padding: 2px 8px;
                        border-radius: 4px;
                        color: #8B5CF6;
                    ">Ctrl + /</kbd> anytime to see this menu</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Close on Escape
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') modal.remove();
        });
        modal.focus();
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    isMobile() {
        return this.currentBreakpoint === 'mobile' || this.currentBreakpoint === 'tablet';
    }

    isDesktop() {
        return this.currentBreakpoint === 'desktop' || this.currentBreakpoint === 'wide';
    }

    getViewportWidth() {
        return window.innerWidth;
    }

    getViewportHeight() {
        return window.innerHeight;
    }

    getScrollPercentage() {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        return maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    }

    // ========================================
    // EVENT DISPATCH
    // ========================================

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`responsive:${eventName}`, { detail });
        document.dispatchEvent(event);
    }
}

// ========================================
// SIDEBAR FUNCTIONS
// ========================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const main = document.getElementById('mainContent');
    
    if (!sidebar) return;
    
    sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
    
    // Toggle body scroll
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('sidebar:toggled', {
        detail: { isOpen: sidebar.classList.contains('active') }
    }));
}

function collapseSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    
    if (!sidebar) return;
    
    sidebar.classList.toggle('collapsed');
    if (main) main.classList.toggle('expanded');
    
    // Save state
    localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    
    document.dispatchEvent(new CustomEvent('sidebar:collapsed', {
        detail: { isCollapsed: sidebar.classList.contains('collapsed') }
    }));
}

function restoreSidebarState() {
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    const isDesktop = window.innerWidth >= 1024;
    
    if (isCollapsed && isDesktop) {
        const sidebar = document.getElementById('sidebar');
        const main = document.getElementById('mainContent');
        if (sidebar) sidebar.classList.add('collapsed');
        if (main) main.classList.add('expanded');
    }
}

// ========================================
// SEARCH FUNCTIONS
// ========================================

function performSearch(event) {
    const query = event?.target?.value || '';
    const resultsContainer = document.getElementById('searchResults');
    
    if (resultsContainer) {
        if (query.length >= 2) {
            resultsContainer.classList.add('active');
            // Populate results here
        } else {
            resultsContainer.classList.remove('active');
        }
    }
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.dispatchEvent(new CustomEvent('modal:opened', {
            detail: { modalId: modalId }
        }));
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.dispatchEvent(new CustomEvent('modal:closed', {
            detail: { modalId: modalId }
        }));
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal.active, .modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// EVENT LISTENERS
// ========================================

// Close sidebar on resize to desktop
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close sidebar on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
});

// Close sidebar when clicking a nav link on mobile
document.addEventListener('click', function(e) {
    const link = e.target.closest('.nav-item, .nav-link');
    if (link && window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close modal when clicking overlay
document.addEventListener('click', function(e) {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay && overlay.classList.contains('active')) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ========================================
// INITIALIZATION
// ========================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        const responsiveManager = new ResponsiveManager();
        window.responsiveManager = responsiveManager;
        restoreSidebarState();
        
        // Dispatch ready event
        document.dispatchEvent(new CustomEvent('responsive:initialized', {
            detail: { breakpoint: responsiveManager.currentBreakpoint }
        }));
    });
} else {
    const responsiveManager = new ResponsiveManager();
    window.responsiveManager = responsiveManager;
    restoreSidebarState();
    
    document.dispatchEvent(new CustomEvent('responsive:initialized', {
        detail: { breakpoint: responsiveManager.currentBreakpoint }
    }));
}

// ========================================
// EXPOSE FUNCTIONS GLOBALLY
// ========================================

window.toggleSidebar = toggleSidebar;
window.collapseSidebar = collapseSidebar;
window.restoreSidebarState = restoreSidebarState;
window.performSearch = performSearch;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.showToast = showToast;

// ========================================
// CSS FOR DYNAMIC ELEMENTS
// ========================================

const responsiveStyles = document.createElement('style');
responsiveStyles.textContent = `
    /* ========================================
       RESPONSIVE JS - DYNAMIC STYLES
       ======================================== */
    
    .shortcuts-modal {
        animation: fadeIn 0.2s ease;
    }
    
    .shortcuts-modal kbd {
        background: rgba(139,92,246,0.2);
        padding: 2px 8px;
        border-radius: 4px;
        color: #8B5CF6;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    /* Top Bar Scroll Hide (Mobile) */
    @media (max-width: 768px) {
        .top-bar {
            transition: transform 0.3s ease, opacity 0.3s ease;
            position: sticky;
            top: 0;
            z-index: 50;
        }
    }
    
    /* Touch Device Feedback */
    .touch-device .hover-effect {
        transition: none !important;
    }
    
    .touch-device .hover-effect:active {
        transform: scale(0.96);
        opacity: 0.8;
    }
    
    /* Sidebar Collapsed */
    .sidebar.collapsed {
        width: 80px !important;
    }
    .sidebar.collapsed .logo-text,
    .sidebar.collapsed .nav-text,
    .sidebar.collapsed .nav-badge,
    .sidebar.collapsed .storage-text {
        display: none !important;
    }
    .sidebar.collapsed .nav-item {
        justify-content: center !important;
        padding: 0.75rem !important;
    }
    .sidebar.collapsed .sidebar-footer {
        padding: 1rem 0.5rem !important;
    }
    .sidebar.collapsed .storage-info {
        padding: 0.5rem !important;
    }
    .sidebar.collapsed .storage-bar {
        width: 40px !important;
        margin: 0 auto !important;
    }
    
    /* Sidebar Collapsed on Mobile Override */
    @media (max-width: 768px) {
        .sidebar.collapsed {
            width: 280px !important;
        }
        .sidebar.collapsed .logo-text,
        .sidebar.collapsed .nav-text,
        .sidebar.collapsed .nav-badge,
        .sidebar.collapsed .storage-text {
            display: inline !important;
        }
        .sidebar.collapsed .nav-item {
            justify-content: flex-start !important;
            padding: 12px 16px !important;
        }
        .sidebar.collapsed .sidebar-footer {
            padding: 1.5rem !important;
        }
        .sidebar.collapsed .storage-info {
            padding: 1rem !important;
        }
        .sidebar.collapsed .storage-bar {
            width: 100% !important;
            margin: 0.5rem 0 !important;
        }
    }
    
    /* Main Content Expanded */
    .main-content.expanded {
        margin-left: 80px !important;
        max-width: calc(100% - 80px) !important;
    }
    
    @media (max-width: 768px) {
        .main-content.expanded {
            margin-left: 0 !important;
            max-width: 100% !important;
        }
    }
`;

document.head.appendChild(responsiveStyles);

console.log('✅ Responsive Manager initialized');
console.log(`📱 Current breakpoint: ${window.responsiveManager?.currentBreakpoint || 'unknown'}`);
console.log('🔄 Use Ctrl+B to toggle sidebar, Ctrl+F for search, Ctrl+/ for shortcuts');