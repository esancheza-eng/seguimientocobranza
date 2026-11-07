/* Cobranza Zona Milagro · funcionamiento sin internet
   - La página (index.html) se busca primero en internet; si no hay señal, se abre la copia guardada.
   - Librerías (Excel, gráficos, Firebase, fuentes) e íconos: se usan desde la copia guardada.
   - Los datos (Firebase) no pasan por aquí: Firebase guarda su propia copia y envía los registros al reconectar. */
const CACHE = 'czm-v1';
const BASE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u =>
    c.add(new Request(u, u.startsWith('http') ? { mode: 'no-cors' } : {})).catch(() => null)
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const esDatos = u => /firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|googleapis\.com\/google\.firestore/.test(u);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || esDatos(req.url)) return;            // datos: los maneja Firebase
  const url = new URL(req.url);
  const esPagina = req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));
  if (esPagina) {                                                   // página: internet primero, copia si no hay señal
    e.respondWith(fetch(req).then(r => {
      const copia = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); return r;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {   // resto: copia primero
    if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return r;
  }).catch(() => hit)));
});
