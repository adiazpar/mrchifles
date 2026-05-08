import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'https://localhost:8000'
  const webPort = Number(env.VITE_WEB_PORT) || 3000

  // Optionally serve over HTTPS for mobile testing if Tailscale certs exist.
  const certKey = path.resolve(__dirname, '../api/certificates/tailscale-dev.key')
  const certCrt = path.resolve(__dirname, '../api/certificates/tailscale-dev.crt')
  const httpsConfig =
    fs.existsSync(certKey) && fs.existsSync(certCrt)
      ? { key: fs.readFileSync(certKey), cert: fs.readFileSync(certCrt) }
      : undefined

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Custom Workbox SW source lives at src/pwa/sw.ts. The plugin
        // compiles it during `vite build`, injects the precache manifest
        // (`__WB_MANIFEST`), and emits `dist/sw.js`. The SW explicitly
        // bypasses `/api/*` (NetworkOnly) so authenticated/rate-limited
        // requests never see the cache.
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src/pwa',
        filename: 'sw.ts',
        // We register the SW manually in main.tsx via `virtual:pwa-register`,
        // so the plugin shouldn't auto-inject a registration script.
        injectRegister: false,
        // Use the existing `public/manifest.json` directly. Setting
        // `manifest: false` tells the plugin not to generate or rewrite it.
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          // Splash images are large (some are ~700KB). Bump the per-file
          // cap to 5 MB so they make it into the precache manifest.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        // Disable SW in dev — it conflicts with HMR and Vite's dev server
        // already serves modules without caching.
        devOptions: { enabled: false },
      }),
    ],
    server: {
      port: webPort,
      host: true,
      https: httpsConfig,
      // Vite's HMR WebSocket upgrade enforces a Host allowlist that is
      // stricter than the one applied to regular HTTP requests; without
      // explicit entries, upgrades from LAN/Tailscale hostnames get
      // rejected with 400 even though page loads succeed.
      allowedHosts: ['localhost', '.ts.net'],
      hmr: {
        clientPort: webPort,
        protocol: httpsConfig ? 'wss' : 'ws',
      },
      proxy: {
        '/api': {
          target: apiTarget,
          // Do NOT set `changeOrigin: true`. With it on, http-proxy
          // rewrites the Host header to match the target ("localhost:8000")
          // before forwarding. The API server's `request.url` is then
          // built from "localhost:8000", but the Origin header (preserved
          // by the proxy) still says "<tailscale-host>:3000". The CSRF
          // middleware (apps/api/src/lib/api-middleware.ts → enforceSameOrigin)
          // compares `URL(request.url).origin` against the Origin header
          // and rejects the mismatch with FORBIDDEN. Login/register/invite
          // routes are bare `export async function POST` (no wrapper), so
          // they bypass the check — but every withAuth/withBusinessAuth
          // POST (sales sessions, products, providers, orders, etc.)
          // breaks on Tailscale device testing.
          //
          // Keeping the original Host header lets the API server see the
          // real Tailscale hostname, which matches the Origin, and the
          // CSRF check passes. SSL verification is disabled below so the
          // Vite-cert-vs-Tailscale-cert mismatch on the inner connection
          // doesn't matter.
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
    },
  }
})
