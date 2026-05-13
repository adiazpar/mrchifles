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
import { NameStep } from '@/components/auth/register-steps/NameStep'
import { EmailStep } from '@/components/auth/register-steps/EmailStep'
import { PasswordStep } from '@/components/auth/register-steps/PasswordStep'
import { VerifyStep } from '@/components/auth/register-steps/VerifyStep'
import { ProfileStep } from '@/components/auth/register-steps/ProfileStep'

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

// Toolbar driven by the active wizard step. Back chevron renders for
// steps 2 and 3 and walks one step back via the nav context.
function RegisterHeader() {
  const intl = useIntl()
  const { current, goTo } = useRegisterNav()
  const onBack =
    current === 'email'
      ? () => goTo('name')
      : current === 'password'
        ? () => goTo('email')
        : null

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
  return (
    <>
      {current === 'name' && <NameStep />}
      {current === 'email' && <EmailStep />}
      {current === 'password' && <PasswordStep />}
      {current === 'verify' && <VerifyStep />}
      {current === 'profile' && <ProfileStep />}
    </>
  )
}
