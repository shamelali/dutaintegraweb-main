const CACHE_NAME = 'dutaintegra-v1';
const STATIC_ASSETS = [
  '/',
  '/ms/',
  '/audit',
  '/ms/audit',
  '/services',
  '/ms/services',
  '/about',
  '/ms/about',
  '/cases',
  '/ms/cases',
  '/pricing',
  '/ms/pricing',
  '/contact',
  '/ms/contact',
  '/css/styles.css',
  '/js/main.js',
  '/components/header.html',
  '/components/footer.html',
  '/components/components-loader.js',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache and update in background
        event.waitUntil(
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }

      // Not in cache - fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Message handler for skip waiting
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});