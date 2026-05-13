import { IonPage, IonContent } from '@ionic/react'
import {
  RegisterNavProvider,
  useRegisterNav,
} from '@/components/auth/register-steps/RegisterNavContext'
import { NameStep } from '@/components/auth/register-steps/NameStep'
import { EmailStep } from '@/components/auth/register-steps/EmailStep'
import { PasswordStep } from '@/components/auth/register-steps/PasswordStep'

export function RegisterPage() {
  return (
    <IonPage>
      <IonContent>
        <RegisterNavProvider>
          <CurrentStep />
        </RegisterNavProvider>
      </IonContent>
    </IonPage>
  )
}

// Wrapper is keyed on the active step so React unmounts the previous
// subtree and remounts the new one — the .auth-step-item children's
// fade-in keyframes fire on each fresh mount.
function CurrentStep() {
  const { current } = useRegisterNav()
  return (
    <div key={current}>
      {current === 'name' && <NameStep />}
      {current === 'email' && <EmailStep />}
      {current === 'password' && <PasswordStep />}
    </div>
  )
}
