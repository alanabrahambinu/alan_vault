/* ========================================
   ALAN VAULT - SERVICE WORKER
   PWA & Offline Support
   ======================================== */

const CACHE_NAME = 'alan-vault-v2.0.0';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/login.html',
  '/signup.html',
  '/offline.html',
  '/404.html',
  '/css/main.css',
  '/css/dashboard.css',
  '/css/auth.css',
  '/js/app.js',
  '/js/config.js',
  '/js/auth-guard.js',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints to cache (GET only)
const API_CACHE_ENDPOINTS = [
  '/api/health',
  '/api/files/list',
  '/api/notes/list',
  '/api/tasks/list',
  '/api/bookmarks/list'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Now ready to handle fetches');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event));
    return;
  }
  
  // Handle HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event));
    return;
  }
  
  // Handle static assets
  event.respondWith(handleStaticRequest(event));
});

// Handle API requests with network-first strategy
async function handleApiRequest(event) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(event.request.clone());
    
    // Cache the response for offline use
    if (networkResponse.ok && event.request.method === 'GET') {
      cache.put(event.request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[Service Worker] Network failed, trying cache for:', event.request.url);
    const cachedResponse = await cache.match(event.request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'You are offline', message: 'Please check your connection' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(event) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(event.request);
    
    // Cache the page for offline use
    if (networkResponse.ok) {
      cache.put(event.request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, serve offline page
    console.log('[Service Worker] Offline - serving offline page');
    const cachedOfflinePage = await cache.match(OFFLINE_URL);
    
    if (cachedOfflinePage) {
      return cachedOfflinePage;
    }
    
    // Fallback offline page
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Handle static asset requests (cache-first strategy)
async function handleStaticRequest(event) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(event.request);
  
  if (cachedResponse) {
    // Return cached response and update cache in background
    event.waitUntil(updateCache(event.request));
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(event.request);
    
    if (networkResponse.ok) {
      cache.put(event.request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Failed to fetch:', event.request.url);
    
    // Return a basic response for images
    if (event.request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><circle cx="8.5" cy="8.5" r="2.5"/><path d="M21 15l-5-5-6 6-3-3-4 4"/></svg>',
        {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' }
        }
      );
    }
    
    throw error;
  }
}

// Update cache in background
async function updateCache(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail
  }
}

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event.tag);
  
  if (event.tag === 'sync-uploads') {
    event.waitUntil(syncUploads());
  }
});

// Sync queued uploads when back online
async function syncUploads() {
  const cache = await caches.open(CACHE_NAME);
  const queuedRequests = await cache.match('/offline-queue');
  
  if (queuedRequests) {
    const queue = await queuedRequests.json();
    
    for (const request of queue) {
      try {
        await fetch(request);
      } catch (error) {
        console.error('[Service Worker] Failed to sync:', error);
      }
    }
    
    // Clear queue after sync
    await cache.delete('/offline-queue');
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let data = {
    title: 'Alan Vault',
    body: 'You have new activity',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: 'alan-vault-notification'
  };
  
  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (error) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/dashboard.html'
      },
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearCache());
  }
});

// Clear all caches
async function clearCache() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  );
}

// Get cache size
async function getCacheSize() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let totalSize = 0;
  
  for (const request of keys) {
    const response = await cache.match(request);
    const blob = await response.blob();
    totalSize += blob.size;
  }
  
  return totalSize;
}

// Version check for updates
self.addEventListener('message', (event) => {
  if (event.data.type === 'CHECK_VERSION') {
    event.source.postMessage({
      type: 'VERSION_INFO',
      version: CACHE_NAME,
      cacheSize: getCacheSize()
    });
  }
});