/* ========================================
   ALAN VAULT - SEARCH ENGINE
   Global Search & Indexing System
   ======================================== */

class SearchEngine {
    constructor() {
        this.index = {
            files: [],
            notes: [],
            tasks: [],
            bookmarks: []
        };
        this.searchHistory = [];
        this.recentSearches = [];
        this.searchResultsCache = new Map();
        this.init();
    }
    
    init() {
        this.loadSearchHistory();
        this.buildIndex();
        this.setupEventListeners();
        
        // Rebuild index when data changes
        document.addEventListener('vault:updated', () => this.buildIndex());
        document.addEventListener('data:loaded', () => this.buildIndex());
    }
    
    buildIndex() {
        const user = JSON.parse(localStorage.getItem(CONFIG?.STORAGE_KEYS?.USER_DATA || 'currentUser') || '{}');
        const vaultKey = `vault_${user.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '{"files":[],"notes":[],"tasks":[],"bookmarks":[]}');
        
        this.index = {
            files: vault.files.map(f => ({
                id: f.id,
                title: f.name,
                content: f.name,
                type: 'file',
                icon: '📄',
                date: f.date,
                size: f.size,
                folderId: f.folderId,
                favorite: f.favorite || false,
                score: 0
            })),
            notes: vault.notes.map(n => ({
                id: n.id,
                title: n.title,
                content: n.content,
                type: 'note',
                icon: '📝',
                date: n.updated,
                category: n.category,
                tags: n.tags || [],
                pinned: n.pinned || false,
                favorite: n.favorite || false,
                score: 0
            })),
            tasks: vault.tasks.map(t => ({
                id: t.id,
                title: t.title,
                content: t.description || '',
                type: 'task',
                icon: '✅',
                date: t.updated,
                priority: t.priority,
                status: t.status,
                category: t.category,
                completed: t.completed,
                dueDate: t.dueDate,
                score: 0
            })),
            bookmarks: vault.bookmarks.map(b => ({
                id: b.id,
                title: b.title,
                content: b.url,
                type: 'bookmark',
                icon: '🔗',
                date: b.created,
                url: b.url,
                category: b.category,
                tags: b.tags || [],
                favorite: b.favorite || false,
                score: 0
            }))
        };
        
        console.log(`Search index built: ${this.getTotalItems()} items indexed`);
    }
    
    getTotalItems() {
        return this.index.files.length + this.index.notes.length + 
               this.index.tasks.length + this.index.bookmarks.length;
    }
    
    search(query, options = {}) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        
        const {
            types = ['file', 'note', 'task', 'bookmark'],
            limit = 20,
            fuzzy = true,
            caseSensitive = false,
            category = null,
            priority = null,
            dateFrom = null,
            dateTo = null,
            favorite = null,
            pinned = null,
            completed = null
        } = options;
        
        const searchTerm = caseSensitive ? query : query.toLowerCase();
        const results = [];
        
        // Search through each type
        for (const type of types) {
            const items = this.index[type + 's'] || [];
            
            for (const item of items) {
                let score = 0;
                const title = caseSensitive ? item.title : item.title.toLowerCase();
                const content = caseSensitive ? item.content : item.content.toLowerCase();
                
                // Apply filters
                if (category && item.category && item.category !== category) continue;
                if (priority && item.priority && item.priority !== priority) continue;
                if (favorite !== null && item.favorite !== favorite) continue;
                if (pinned !== null && item.pinned !== pinned) continue;
                if (completed !== null && item.completed !== completed) continue;
                
                // Date filters
                if (dateFrom && new Date(item.date) < new Date(dateFrom)) continue;
                if (dateTo && new Date(item.date) > new Date(dateTo)) continue;
                
                // Exact match in title (highest score)
                if (title === searchTerm) {
                    score += 100;
                }
                // Title contains query
                else if (title.includes(searchTerm)) {
                    score += 50;
                    // Boost for starts with
                    if (title.startsWith(searchTerm)) {
                        score += 20;
                    }
                }
                
                // Content match
                if (content.includes(searchTerm)) {
                    score += 30;
                    // Boost for exact phrase
                    if (content === searchTerm) {
                        score += 40;
                    }
                }
                
                // Tag matches
                if (item.tags && item.tags.length > 0) {
                    const tagMatch = item.tags.some(tag => 
                        tag.toLowerCase().includes(searchTerm)
                    );
                    if (tagMatch) score += 25;
                }
                
                // Fuzzy matching
                if (fuzzy && score === 0) {
                    const fuzzyScore = this.fuzzyMatch(title, searchTerm);
                    if (fuzzyScore > 0) {
                        score = fuzzyScore;
                    }
                }
                
                if (score > 0) {
                    results.push({
                        ...item,
                        score: score,
                        highlight: {
                            title: this.highlightText(item.title, searchTerm),
                            content: item.content ? this.highlightText(item.content.substring(0, 300), searchTerm) : ''
                        }
                    });
                }
            }
        }
        
        // Sort by score (descending) and date (descending)
        results.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return new Date(b.date) - new Date(a.date);
        });
        
        // Limit results
        const finalResults = results.slice(0, limit);
        
        // Add to search history
        this.addToHistory(query, finalResults.length);
        
        // Cache results
        const cacheKey = this.getCacheKey(query, options);
        this.searchResultsCache.set(cacheKey, {
            results: finalResults,
            timestamp: Date.now(),
            query: query
        });
        
        // Dispatch search event
        this.dispatchSearchEvent(query, finalResults.length);
        
        return finalResults;
    }
    
    advancedSearch(filters) {
        const {
            query = '',
            types = ['file', 'note', 'task', 'bookmark'],
            dateFrom = null,
            dateTo = null,
            category = null,
            priority = null,
            sizeMin = null,
            sizeMax = null,
            tags = [],
            favorite = null,
            pinned = null,
            completed = null,
            limit = 50
        } = filters;
        
        let results = this.search(query, {
            types,
            dateFrom,
            dateTo,
            category,
            priority,
            favorite,
            pinned,
            completed,
            limit: 1000 // Get more results for filtering
        });
        
        // Apply size filters
        if (sizeMin !== null || sizeMax !== null) {
            results = results.filter(r => {
                const size = r.size || 0;
                if (sizeMin !== null && size < sizeMin) return false;
                if (sizeMax !== null && size > sizeMax) return false;
                return true;
            });
        }
        
        // Apply tag filters
        if (tags.length > 0) {
            results = results.filter(r => {
                if (!r.tags) return false;
                return tags.some(tag => r.tags.includes(tag));
            });
        }
        
        // Group by type
        const grouped = {
            files: results.filter(r => r.type === 'file'),
            notes: results.filter(r => r.type === 'note'),
            tasks: results.filter(r => r.type === 'task'),
            bookmarks: results.filter(r => r.type === 'bookmark')
        };
        
        return {
            total: results.length,
            grouped: grouped,
            results: results.slice(0, limit)
        };
    }
    
    fuzzyMatch(text, query) {
        // Simple fuzzy matching algorithm
        const textLower = text.toLowerCase();
        const queryLower = query.toLowerCase();
        
        let queryIndex = 0;
        let score = 0;
        let consecutiveMatches = 0;
        
        for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
            if (textLower[i] === queryLower[queryIndex]) {
                queryIndex++;
                consecutiveMatches++;
                score += 10 + (consecutiveMatches * 2);
            } else {
                consecutiveMatches = 0;
            }
        }
        
        // Return score only if all characters matched in order
        return queryIndex === queryLower.length ? score : 0;
    }
    
    highlightText(text, query) {
        if (!text || !query) return text;
        
        // Escape regex special characters
        const escapedQuery = this.escapeRegex(query);
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    getSuggestions(query, limit = 5) {
        if (!query || query.length < 2) return [];
        
        const suggestions = [];
        const searchTerm = query.toLowerCase();
        
        // Get unique words from titles in index
        const allTitles = [
            ...this.index.files.map(f => f.title),
            ...this.index.notes.map(n => n.title),
            ...this.index.tasks.map(t => t.title),
            ...this.index.bookmarks.map(b => b.title)
        ];
        
        const wordSet = new Set();
        allTitles.forEach(title => {
            const words = title.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 2) wordSet.add(word);
            });
        });
        
        // Find matching words
        for (const word of wordSet) {
            if (word.includes(searchTerm) && !suggestions.includes(word)) {
                suggestions.push(word);
                if (suggestions.length >= limit) break;
            }
        }
        
        // Add recent searches
        const recentMatches = this.recentSearches
            .filter(s => s.toLowerCase().includes(searchTerm))
            .slice(0, limit - suggestions.length);
        
        for (const recent of recentMatches) {
            if (!suggestions.includes(recent)) {
                suggestions.push(recent);
            }
        }
        
        return suggestions;
    }
    
    getAutocomplete(query, limit = 10) {
        if (!query || query.length < 1) return [];
        
        const searchTerm = query.toLowerCase();
        const matches = [];
        
        const allItems = [
            ...this.index.files.map(f => ({ text: f.title, type: 'file', icon: '📄' })),
            ...this.index.notes.map(n => ({ text: n.title, type: 'note', icon: '📝' })),
            ...this.index.tasks.map(t => ({ text: t.title, type: 'task', icon: '✅' })),
            ...this.index.bookmarks.map(b => ({ text: b.title, type: 'bookmark', icon: '🔗' }))
        ];
        
        for (const item of allItems) {
            if (item.text.toLowerCase().startsWith(searchTerm)) {
                matches.push(item);
                if (matches.length >= limit) break;
            }
        }
        
        if (matches.length < limit) {
            for (const item of allItems) {
                if (item.text.toLowerCase().includes(searchTerm) && 
                    !matches.includes(item)) {
                    matches.push(item);
                    if (matches.length >= limit) break;
                }
            }
        }
        
        return matches;
    }
    
    addToHistory(query, resultCount) {
        // Add to search history
        this.searchHistory.unshift({
            query: query,
            timestamp: new Date().toISOString(),
            resultCount: resultCount
        });
        
        // Keep only last 100 searches
        if (this.searchHistory.length > 100) {
            this.searchHistory.pop();
        }
        
        // Add to recent searches (unique)
        if (!this.recentSearches.includes(query)) {
            this.recentSearches.unshift(query);
            if (this.recentSearches.length > 20) {
                this.recentSearches.pop();
            }
        }
        
        this.saveSearchHistory();
    }
    
    getSearchHistory(limit = 20) {
        return this.searchHistory.slice(0, limit);
    }
    
    getRecentSearches(limit = 10) {
        return this.recentSearches.slice(0, limit);
    }
    
    clearHistory() {
        this.searchHistory = [];
        this.recentSearches = [];
        this.searchResultsCache.clear();
        this.saveSearchHistory();
        
        this.dispatchEvent('search:history-cleared');
    }
    
    saveSearchHistory() {
        localStorage.setItem('search_history', JSON.stringify({
            history: this.searchHistory,
            recent: this.recentSearches
        }));
    }
    
    loadSearchHistory() {
        const saved = localStorage.getItem('search_history');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.searchHistory = data.history || [];
                this.recentSearches = data.recent || [];
            } catch (e) {
                console.error('Failed to load search history:', e);
            }
        }
    }
    
    getCacheKey(query, options) {
        return `${query}_${JSON.stringify(options)}`;
    }
    
    getCachedResult(query, options) {
        const key = this.getCacheKey(query, options);
        const cached = this.searchResultsCache.get(key);
        
        if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) { // 5 minutes cache
            return cached.results;
        }
        
        return null;
    }
    
    clearCache() {
        this.searchResultsCache.clear();
        this.dispatchEvent('search:cache-cleared');
    }
    
    getPopularSearches(limit = 10) {
        const searchCounts = {};
        
        this.searchHistory.forEach(item => {
            const query = item.query;
            searchCounts[query] = (searchCounts[query] || 0) + 1;
        });
        
        return Object.entries(searchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([query, count]) => ({ query, count }));
    }
    
    getSearchStats() {
        const totalSearches = this.searchHistory.length;
        const uniqueSearches = new Set(this.searchHistory.map(h => h.query)).size;
        const avgResults = this.searchHistory.reduce((sum, h) => sum + (h.resultCount || 0), 0) / (totalSearches || 1);
        
        // Most searched terms
        const searchCounts = {};
        this.searchHistory.forEach(item => {
            searchCounts[item.query] = (searchCounts[item.query] || 0) + 1;
        });
        const topSearches = Object.entries(searchCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([query, count]) => ({ query, count }));
        
        return {
            totalSearches,
            uniqueSearches,
            averageResultsPerSearch: Math.round(avgResults),
            topSearches: topSearches,
            lastSearch: this.searchHistory[0] || null
        };
    }
    
    indexItem(item, type) {
        const typeKey = type + 's';
        if (this.index[typeKey]) {
            // Check if already exists
            const existingIndex = this.index[typeKey].findIndex(i => i.id === item.id);
            if (existingIndex !== -1) {
                this.index[typeKey][existingIndex] = this.formatIndexItem(item, type);
            } else {
                this.index[typeKey].push(this.formatIndexItem(item, type));
            }
        }
    }
    
    formatIndexItem(item, type) {
        const baseItem = {
            id: item.id,
            date: item.date || item.updated || item.created,
            score: 0
        };
        
        switch(type) {
            case 'file':
                return {
                    ...baseItem,
                    title: item.name,
                    content: item.name,
                    type: 'file',
                    icon: '📄',
                    size: item.size,
                    folderId: item.folderId,
                    favorite: item.favorite
                };
            case 'note':
                return {
                    ...baseItem,
                    title: item.title,
                    content: item.content,
                    type: 'note',
                    icon: '📝',
                    category: item.category,
                    tags: item.tags,
                    pinned: item.pinned,
                    favorite: item.favorite
                };
            case 'task':
                return {
                    ...baseItem,
                    title: item.title,
                    content: item.description,
                    type: 'task',
                    icon: '✅',
                    priority: item.priority,
                    status: item.status,
                    category: item.category,
                    completed: item.completed,
                    dueDate: item.dueDate
                };
            case 'bookmark':
                return {
                    ...baseItem,
                    title: item.title,
                    content: item.url,
                    type: 'bookmark',
                    icon: '🔗',
                    url: item.url,
                    category: item.category,
                    tags: item.tags,
                    favorite: item.favorite
                };
            default:
                return baseItem;
        }
    }
    
    removeFromIndex(id, type) {
        const typeKey = type + 's';
        if (this.index[typeKey]) {
            this.index[typeKey] = this.index[typeKey].filter(i => i.id !== id);
        }
    }
    
    setupEventListeners() {
        // Listen for search input events
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const query = e.target.value.trim();
                    if (query.length >= 2) {
                        this.performLiveSearch(query);
                    }
                }, 300);
            });
        }
        
        // Listen for item changes
        document.addEventListener('file:uploaded', () => this.buildIndex());
        document.addEventListener('file:deleted', () => this.buildIndex());
        document.addEventListener('note:created', () => this.buildIndex());
        document.addEventListener('note:updated', () => this.buildIndex());
        document.addEventListener('note:deleted', () => this.buildIndex());
        document.addEventListener('task:created', () => this.buildIndex());
        document.addEventListener('task:updated', () => this.buildIndex());
        document.addEventListener('task:deleted', () => this.buildIndex());
        document.addEventListener('bookmark:added', () => this.buildIndex());
        document.addEventListener('bookmark:deleted', () => this.buildIndex());
    }
    
    performLiveSearch(query) {
        const suggestions = this.getAutocomplete(query, 5);
        this.dispatchEvent('search:live', { query, suggestions });
    }
    
    dispatchSearchEvent(query, resultCount) {
        const event = new CustomEvent('search:performed', {
            detail: { query, resultCount, timestamp: new Date().toISOString() }
        });
        document.dispatchEvent(event);
    }
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    // Export search results
    exportResults(results, format = 'json') {
        const exportData = {
            query: results.query || '',
            results: results,
            exportDate: new Date().toISOString(),
            totalResults: results.length
        };
        
        let content, mimeType, extension;
        
        if (format === 'json') {
            content = JSON.stringify(exportData, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else if (format === 'csv') {
            const headers = ['Type', 'Title', 'Date', 'Score'];
            const rows = results.map(r => [
                r.type,
                r.title,
                new Date(r.date).toLocaleDateString(),
                r.score
            ]);
            content = [headers, ...rows].map(row => row.join(',')).join('\n');
            mimeType = 'text/csv';
            extension = 'csv';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `search_results_${Date.now()}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.dispatchEvent('search:exported', { format, count: results.length });
    }
}

// Initialize search engine
const searchEngine = new SearchEngine();
window.searchEngine = searchEngine;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SearchEngine };
}