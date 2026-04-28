/// <reference lib="webworker" />
/// <reference types="@serwist/next/typings" />

import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Per the spec at .claude/docs/plans/2026-04-27-pwa-navigation-perf-design.md
// section 3.2:
// - All non-NetworkOnly strategies match GET only.
// - HTML routes: NetworkFirst with 3s timeout, cache fallback.
// - GET /api/businesses/[businessId]/**: NetworkFirst with cache fallback (offline read).
// - GET /api/auth/* and lifecycle routes: NetworkOnly.
// - All POST/PATCH/DELETE: NetworkOnly (and not even matched here — Serwist
//   only intercepts GETs by default; mutations pass through to the network).
const isGet = (req: Request) => req.method === 'GET'

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Auth, AI, invite, transfer — never cache (state-sensitive).
    {
      matcher: ({ url, request }) =>
        isGet(request) &&
        (url.pathname.startsWith('/api/auth/') ||
          url.pathname.startsWith('/api/ai/') ||
          url.pathname.startsWith('/api/invite/') ||
          url.pathname.startsWith('/api/transfer/')),
      handler: new NetworkOnly(),
    },

    // Business-scoped GETs: drives offline-read of products, providers,
    // orders, categories, etc. Short network timeout — fall back to cache
    // quickly on flaky connections.
    {
      matcher: ({ url, request }) =>
        isGet(request) && url.pathname.startsWith('/api/businesses/'),
      handler: new NetworkFirst({
        cacheName: 'api-business',
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          }),
        ],
      }),
    },

    // Static asset routes Next.js emits.
    ...defaultCache.map((entry) => ({
      ...entry,
      // defaultCache already has sane GET-only filters and strategies for
      // /_next/static, /_next/image, fonts, etc. We pass through unchanged.
    })),

    // App Router HTML pages: NetworkFirst with cache fallback so the app
    // is browsable offline. Anything else not matched above falls into
    // this bucket.
    {
      matcher: ({ request }) => isGet(request) && request.destination === 'document',
      handler: new NetworkFirst({
        cacheName: 'app-pages',
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          }),
        ],
      }),
    },
  ],
  // Optional: a static offline page if a navigation can't be served from
  // any cache. Skipped for now — cached pages cover the realistic offline
  // case, and the OfflineBadge tells the user what's happening.
})

serwist.addEventListeners()
