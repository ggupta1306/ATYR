const CACHE_NAME = 'atyr-pwa-v1';
const urlsToCache = [
    '/',
    '/atyr-pwa.html',
    '/style-quiz.html',
    '/moodboard.html',
    '/manifest.json',
    // Add your image URLs here
    'backend/uploads/Adobe Express - file (1).png',
    'backend/uploads/Remove background project (1).png',
    'backend/uploads/Remove background project (2).png',
    'backend/uploads/Remove background project (3).png',
    'backend/uploads/Remove background project (4).png',
    'backend/uploads/Remove background project (5).png',
    'backend/uploads/Remove background project (6).png',
    'backend/uploads/Remove background project (7).png',
    'backend/uploads/Remove background project (8).png',
    'backend/uploads/Remove background project (9).png',
    'backend/uploads/Remove background project (10).png',
    'backend/uploads/Remove background project (11).png',
    'backend/uploads/Remove background project (12).png',
    'backend/uploads/Remove background project (13).png',
    'backend/uploads/Remove background project (14).png',
    'backend/uploads/Remove background project.png'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});

// Activate event
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
        })
    );
});
