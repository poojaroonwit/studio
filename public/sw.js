// Service Worker for FitScan PWA
const CACHE_NAME = 'fitscan-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch((error) => {
          console.error('Failed to cache resources:', error);
          // Don't fail installation if caching fails
        });
      })
  );
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Helper function to check if request should be handled by service worker
function shouldHandleRequest(request) {
  const url = new URL(request.url);
  
  // Don't intercept API routes
  if (url.pathname.startsWith('/api/')) {
    return false;
  }
  
  // Don't intercept external resources
  if (url.origin !== self.location.origin) {
    return false;
  }
  
  // Don't intercept non-GET requests
  if (request.method !== 'GET') {
    return false;
  }
  
  // Don't intercept requests with cache-control: no-cache
  const cacheControl = request.headers.get('cache-control');
  if (cacheControl && cacheControl.includes('no-cache')) {
    return false;
  }
  
  return true;
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip requests that shouldn't be handled by service worker
  if (!shouldHandleRequest(event.request)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Try to fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch((error) => {
                  console.error('Failed to cache response:', error);
                });
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('Network fetch failed:', error);
            
            // For navigation requests, try to return cached index page
            if (event.request.mode === 'navigate') {
              return caches.match('/').then((indexResponse) => {
                if (indexResponse) {
                  return indexResponse;
                }
                // If no cached index, return a basic offline page
                return new Response('Offline - Please check your connection', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/plain' }
                });
              });
            }
            
            // For other requests, return error response
            return new Response('Network error', {
              status: 408,
              statusText: 'Request Timeout',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
      .catch((error) => {
        console.error('Cache match failed:', error);
        // Fallback to network
        return fetch(event.request).catch((networkError) => {
          console.error('All fetch attempts failed:', networkError);
          return new Response('Service unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

