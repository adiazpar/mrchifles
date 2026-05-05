import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` throws at import time when bundled into a
      // non-server context — that's the Next.js boundary it
      // enforces. Vitest doesn't run in a Next request context, so
      // any module that does `import 'server-only'` (e.g. our
      // simple-auth, business-auth, db, storage) would crash the
      // test runner. Aliasing it to an empty stub preserves the
      // production-time check without breaking unit tests.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
