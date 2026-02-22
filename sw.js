const CACHE_NAME = 'fitness-pro-v2'; // Incrementing version to v2 for the new files
const ASSETS_TO_CACHE = [
    // Core HTML
    '/',
    './index.html',
    './settings.html',
    './log.html',
    './training.html',
    
    // Logic & State
    './state.js',
    './index.js',
    './settings.js',
    './pedometer.js', 
    
    // Styles
    './shared.css',
    './dashboard.css',
    
    // Assets & Config
    './manifest.json',
    './rhys_logo.png',
    './rhys_favicon.png',
    './apple-touch-icon.png',
    './dashboard.png',
    './diary.png',
    './training.png',
    
    // External CDN (Charts)
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
];

// 1. Install Event: Populate the cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Caching All Pro Assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Activate Event: Clean up old versions
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// 3. Fetch Event: Stale-While-Revalidate Strategy
// This is the "Pro" way: Serve from cache immediately, but update in background
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchedResponse = fetch(event.request).then((networkResponse) => {
                // Update the cache with the new version from network
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            });

            return cachedResponse || fetchedResponse;
        })
    );
});