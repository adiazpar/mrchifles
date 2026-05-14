import { describe, it, expect } from 'vitest'
import { auth } from './auth'

describe('better-auth config', () => {
  it('has email-otp plugin loaded', () => {
    const opts = (auth as any).options
    const hasEmailOtp = (opts.plugins ?? []).some((p: any) => p.id === 'email-otp' || p.id === 'emailOTP')
    expect(hasEmailOtp).toBe(true)
  })

  it('does NOT have twoFactor plugin loaded', () => {
    const opts = (auth as any).options
    const hasTwoFactor = (opts.plugins ?? []).some((p: any) => p.id === 'two-factor' || p.id === 'twoFactor')
    expect(hasTwoFactor).toBe(false)
  })

  it('does NOT have emailAndPassword enabled', () => {
    const opts = (auth as any).options
    expect(opts.emailAndPassword?.enabled).toBeFalsy()
  })

  it('keeps Google in trustedProviders for account linking', () => {
    const opts = (auth as any).options
    expect(opts.account?.accountLinking?.trustedProviders).toContain('google')
  })

  it('keeps the cross-account verify-email defense hook', () => {
    const opts = (auth as any).options
    expect(typeof opts.hooks?.before).toBe('function')
  })
})
