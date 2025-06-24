
const CACHE_NAME = 'shopping-app-v1';
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

const API_CACHE = 'api-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // Cache API responses for offline use
    event.respondWith(
      caches.open(API_CACHE).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            // Return cached response and update in background
            fetch(event.request).then(fetchResponse => {
              if (fetchResponse.ok) {
                cache.put(event.request, fetchResponse.clone());
              }
            }).catch(() => {});
            return response;
          }
          
          // Try network first, fallback to cache
          return fetch(event.request).then(fetchResponse => {
            if (fetchResponse.ok) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            return new Response(JSON.stringify({
              error: 'Offline mode',
              message: 'This data is not available offline'
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
  } else {
    // Serve static files from cache
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
