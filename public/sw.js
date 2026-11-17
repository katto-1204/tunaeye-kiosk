const CACHE = 'tunaeye-v9-dial-admin-offline'
const IS_LOCAL_DEVELOPMENT = ['localhost', '127.0.0.1'].includes(self.location?.hostname ?? '')
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/tunaeye-logo.svg',
  '/tunaeye-192.png',
  '/tunaeye-512.png',
  '/assets/sashiboCoreFull.png',
  '/assets/tailCutFull.png',
  '/assets/step 1.png',
  '/assets/step 2.png',
  '/assets/step 3.png'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      await cache.addAll(APP_SHELL)
      const root = await cache.match('/')
      const html = await root.text()
      const bundles = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1])
      await cache.addAll(bundles)
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (event.request.cache === 'no-store') return
  const url = new URL(event.request.url)
  if (!['http:', 'https:'].includes(url.protocol)) return
  if (IS_LOCAL_DEVELOPMENT) {
    event.respondWith(fetch(event.request))
    return
  }
  if (['/status', '/snapshot', '/stream', '/grade'].includes(url.pathname)) return
  if (url.pathname.includes('/@vite/') || url.pathname.includes('/@react-refresh') || url.pathname.includes('hot-update')) return

  // Precached public assets must start immediately offline, including servers with Vary: Origin.
  if (url.origin === self.location.origin && /^\/(assets|fonts)\//.test(url.pathname)) {
    event.respondWith(caches.match(event.request, { ignoreVary: true }).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))) }
      return response
    })))
    return
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200 || response.type === 'opaque') {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request, { ignoreVary: url.origin === self.location.origin }).then(res => res || caches.match('/')))
  )
})
