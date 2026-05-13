import { useState, useEffect, useCallback } from 'react'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/contexts/auth-context'

const RESEND_COOLDOWN_SECONDS = 30

type VerifyErrorKey =
  | 'verify_error_generic'
  | 'verify_error_invalid_otp'
  | 'verify_error_expired_otp'
  | 'verify_error_too_many_attempts'
  | 'verify_error_resend'

export interface UseVerifyEmailResult {
  code: string
  setCode: (v: string) => void
  /** Submit the entered code; returns true on success (user.emailVerified flips). */
  submit: (value: string) => Promise<boolean>
  /** Request a fresh OTP. Throttled to once per RESEND_COOLDOWN_SECONDS. */
  resend: () => Promise<void>
  /** Seconds remaining until the next resend is allowed (0 == ready). */
  cooldown: number
  /** i18n key for the active error, or null. */
  error: VerifyErrorKey | null
  /** True while a verify call is in flight. */
  submitting: boolean
  /** The email the OTP was sent to, or null when no signed-in user. */
  email: string | null
}

function mapErrorCode(code: string | undefined): VerifyErrorKey {
  if (code === 'INVALID_OTP' || code === 'INVALID_VERIFICATION_CODE') return 'verify_error_invalid_otp'
  if (code === 'EXPIRED_OTP' || code === 'EXPIRED_VERIFICATION_CODE') return 'verify_error_expired_otp'
  if (code === 'TOO_MANY_ATTEMPTS' || code === 'RATE_LIMIT_EXCEEDED') return 'verify_error_too_many_attempts'
  return 'verify_error_generic'
}

export function useVerifyEmail(): UseVerifyEmailResult {
  const { user, refreshUser } = useAuth()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<VerifyErrorKey | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  const submit = useCallback(
    async (value: string): Promise<boolean> => {
      if (!user) return false
      setSubmitting(true)
      setError(null)
      try {
        const result = await authClient.emailOtp.verifyEmail({ email: user.email, otp: value })
        if (result.error) {
          setError(mapErrorCode(result.error.code))
          setCode('')
          return false
        }
        // verifyEmail flips emailVerified on the server; pull the new
        // session into the context so the gate releases.
        await refreshUser()
        return true
      } catch {
        setError('verify_error_generic')
        setCode('')
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [user, refreshUser],
  )

  const resend = useCallback(async () => {
    if (!user || cooldown > 0) return
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setError(null)
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: user.email,
        type: 'email-verification',
      })
    } catch {
      setError('verify_error_resend')
      // Don't reset cooldown — re-trying immediately would just hit the
      // server-side rate limit again. Wait the full window.
    }
  }, [user, cooldown])

  return {
    code,
    setCode,
    submit,
    resend,
    cooldown,
    error,
    submitting,
    email: user?.email ?? null,
  }
}
