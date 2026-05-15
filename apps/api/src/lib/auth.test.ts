import { describe, it, expect } from 'vitest'
import { auth } from './auth'

const opts = (auth as unknown as {
  options: {
    plugins?: Array<{ id: string }>
    emailAndPassword?: { enabled?: boolean }
    account?: { accountLinking?: { trustedProviders?: string[] } }
    hooks?: { before?: unknown }
    session?: { freshAge?: number }
    rateLimit?: { storage?: string; enabled?: boolean }
    secondaryStorage?: { get: unknown; set: unknown; delete: unknown }
  }
}).options

describe('better-auth config', () => {
  it('exposes the options object (sanity)', () => {
    expect(opts).toBeDefined()
    expect(Array.isArray(opts.plugins)).toBe(true)
  })

  it('has email-otp plugin loaded', () => {
    // better-auth emits kebab-case plugin ids; see
    // node_modules/better-auth/dist/plugins/email-otp/index.mjs (id: 'email-otp')
    expect(opts.plugins?.some((p) => p.id === 'email-otp')).toBe(true)
  })

  it('does NOT have twoFactor plugin loaded', () => {
    // better-auth emits kebab-case plugin ids; see
    // node_modules/better-auth/dist/plugins/two-factor/index.mjs (id: 'two-factor')
    expect(opts.plugins?.some((p) => p.id === 'two-factor')).toBe(false)
  })

  it('does NOT have emailAndPassword enabled', () => {
    expect(opts.emailAndPassword?.enabled).toBeFalsy()
  })

  it('keeps Google in trustedProviders for account linking', () => {
    expect(opts.account?.accountLinking?.trustedProviders).toContain('google')
  })

  it('registers a before hook for cross-account defense', () => {
    // Shape-only check: confirms a before-hook function is registered.
    // The actual rejection behavior (cross-account session check) is
    // exercised end-to-end by Task D2's passwordless E2E specs.
    expect(typeof opts.hooks?.before).toBe('function')
  })

  it('disables better-auth freshAge gate so OTP step-up is the sole freshness proof', () => {
    expect(opts.session?.freshAge).toBe(0)
  })

  it('routes rate-limit counters through secondary storage (not the SQL database)', () => {
    // Counters live in Upstash Redis with TTL-based expiry; the legacy
    // `rate_limit` Turso table was dropped in migration
    // 2026-05-15-01-drop-rate-limit-table.sql.
    expect(opts.rateLimit?.storage).toBe('secondary-storage')
    expect(opts.rateLimit?.enabled).toBe(true)
  })

  it('wires secondaryStorage when Upstash creds are present', () => {
    // In CI / dev without UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
    // the adapter is intentionally undefined and better-auth falls back to
    // an in-memory limiter (acceptable for local dev). When the env vars
    // ARE present we expect the 3-method adapter to be wired up.
    const hasUpstash =
      !!process.env.UPSTASH_REDIS_REST_URL &&
      !!process.env.UPSTASH_REDIS_REST_TOKEN
    if (hasUpstash) {
      expect(opts.secondaryStorage).toBeDefined()
      expect(typeof opts.secondaryStorage?.get).toBe('function')
      expect(typeof opts.secondaryStorage?.set).toBe('function')
      expect(typeof opts.secondaryStorage?.delete).toBe('function')
    } else {
      expect(opts.secondaryStorage).toBeUndefined()
    }
  })
})
