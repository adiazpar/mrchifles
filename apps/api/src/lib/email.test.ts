import { describe, expect, it, vi, beforeEach } from 'vitest'

const sendMock = vi.fn().mockResolvedValue({ data: { id: 'mock' }, error: null })

// vitest 4 requires class/function for new-callable mocks; arrow functions
// raise "is not a constructor". Use a plain function so the mock can be
// instantiated via `new Resend(...)` in lib/email.ts.
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: sendMock } }
  }),
}))

beforeEach(() => {
  sendMock.mockClear()
})

describe('email helpers', () => {
  it('sendVerificationEmail uses english subject for en-US user', async () => {
    const { sendVerificationEmail } = await import('./email')
    await sendVerificationEmail({ email: 'a@b.com', otp: '123456', language: 'en-US' })
    expect(sendMock).toHaveBeenCalledTimes(1)
    const call = sendMock.mock.calls[0][0]
    expect(call.to).toBe('a@b.com')
    expect(call.subject).toMatch(/verify/i)
  })

  it('sendVerificationEmail uses non-english subject for es user', async () => {
    const { sendVerificationEmail } = await import('./email')
    await sendVerificationEmail({ email: 'a@b.com', otp: '123456', language: 'es' })
    const call = sendMock.mock.calls[0][0]
    expect(call.subject).not.toMatch(/^Verify/i)
  })

  it('does not log the OTP value', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { sendVerificationEmail } = await import('./email')
    await sendVerificationEmail({ email: 'a@b.com', otp: 'SECRETCODE', language: 'en-US' })
    const all = [
      ...logSpy.mock.calls.flat(),
      ...warnSpy.mock.calls.flat(),
      ...errSpy.mock.calls.flat(),
    ].map(String).join('\n')
    expect(all).not.toContain('SECRETCODE')

    logSpy.mockRestore()
    warnSpy.mockRestore()
    errSpy.mockRestore()
  })

  it('sendResetPasswordEmail forwards email + url + locale', async () => {
    const { sendResetPasswordEmail } = await import('./email')
    await sendResetPasswordEmail({
      email: 'b@c.com',
      url: 'https://kasero.app/reset-password?token=abc',
      language: 'en-US',
    })
    expect(sendMock).toHaveBeenCalledTimes(1)
    const call = sendMock.mock.calls[0][0]
    expect(call.to).toBe('b@c.com')
    expect(call.subject).toMatch(/reset/i)
  })
})
