import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonIcon,
  IonContent,
} from '@ionic/react'
import { chevronBack } from 'ionicons/icons'
import { BrandMark } from '@/components/auth/BrandMark'
import {
  RegisterNavProvider,
  useRegisterNav,
} from '@/components/auth/register-steps/RegisterNavContext'
import { EmailStep } from '@/components/auth/register-steps/EmailStep'
import { VerifyStep } from '@/components/auth/register-steps/VerifyStep'
import { NameStep } from '@/components/auth/register-steps/NameStep'

/**
 * 3-step passwordless register wizard: email -> verify -> name.
 *
 * - email: collects the address and sends an OTP (sign-in mode, so
 *   first-time verify creates the user record server-side).
 * - verify: enters the 6-digit code, creates the session, and branches:
 *     - returning user => navigate to the hub.
 *     - new user => continue to the name step.
 * - name: captures the new user's display name and PATCHes it onto the
 *   user row, then routes to the hub.
 *
 * The wizard also accepts ?email=...&step=verify on mount — EntryPage
 * uses that contract to hand off after its own OTP send.
 */
export function RegisterPage() {
  return (
    <IonPage>
      <RegisterNavProvider>
        <RegisterHeader />
        <IonContent>
          <CurrentStep />
        </IonContent>
      </RegisterNavProvider>
    </IonPage>
  )
}

// Toolbar driven by the active wizard step. Back chevron only renders
// on the verify step (and walks back to email). The name step is
// terminal — the new user has a verified session by the time they land
// on it, so there's no meaningful "back" from there.
function RegisterHeader() {
  const intl = useIntl()
  const { current, goTo } = useRegisterNav()
  const onBack = current === 'verify' ? () => goTo('email') : null

  return (
    <IonHeader>
      <IonToolbar>
        {onBack ? (
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={onBack}
              aria-label={intl.formatMessage({ id: 'auth.register_wizard.back_aria' })}
            >
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
        ) : null}
        <IonTitle>
          <BrandMark />
        </IonTitle>
      </IonToolbar>
    </IonHeader>
  )
}

// Each step is a distinct component, so React unmounts the previous step
// and mounts the new one on every transition — the .auth-step-item
// children's fade-in keyframes fire on each fresh mount. Rendering a
// fragment (not a wrapping div) keeps .auth-container as the direct
// child of IonContent, preserving the min-height:100% chain that pins
// the footer to the bottom.
function CurrentStep() {
  const { current } = useRegisterNav()
  switch (current) {
    case 'email':
      return <EmailStep />
    case 'verify':
      return <VerifyStep />
    case 'name':
      return <NameStep />
  }
}
