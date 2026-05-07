/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, Route } from 'workbox-routing'
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// Precache the SPA shell + assets injected by vite-plugin-pwa at build time.
// `__WB_MANIFEST` is replaced by the plugin with the actual asset list during
// `vite build` (injectManifest mode).
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// CRITICAL: never cache `/api/*` — the API must always hit network so writes,
// authenticated reads, and rate-limit headers are never served stale. This
// route is registered FIRST so it wins over the navigation handler below.
registerRoute(
  new Route(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkOnly(),
  ),
)

// SPA navigation fallback: deep URLs (e.g. `/<businessId>/products`) serve the
// precached `index.html` so React Router can resolve client-side. The denylist
// keeps `/api/*` out of this handler as a defense-in-depth measure.
registerRoute(
  new NavigationRoute(
    async () => {
      const cached = await caches.match('/index.html')
      if (cached) return cached
      return fetch('/index.html')
    },
    { denylist: [/^\/api\//] },
  ),
)

// Image caching for product/business icons + static logos. Cache-first because
// product icons are content-addressed (`?v=<timestamp>` cache buster on
// upload), so a cache hit is always correct.
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
)

// Static assets that fall outside the precache (e.g. dynamically-imported
// chunks loaded after a deploy). Stale-while-revalidate keeps the UI snappy
// while quietly fetching the latest version in the background.
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'static-resources' }),
)

self.addEventListener('install', () => {
  void self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
