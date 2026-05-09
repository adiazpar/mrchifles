import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonButton,
} from '@ionic/react'
import { useMemberCallbacks } from './MemberNavContext'

export function MemberRemoveStep() {
  const t = useIntl()
  const { member, removeLoading, onRemoveMember, onClose } = useMemberCallbacks()

  const handleRemove = async () => {
    const ok = await onRemoveMember()
    if (ok) onClose()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>{t.formatMessage({ id: 'team.step_remove_member' })}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h3 className="text-lg font-semibold text-text-primary">
          {t.formatMessage({ id: 'team.remove_warning_heading' }, { name: member.name })}
        </h3>
        <p className="text-sm text-text-secondary mt-2">
          {t.formatMessage({ id: 'team.remove_warning_body' }, { name: member.name })}
        </p>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          {/* Toolbar back returns to the previous step; footer is the destructive primary only. */}
          <div className="modal-footer">
            <IonButton color="danger" onClick={handleRemove} disabled={removeLoading}>
              {removeLoading ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'team.remove_confirm' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
