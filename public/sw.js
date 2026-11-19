/* Service worker Origami (PWA).
   - Shell aplikasi (HTML, JS, CSS, ikon) di-precache saat build (daftar disuntik oleh vite.config.ts).
   - Tile peta (Esri) TIDAK disimpan: selalu dari jaringan.
   - Font Google disimpan dengan stale-while-revalidate. */
const PRECACHE = /*PRECACHE*/ [];
const VERSION = /*VERSION*/ 'dev';
const SHELL_CACHE = `origami-shell-${VERSION}`;
const RUNTIME_CACHE = 'origami-runtime-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE.map((path) =>
            cache.add(new Request(new URL(path, self.registration.scope).href, { cache: 'reload' }))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('origami-shell-') && k !== SHELL_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Peta dan layanan lain: langsung ke jaringan.
  if (url.origin !== self.location.origin && !FONT_HOSTS.includes(url.hostname)) return;

  // Font Google: stale-while-revalidate.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(req, { ignoreVary: true });
        const network = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Navigasi halaman: jaringan dulu, cadangan dari cache saat offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(new URL('index.html', self.registration.scope).href, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(new URL('index.html', self.registration.scope).href, { ignoreVary: true })
            .then((r) => r || caches.match(new URL('./', self.registration.scope).href, { ignoreVary: true }))
        )
    );
    return;
  }

  // Aset statis same-origin (bernama hash): cache dulu, lalu jaringan.
  event.respondWith(
    // ignoreVary: server mengirim "Vary: Origin", sedangkan skrip modul membawa header Origin saat dimuat.
    caches.match(req, { ignoreVary: true }).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
