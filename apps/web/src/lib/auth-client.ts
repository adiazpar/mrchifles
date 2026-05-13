import { createAuthClient } from 'better-auth/react'
import { emailOTPClient, twoFactorClient } from 'better-auth/client/plugins'

// Same-origin in production (the SPA shell is served by the API). In dev,
// Vite proxies /api/* to the API server, so the empty baseURL still works.
// VITE_AUTH_BASE_URL is only needed when the SPA needs to call a different
// origin (e.g. a previewing developer pointing the web build at a remote API).
const baseURL = import.meta.env.VITE_AUTH_BASE_URL ?? ''

// Type annotation: TS2742 — without an explicit type the inferred shape
// references an internal `path-to-object` file inside better-auth/dist,
// which isn't portable across `.d.ts` emit. `ReturnType` of the factory
// gives a self-contained type that downstream callers can use via
// `typeof authClient` once the symbol is imported.
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL,
  plugins: [emailOTPClient(), twoFactorClient()],
})
