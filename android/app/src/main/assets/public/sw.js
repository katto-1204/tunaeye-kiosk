const CACHE = 'tunaeye-v5-pi-hosting'
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
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
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
  const url = new URL(event.request.url)
  if (!['http:', 'https:'].includes(url.protocol)) return
  if (['/status', '/snapshot', '/stream', '/grade'].includes(url.pathname)) return
  if (url.pathname.includes('/@vite/') || url.pathname.includes('/@react-refresh') || url.pathname.includes('hot-update')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request).then(res => res || caches.match('/')))
  )
})
