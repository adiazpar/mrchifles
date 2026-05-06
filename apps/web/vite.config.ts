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
        // Phase 4.2 will replace this with a custom Workbox SW. For now,
        // disable PWA generation entirely so Phase 3.1 boots cleanly.
        disable: true,
      }),
    ],
    server: {
      port: webPort,
      https: httpsConfig,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
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
