/* ========================================
   ALAN VAULT - LINK PREVIEWS
   Rich Previews for Bookmarks
   ======================================== */

class LinkPreview {
    constructor() {
        this.cache = new Map();
        this.init();
    }
    
    init() {
        this.loadCache();
        this.setupPreviewOnHover();
    }
    
    loadCache() {
        const saved = localStorage.getItem('link_previews_cache');
        if (saved) {
            const data = JSON.parse(saved);
            this.cache = new Map(Object.entries(data));
        }
    }
    
    saveCache() {
        const obj = Object.fromEntries(this.cache);
        localStorage.setItem('link_previews_cache', JSON.stringify(obj));
    }
    
    async fetchPreview(url) {
        // Check cache first
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }
        
        try {
            // Fetch page metadata
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            const html = data.contents;
            
            const preview = {
                title: this.extractMetaTag(html, 'og:title') || this.extractTitle(html),
                description: this.extractMetaTag(html, 'og:description') || this.extractMetaTag(html, 'description'),
                image: this.extractMetaTag(html, 'og:image'),
                siteName: this.extractMetaTag(html, 'og:site_name'),
                url: url,
                favicon: this.getFaviconUrl(url)
            };
            
            // Cache the preview
            this.cache.set(url, preview);
            this.saveCache();
            
            return preview;
            
        } catch (error) {
            console.error('Failed to fetch preview:', error);
            return null;
        }
    }
    
    extractMetaTag(html, property) {
        const regex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
        const match = html.match(regex);
        return match ? match[1] : null;
    }
    
    extractTitle(html) {
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return match ? match[1].trim() : null;
    }
    
    getFaviconUrl(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {
            return '';
        }
    }
    
    async renderPreview(url, container) {
        const preview = await this.fetchPreview(url);
        
        if (!preview) {
            container.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: #71717a;">
                    Could not load preview
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="link-preview" style="
                display: flex;
                gap: 1rem;
                padding: 1rem;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                border: 1px solid rgba(139,92,246,0.2);
                transition: all 0.3s;
            ">
                ${preview.image ? `
                    <div style="flex-shrink: 0;">
                        <img src="${preview.image}" alt="" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                    </div>
                ` : `
                    <div style="flex-shrink: 0; width: 100px; height: 100px; background: rgba(139,92,246,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2rem;">
                        🔗
                    </div>
                `}
                <div style="flex: 1;">
                    <h4 style="margin-bottom: 0.25rem;">${this.escapeHtml(preview.title || 'Untitled')}</h4>
                    ${preview.siteName ? `<div style="font-size: 0.7rem; color: #8B5CF6; margin-bottom: 0.5rem;">${this.escapeHtml(preview.siteName)}</div>` : ''}
                    <p style="font-size: 0.8rem; color: #a1a1aa; margin-bottom: 0.5rem;">${this.escapeHtml(preview.description || 'No description available')}</p>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${preview.favicon}" alt="" style="width: 16px; height: 16px;" onerror="this.style.display='none'">
                        <span style="font-size: 0.7rem; color: #71717a; word-break: break-all;">${this.escapeHtml(preview.url)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupPreviewOnHover() {
        let timeout;
        let previewContainer = null;
        
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a[href^="http"]');
            if (!link) return;
            
            clearTimeout(timeout);
            
            timeout = setTimeout(async () => {
                // Create preview container
                if (previewContainer) previewContainer.remove();
                
                previewContainer = document.createElement('div');
                previewContainer.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 400px;
                    z-index: 10000;
                    animation: fadeInUp 0.3s ease;
                `;
                document.body.appendChild(previewContainer);
                
                await this.renderPreview(link.href, previewContainer);
                
                // Auto-remove after 5 seconds
                setTimeout(() => {
                    if (previewContainer) previewContainer.remove();
                }, 5000);
            }, 1000);
        });
        
        document.addEventListener('mouseout', (e) => {
            const link = e.target.closest('a[href^="http"]');
            if (link) {
                clearTimeout(timeout);
                if (previewContainer) {
                    previewContainer.remove();
                    previewContainer = null;
                }
            }
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize link preview
const linkPreview = new LinkPreview();
window.linkPreview = linkPreview;