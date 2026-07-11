/* ========================================
   ALAN VAULT - ROUTER
   Client-Side Routing System
   ======================================== */

class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.notFoundHandler = null;
        this.beforeGuard = null;
        this.afterGuard = null;
    }
    
    // Register a new route
    addRoute(path, handler, options = {}) {
        const route = {
            path: path,
            handler: handler,
            requiresAuth: options.requiresAuth || false,
            roles: options.roles || [],
            exact: options.exact !== false,
            regex: this.pathToRegex(path)
        };
        this.routes.push(route);
        return this;
    }
    
    // Convert path pattern to regex
    pathToRegex(path) {
        // Handle named parameters
        const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
        const pathWithParams = path.replace(paramRegex, '([^/]+)');
        return new RegExp(`^${pathWithParams}$`);
    }
    
    // Extract parameters from path
    extractParams(path, routePath) {
        const paramNames = [];
        const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let match;
        
        while ((match = paramRegex.exec(routePath)) !== null) {
            paramNames.push(match[1]);
        }
        
        const paramValues = [];
        const valueRegex = this.pathToRegex(routePath);
        const values = valueRegex.exec(path);
        
        if (values) {
            for (let i = 1; i < values.length; i++) {
                paramValues.push(values[i]);
            }
        }
        
        const params = {};
        paramNames.forEach((name, index) => {
            params[name] = paramValues[index];
        });
        
        return params;
    }
    
    // Find matching route
    findRoute(path) {
        for (const route of this.routes) {
            if (route.regex.test(path)) {
                return route;
            }
        }
        return null;
    }
    
    // Set before navigation guard
    before(guard) {
        this.beforeGuard = guard;
        return this;
    }
    
    // Set after navigation guard
    after(guard) {
        this.afterGuard = guard;
        return this;
    }
    
    // Set 404 handler
    notFound(handler) {
        this.notFoundHandler = handler;
        return this;
    }
    
    // Navigate to a route
    async navigate(path, options = {}) {
        // Parse path
        const url = new URL(path, window.location.origin);
        const pathname = url.pathname;
        const search = url.search;
        const hash = url.hash;
        
        // Find route
        const route = this.findRoute(pathname);
        
        // Run before guard
        if (this.beforeGuard) {
            const canProceed = await this.beforeGuard({
                path: pathname,
                query: Object.fromEntries(url.searchParams),
                hash: hash,
                route: route
            });
            
            if (canProceed === false) {
                return false;
            }
            
            if (typeof canProceed === 'string') {
                return this.navigate(canProceed);
            }
        }
        
        // Check authentication
        if (route && route.requiresAuth) {
            const isAuthenticated = this.checkAuth();
            if (!isAuthenticated) {
                this.navigate('/login.html');
                return false;
            }
            
            // Check roles
            if (route.roles.length > 0) {
                const user = this.getCurrentUser();
                if (!user || !route.roles.includes(user.role)) {
                    this.navigate('/dashboard.html');
                    return false;
                }
            }
        }
        
        // Handle the route
        let result;
        if (route) {
            const params = this.extractParams(pathname, route.path);
            result = await route.handler({
                path: pathname,
                params: params,
                query: Object.fromEntries(url.searchParams),
                hash: hash
            });
        } else if (this.notFoundHandler) {
            result = await this.notFoundHandler({
                path: pathname,
                query: Object.fromEntries(url.searchParams)
            });
        } else {
            result = false;
        }
        
        // Run after guard
        if (this.afterGuard && result !== false) {
            await this.afterGuard({
                path: pathname,
                route: route,
                result: result
            });
        }
        
        // Update browser history
        if (!options.replace) {
            window.history.pushState({ path: pathname }, '', path);
        } else {
            window.history.replaceState({ path: pathname }, '', path);
        }
        
        this.currentRoute = {
            path: pathname,
            route: route,
            params: route ? this.extractParams(pathname, route.path) : {},
            query: Object.fromEntries(url.searchParams)
        };
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('route:changed', { detail: this.currentRoute }));
        
        return true;
    }
    
    // Initialize router
    init() {
        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            const path = event.state?.path || window.location.pathname;
            this.navigate(path, { replace: true });
        });
        
        // Handle initial load
        const initialPath = window.location.pathname;
        this.navigate(initialPath, { replace: true });
        
        // Handle link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.startsWith(window.location.origin)) {
                const path = link.pathname;
                if (this.shouldHandleLink(link)) {
                    e.preventDefault();
                    this.navigate(path);
                }
            }
        });
        
        return this;
    }
    
    shouldHandleLink(link) {
        // Don't handle links with target="_blank"
        if (link.target === '_blank') return false;
        
        // Don't handle links with download attribute
        if (link.hasAttribute('download')) return false;
        
        // Don't handle links with data-router-ignore
        if (link.hasAttribute('data-router-ignore')) return false;
        
        return true;
    }
    
    checkAuth() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        return !!(token && user);
    }
    
    getCurrentUser() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        return userData ? JSON.parse(userData) : null;
    }
    
    // Helper methods
    redirect(path) {
        this.navigate(path, { replace: true });
    }
    
    reload() {
        window.location.reload();
    }
    
    getCurrentPath() {
        return window.location.pathname;
    }
    
    getQueryParams() {
        return Object.fromEntries(new URLSearchParams(window.location.search));
    }
    
    updateQueryParams(params, replace = false) {
        const url = new URL(window.location.href);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        
        if (replace) {
            window.history.replaceState({}, '', url.toString());
        } else {
            window.history.pushState({}, '', url.toString());
        }
        
        document.dispatchEvent(new CustomEvent('route:query-changed', { 
            detail: { params: this.getQueryParams() }
        }));
    }
}

// Create and export router instance
const router = new Router();
window.router = router;