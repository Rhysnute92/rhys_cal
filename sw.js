const CACHE_NAME = 'fitness-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/log.html',
    '/training.html',
    '/shared.css',
    '/dashboard.css',
    '/log.css',
    '/habits.css',
    '/state.js',
    '/index.js',
    '/log.js',
    '/training.js',
    '/rhys_logo.png',
    '/rhys_favicon.png',
    '/apple-touch-icon.png'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Fetching assets from cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});