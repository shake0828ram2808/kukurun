const CACHE = 'kukurun-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/kukurun.js',
  '/medals.js',
  '/questions.js',
  '/sprites.js',
  '/kana.json',
  '/kana_hoka.json',
  '/messages.json',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // HTML はネットワーク優先（常に最新版を取得、オフライン時はキャッシュ）
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // 静的アセットはキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
