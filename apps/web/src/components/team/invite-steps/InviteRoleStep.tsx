import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonSpinner,
} from '@ionic/react'
import { DurationPicker } from '../DurationPicker'
import { RoleSelectionContent } from '../RoleSelectionContent'
import { useInviteNavRef, useInviteCallbacks } from './InviteNavContext'
import { InviteCodeStep } from './InviteCodeStep'
import { InvitePartnerWarningStep } from './InvitePartnerWarningStep'

export function InviteRoleStep() {
  const t = useIntl()
  const navRef = useInviteNavRef()
  const {
    onClose,
    selectedRole,
    setSelectedRole,
    selectedDuration,
    setSelectedDuration,
    newCode,
    isGenerating,
    onGenerateCode,
  } = useInviteCallbacks()

  const handleNext = async () => {
    if (selectedRole === 'partner') {
      navRef.current?.push(() => <InvitePartnerWarningStep />)
    } else {
      await onGenerateCode()
      navRef.current?.push(() => <InviteCodeStep />)
    }
  }

  // If there's already a code (opened from existing code), skip straight to code view
  if (newCode) {
    // This branch is handled by InviteModal choosing InviteCodeStep as root
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t.formatMessage({ id: 'team.step_add_member' })}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t.formatMessage({ id: 'common.cancel' })}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <DurationPicker
          selected={selectedDuration}
          onSelect={setSelectedDuration}
        />
        <RoleSelectionContent
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
        />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={isGenerating}
            onClick={handleNext}
          >
            {isGenerating ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'team.generate_code_button' })}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
