const CACHE = 'tunaeye-v10-stable-offline'
const PREFIX = 'tunaeye-'
const APP_SHELL = [
  '/', '/manifest.webmanifest', '/tunaeye-logo.svg', '/tunaeye-192.png', '/tunaeye-512.png',
  '/fonts/OpenRunde-Regular.woff2', '/fonts/OpenRunde-Medium.woff2',
  '/fonts/OpenRunde-Semibold.woff2', '/fonts/OpenRunde-Bold.woff2',
  '/fonts/exact-ui.css', '/fonts/instrument-serif-regular.ttf', '/fonts/instrument-serif-italic.ttf',
  ...[300, 400, 500, 600, 700, 800, 900].map(weight => `/fonts/inter-${weight}.ttf`),
  ...['SASHIBOCORE', 'TAILCUT'].flatMap(sample => ['A', 'B', 'C'].map(grade => `/DEMO_SAMPLES/${sample}_${grade}.png`)),
  '/assets/sashiboCoreFull.png', '/assets/tailCutFull.png',
  '/assets/step 1.png', '/assets/step 2.png', '/assets/step 3.png'
]

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    // Cache one consistent production shell and its entry/preloaded bundles before activation.
    const response = await fetch('/', { cache: 'reload' })
    if (!response.ok) throw Error('The kiosk shell could not be cached.')
    const html = await response.clone().text()
    const bundles = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1])
    if (!bundles.some(path => path.startsWith('/assets/'))) throw Error('Offline caching requires a production build.')
    await cache.addAll([...APP_SHELL.filter(path => path !== '/'), ...bundles])
    await cache.put('/', response)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET' || request.cache === 'no-store') return
  const url = new URL(request.url)
  // Never cache inference, camera, local database, authentication, or cloud traffic.
  if (url.origin !== self.location.origin) return
  if (/^\/(?:status|snapshot|stream|grade)(?:\/|$)/.test(url.pathname) || url.pathname.startsWith('/local-api/')) return
  if (url.pathname.startsWith('/src/') || url.pathname.includes('/@') || url.pathname.includes('hot-update')) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE)
      try {
        const fresh = await fetch('/', { cache: 'no-store' })
        if (fresh.ok && fresh.headers.get('content-type')?.includes('text/html')) {
          await cache.put('/', fresh.clone())
          return fresh
        }
      } catch { /* Offline: fall back to cached shell. */ }
      return (await cache.match('/', { ignoreVary: true })) || fetch(request)
    })())
    return
  }
  if (!APP_SHELL.includes(url.pathname) && !/^\/(?:assets|fonts|new-ui)\//.test(url.pathname)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const cached = await cache.match(request, { ignoreVary: true })
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok && response.type !== 'opaque' && !response.headers.get('content-type')?.includes('text/html')) {
      await cache.put(request, response.clone())
    }
    // A missing font, script, image or API must never receive HTML pretending to be its response.
    return response
  })())
})
