/* eslint-disable no-restricted-globals */

// Define a cache name
const CACHE_NAME = 'coffee-finder-cache-v1';

// List of URLs to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
  '/favicon.ico',
  '/static/js/bundle.js',
  '/static/css/main.css',
  // Add other assets you want to cache
];

console.log('Caching URLs:', urlsToCache);

// Install the service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((error) => {
        console.error('Failed to cache:', error);
      });
    })
  );
});

// Fetch the resources
self.addEventListener('fetch', (event) => {
  // Check if the request is from the same origin
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return the response from the cached version
        if (response) {
          return response;
        }
        // Fall back to network request
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone the response so we can cache it
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            // Only cache requests that are not from chrome-extension
            if (!event.request.url.startsWith('chrome-extension://')) {
              cache.put(event.request, responseToCache);
            }
          });

          return networkResponse;
        });
      })
    );
  } else {
    // If the request is not from the same origin, just fetch it
    event.respondWith(fetch(event.request));
  }
});

// Activate the service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
/* eslint-enable no-restricted-globals */ 