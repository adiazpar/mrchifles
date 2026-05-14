import { describe, it, expect } from 'vitest'
import { auth } from './auth'

const opts = (auth as unknown as {
  options: {
    plugins?: Array<{ id: string }>
    emailAndPassword?: { enabled?: boolean }
    account?: { accountLinking?: { trustedProviders?: string[] } }
    hooks?: { before?: unknown }
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
})
