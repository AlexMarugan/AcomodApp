const CACHE = 'rondas-v3-reflow';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icono-Rondas.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))));
