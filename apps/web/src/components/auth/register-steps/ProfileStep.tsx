import { useState, useCallback } from 'react'
import { IonButton, IonSpinner, useIonRouter } from '@ionic/react'
import { useIntl } from 'react-intl'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/contexts/auth-context'
import { PhoneInput } from '@/components/PhoneInput'
import './ProfileStep.css'

/**
 * Optional last step of the register wizard. Lets the freshly-verified
 * user add a phone number now, or skip. Either way, navigates to the
 * hub on completion. We never block the user here — the field is purely
 * profile metadata at this stage (used later for SMS sign-in if they
 * opt into it). The user has just completed email verification, so the
 * AuthContext already holds a verified session.
 */
export function ProfileStep() {
  const intl = useIntl()
  const router = useIonRouter()
  const { refreshUser } = useAuth()
  const [phone, setPhone] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const finish = useCallback(async (withPhone: boolean) => {
    setSubmitting(true)
    if (withPhone && phone) {
      try {
        await authClient.updateUser({ phoneNumber: phone })
        await refreshUser()
      } catch {
        // Best-effort. The user can add it later from /account.
      }
    }
    router.push('/', 'root', 'replace')
  }, [phone, refreshUser, router])

  return (
    <div className="register-profile">
      <h2 className="register-profile__title">
        {intl.formatMessage({ id: 'profile_phone_label' })}
      </h2>
      <PhoneInput value={phone} onChange={setPhone} />
      <div className="register-profile__actions">
        <IonButton expand="block" disabled={!phone || submitting} onClick={() => finish(true)}>
          {submitting ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'auth.continue_button' })}
        </IonButton>
        <IonButton expand="block" fill="clear" onClick={() => finish(false)} disabled={submitting}>
          {intl.formatMessage({ id: 'profile_add_later' })}
        </IonButton>
      </div>
    </div>
  )
}

export default ProfileStep
