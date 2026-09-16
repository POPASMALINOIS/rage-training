const CACHE_NAME = 'rage-training-v2.4.58';
const APP_SHELL = [
  './', './index.html', './manifest.json?v=2.4.58', './rage-logo.png?v=2.4.58',
  './app.js?v=2.4.4', './persistencia-v2.4.58.js?v=2.4.58',
  './styles.css?v=2.3.0', './modern-v2.4.css?v=2.4.1', './responsive-v2.4.2.css?v=2.4.5',
  './ajustes-v2.4.7.css?v=2.4.8', './clientes-seguimiento-v2.4.9.css?v=2.4.9',
  './cliente-detalle-v2.4.10.css?v=2.4.10', './mediciones-extra-v2.4.11.css?v=2.4.11',
  './clientes-mobile-v2.4.12.css?v=2.4.12', './pagos-mobile-v2.4.14.css?v=2.4.14',
  './modal-fix-v2.4.15.css?v=2.4.15', './agenda-integrada-v2.4.16.css?v=2.4.16',
  './agenda-mobile-v2.4.17.css?v=2.4.18', './cliente-sesion-v2.4.19.css?v=2.4.19',
  './alta-mobile-v2.4.20.css?v=2.4.20', './splash-v2.4.25.css?v=2.4.57',
  './facturas-v2.4.29.css?v=2.4.31', './cliente-gestion-v2.4.39.css?v=2.4.39',
  './mesociclo-ejercicios-v2.4.40.css?v=2.4.40', './mesociclo-plan-editor-v2.4.43.css?v=2.4.43',
  './calendar-zoom-v2.4.44.css?v=2.4.44', './operativa-v2.4.46.css?v=2.4.46',
  './recurrencias-v2.4.47.css?v=2.4.57', './recurrencias-fix-v2.4.48.css?v=2.4.57',
  './parejas-v2.4.53.css?v=2.4.57', './tarifas-v2.4.55.css?v=2.4.57',
  './ajustes-v2.4.7.js?v=2.4.8', './clientes-seguimiento-v2.4.9.js?v=2.4.9',
  './cliente-detalle-v2.4.10.js?v=2.4.10', './mediciones-extra-v2.4.11.js?v=2.4.11',
  './agenda-integrada-v2.4.16.js?v=2.4.16', './cliente-sesion-v2.4.19.js?v=2.4.22',
  './alta-integrada-v2.4.23.js?v=2.4.24', './navegacion-v2.4.24.js?v=2.4.24',
  './facturas-v2.4.29.js?v=2.4.31', './facturas-print-v2.4.32.js?v=2.4.33',
  './facturas-pdf-v2.4.33.js?v=2.4.35', './fixes-v2.4.36.js?v=2.4.57',
  './cliente-gestion-v2.4.39.js?v=2.4.39', './mesociclo-ejercicios-v2.4.40.js?v=2.4.40',
  './tablet-android-v2.4.41.js?v=2.4.43', './mesociclo-plan-editor-v2.4.43.js?v=2.4.43',
  './calendar-zoom-v2.4.44.js?v=2.4.44', './operativa-v2.4.46.js?v=2.4.46',
  './parejas-v2.4.53.js?v=2.4.57', './tarifas-v2.4.55.js?v=2.4.57',
  './recurrencias-loader-v2.4.47.js?v=2.4.57', './recurrencias-v2.4.47.js?v=2.4.57',
  './recurrencias-save-v2.4.51.js?v=2.4.57', './calendar-client-open-v2.4.52.js?v=2.4.57',
  './splash-v2.4.25.js?v=2.4.58'
];
self.addEventListener('install', event => {
  // A partial download must not replace a complete offline installation.
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, {cache:'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('rage-training-v') && key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(request, {cache:'no-store', signal:controller.signal});
      if (response.ok) { const copy = response.clone(); event.waitUntil(cache.put(request, copy).catch(() => {})); }
      return response;
    } catch (_) {
      const cached = await cache.match(request, {ignoreSearch:true});
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const index = await cache.match('./index.html');
        if (index) return index;
      }
      return Response.error();
    } finally { clearTimeout(timer); }
  })());
});
