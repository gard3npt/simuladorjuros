/* Service worker do Simulador de Juros.
   Atualiza sozinho: basta substituir o index.html no site (não é preciso mexer neste ficheiro). */
const CACHE_VERSION = 'v8';
const CACHE_NAME = 'simulador-juros-' + CACHE_VERSION;
const PRECACHE = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
    './icons/favicon-32.png',
    './icons/favicon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            /* Um ficheiro em falta não deve impedir a instalação do service worker */
            .then((cache) => Promise.all(PRECACHE.map((f) => cache.add(f).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k.startsWith('simulador-juros-') && k !== CACHE_NAME)
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    /* Só trata pedidos do próprio site: AdSense e outros domínios seguem direto para a rede */
    if (url.origin !== self.location.origin) return;

    /* Páginas: tenta a rede primeiro (para ver sempre a versão mais recente) e usa a cache sem ligação */
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req.url, { cache: 'no-cache' })
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy));
                    }
                    return res;
                })
                .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
        );
        return;
    }

    /* Restantes ficheiros: responde da cache e atualiza em segundo plano */
    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req.url, { cache: 'no-cache' })
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
