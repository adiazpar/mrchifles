import { useState, useEffect, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { IonButton } from '@ionic/react'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/contexts/auth-context'
import { OTPInput } from '@/components/OTPInput'
import { useRegisterNav } from './RegisterNavContext'
import './VerifyStep.css'

const RESEND_COOLDOWN_SECONDS = 30

type VerifyErrorKey =
  | 'verify_error_generic'
  | 'verify_error_invalid_otp'
  | 'verify_error_expired_otp'
  | 'verify_error_too_many_attempts'
  | 'verify_error_resend'

function mapErrorCode(code: string | undefined): VerifyErrorKey {
  if (code === 'INVALID_OTP' || code === 'INVALID_VERIFICATION_CODE') return 'verify_error_invalid_otp'
  if (code === 'EXPIRED_OTP' || code === 'EXPIRED_VERIFICATION_CODE') return 'verify_error_expired_otp'
  if (code === 'TOO_MANY_ATTEMPTS' || code === 'RATE_LIMIT_EXCEEDED') return 'verify_error_too_many_attempts'
  return 'verify_error_generic'
}

/**
 * Last step of the register wizard. Mounts after the password step has
 * called auth-context `register()` (which posts to /api/auth/sign-up/email).
 * The server sends the OTP via the emailOTP plugin, and this step lets the
 * user enter it. On success, refreshUser() pulls the now-verified session
 * into context and the wizard navigates to the hub.
 *
 * Reads the email from RegisterNavContext rather than useAuth().user
 * because better-auth's signup-without-session mode (when requireEmail
 * Verification + autoSignIn=false) leaves user null until verify lands.
 */
export function VerifyStep() {
  const intl = useIntl()
  const { email, goTo } = useRegisterNav()
  const { refreshUser } = useAuth()

  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<VerifyErrorKey | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  const handleComplete = useCallback(async (value: string) => {
    if (!email) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await authClient.emailOtp.verifyEmail({ email, otp: value })
      if (result.error) {
        setError(mapErrorCode(result.error.code))
        setCode('')
        return
      }
      // Session may or may not have existed before — verifyEmail creates
      // one if the signup was deferred. refreshUser pulls the freshly-
      // minted session into context.
      await refreshUser()
      goTo('profile')
    } catch {
      setError('verify_error_generic')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }, [email, refreshUser, goTo])

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setError(null)
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
    } catch {
      setError('verify_error_resend')
    }
  }, [email, cooldown])

  if (!email) {
    // Defensive — shouldn't reach this step without a wizard email.
    return null
  }

  return (
    <div className="register-verify">
      <h2 className="register-verify__title">
        {intl.formatMessage({ id: 'verify_email_title' })}
      </h2>
      <p className="register-verify__instruction">
        {intl.formatMessage({ id: 'verify_email_instruction' }, { email })}
      </p>
      <OTPInput
        value={code}
        onChange={setCode}
        onComplete={handleComplete}
        disabled={submitting}
        error={!!error}
      />
      {error && (
        <p role="alert" className="register-verify__error">
          {intl.formatMessage({ id: error })}
        </p>
      )}
      <IonButton
        fill="clear"
        disabled={cooldown > 0 || submitting}
        onClick={handleResend}
        className="register-verify__resend"
      >
        {cooldown > 0
          ? intl.formatMessage({ id: 'verify_email_resend_cooldown' }, { seconds: cooldown })
          : intl.formatMessage({ id: 'verify_email_resend' })}
      </IonButton>
    </div>
  )
}

export default VerifyStep
