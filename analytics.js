/* ========================================
   ALAN VAULT - ANALYTICS
   User Tracking & Event Analytics
   ======================================== */

class AnalyticsService {
    constructor() {
        this.events = [];
        this.sessionId = null;
        this.startTime = null;
        this.pageViews = [];
        this.init();
    }
    
    init() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.loadEvents();
        this.trackPageView();
        this.setupEventListeners();
        
        // Send analytics periodically
        setInterval(() => this.flushEvents(), 30000);
        
        // Send on before unload
        window.addEventListener('beforeunload', () => this.flushEvents());
    }
    
    generateSessionId() {
        let sessionId = sessionStorage.getItem('analytics_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('analytics_session_id', sessionId);
        }
        return sessionId;
    }
    
    track(eventName, eventData = {}) {
        const event = {
            id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: eventName,
            data: eventData,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userId: this.getUserId(),
            url: window.location.href,
            referrer: document.referrer,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent
        };
        
        this.events.push(event);
        
        // Log to console in development
        if (window.location.hostname === 'localhost') {
            console.log('[Analytics]', eventName, eventData);
        }
        
        // Dispatch event for debugging
        document.dispatchEvent(new CustomEvent('analytics:tracked', { detail: event }));
        
        // Auto-flush if too many events
        if (this.events.length >= 10) {
            this.flushEvents();
        }
        
        return event;
    }
    
    trackPageView() {
        const pageView = {
            path: window.location.pathname,
            title: document.title,
            timestamp: new Date().toISOString(),
            referrer: document.referrer
        };
        
        this.pageViews.push(pageView);
        this.track('page_view', {
            path: pageView.path,
            title: pageView.title,
            referrer: pageView.referrer
        });
    }
    
    trackEvent(category, action, label = null, value = null) {
        return this.track('custom_event', {
            category,
            action,
            label,
            value
        });
    }
    
    trackError(error, context = {}) {
        return this.track('error', {
            message: error.message,
            stack: error.stack,
            ...context
        });
    }
    
    trackPerformance() {
        if (window.performance) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.track('performance', {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
                    loadComplete: navigation.loadEventEnd - navigation.fetchStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime
                });
            }
        }
    }
    
    getUserId() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
        return user.id || 'anonymous';
    }
    
    setupEventListeners() {
        // Track clicks on important elements
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-track]');
            if (target) {
                const eventName = target.dataset.track;
                const eventData = {
                    element: target.tagName,
                    text: target.textContent?.substring(0, 100),
                    href: target.href,
                    id: target.id,
                    className: target.className
                };
                this.track(eventName, eventData);
            }
        });
        
        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            this.track('form_submit', {
                formId: form.id,
                formAction: form.action,
                formMethod: form.method
            });
        });
        
        // Track time on page
        let startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Date.now() - startTime;
            this.track('time_on_page', { duration: timeOnPage });
        });
    }
    
    flushEvents() {
        if (this.events.length === 0) return;
        
        const eventsToSend = [...this.events];
        this.events = [];
        
        // In production, send to backend
        this.sendToBackend(eventsToSend);
        
        // Also save to localStorage for offline
        this.saveEvents(eventsToSend);
    }
    
    sendToBackend(events) {
        // Mock API call - replace with actual endpoint
        console.log(`Sending ${events.length} analytics events to backend`);
        
        // In production:
        // fetch('/api/analytics', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ events })
        // }).catch(err => console.error('Analytics send failed:', err));
    }
    
    saveEvents(events) {
        const savedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
        const newEvents = [...savedEvents, ...events];
        
        // Keep only last 1000 events
        if (newEvents.length > 1000) {
            newEvents.splice(0, newEvents.length - 1000);
        }
        
        localStorage.setItem('analytics_events', JSON.stringify(newEvents));
    }
    
    loadEvents() {
        const savedEvents = localStorage.getItem('analytics_events');
        if (savedEvents) {
            this.events = JSON.parse(savedEvents);
        }
    }
    
    getSessionDuration() {
        return Date.now() - this.startTime;
    }
    
    getPageViews() {
        return this.pageViews;
    }
    
    getEvents(filter = {}) {
        let events = this.events;
        
        if (filter.name) {
            events = events.filter(e => e.name === filter.name);
        }
        
        if (filter.fromDate) {
            events = events.filter(e => new Date(e.timestamp) >= new Date(filter.fromDate));
        }
        
        if (filter.toDate) {
            events = events.filter(e => new Date(e.timestamp) <= new Date(filter.toDate));
        }
        
        return events;
    }
    
    getEventCounts() {
        const counts = {};
        this.events.forEach(event => {
            counts[event.name] = (counts[event.name] || 0) + 1;
        });
        return counts;
    }
    
    clearEvents() {
        this.events = [];
        localStorage.removeItem('analytics_events');
    }
    
    // Feature usage tracking
    trackFeatureUsage(featureName) {
        this.track('feature_usage', { feature: featureName });
    }
    
    // User engagement score (mock)
    getEngagementScore() {
        const pageViews = this.pageViews.length;
        const eventsCount = this.events.length;
        const sessionDuration = this.getSessionDuration();
        
        let score = 0;
        score += Math.min(pageViews * 10, 50);
        score += Math.min(eventsCount, 30);
        score += Math.min(sessionDuration / 60000, 20);
        
        return Math.min(score, 100);
    }
}

// Initialize analytics
const analytics = new AnalyticsService();
window.analytics = analytics;