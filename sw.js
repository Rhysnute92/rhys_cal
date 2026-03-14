const CACHE_NAME = 'fitness-pro-v3';

const STATIC_ASSETS = [
    './',
    './dashboard.html',
    './settings.html',
    './log.html',
    './training.html',

    './state.js',
    './dashboard.js',
    './settings.js',
    './pedometer.js',
    './auth-actions.js',
    './log.js',
    './training.js',
    './login.js',

    './shared.css',
    './dashboard.css',
    './training.css',
    './register.css',
    './log.css',

    './manifest.json',
    './rhys_logo.png',
    './rhys_favicon.png',
    './apple-touch-icon.png',
    './dashboard.png',
    './diary.png',
    './training.png'
];


// INSTALL
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map(url => 
                    cache.add(url).catch(err => console.error(`Failed to cache: ${url}`, err))
                )
            );
        })
    );
});


// ACTIVATE
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then(keys =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                )
            ),
            self.clients.claim()
        ])
    );
});


// FETCH (Safe Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {

    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Only cache same-origin requests
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request).then((response) => {
            if (response && response.status === 200) {
                const cloned = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, cloned);
                });
            }
            return response;
        }).catch(() => cachedResponse);

        // Return the cache immediately, or wait for network if cache is empty
        return cachedResponse || networkFetch;
    })
);
});