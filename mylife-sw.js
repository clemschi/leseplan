/* Erzeugt aus build.js - nicht von Hand bearbeiten. */
const FASSUNG = 'a4de6ac7b744';
const SPEICHER = 'mylife-' + FASSUNG;
const DATEIEN = ['./', './index.html', './mylife.html', './mylife.webmanifest', './puzzle.html'];
/* Die Schriften liegen woanders; sie kommen erst beim ersten Abruf dazu. */
const FREMD = ['https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SPEICHER)
    .then(c => Promise.allSettled(DATEIEN.map(d => c.add(d))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => n !== SPEICHER).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

/* Erst aus dem Speicher, dann im Hintergrund nachsehen: die Seite ist sofort
   da, und der naechste Start hat den neuen Stand. Ohne Netz bleibt es beim
   Gespeicherten. */
self.addEventListener('fetch', e => {
  const u = e.request.url;
  if (e.request.method !== 'GET') return;
  const eigen = u.startsWith(self.registration.scope);
  const fremd = FREMD.some(f => u.startsWith(f));
  if (!eigen && !fremd) return;
  e.respondWith(caches.open(SPEICHER).then(c => c.match(e.request).then(hit => {
    const netz = fetch(e.request).then(a => {
      if (a && (a.ok || a.type === 'opaque')) c.put(e.request, a.clone());
      return a;
    }).catch(() => hit);
    return hit || netz;
  })));
});
