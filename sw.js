const CACHE_NAME = 'fitness-pro-v1';
const ASSETS = [
    './',
    './index.html',
    './shared.css',
    './dashboard.css',
    './log.css',
    './habits.css',
    './state.js',
    './log.js',
    './training.js',
    './ui.js',
    './rhys_logo.png',
    './dashboard.png',
    './diary.png',
    './history.png',
    './training.png'
];

// Install Service Worker and cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});