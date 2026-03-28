// Gipfel Lodge Admin - Service Worker
const CACHE_NAME = 'gipfel-admin-v2';

// Bestanden die gecached moeten worden voor de app-shell
const SHELL_FILES = [
    './admin.html',
    './css/base/style.css',
    './site_manifest/favicon_admin/web-app-manifest-192x192.png',
    './site_manifest/favicon_admin/web-app-manifest-512x512.png',
    './site_manifest/favicon_admin/apple-touch-icon.png',
    './site_manifest/favicon_admin/favicon.svg'
];

// Install: cache de app-shell bestanden
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
    );
    self.skipWaiting();
});

// Activate: ruim oude caches op
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: network-first strategie
// Probeer altijd eerst het netwerk (data moet vers zijn voor Firebase),
// val terug op cache als offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Sla een kopie op in de cache voor offline gebruik
                if (response.ok && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Offline: probeer uit cache te laden
                return caches.match(event.request);
            })
    );
});
