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
import { useMemberNavRef, useMemberCallbacks } from './MemberNavContext'

export function MemberRemoveStep() {
  const t = useIntl()
  const navRef = useMemberNavRef()
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
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            <IonButton
              fill="outline"
              onClick={() => navRef.current?.pop()}
              disabled={removeLoading}
            >
              {t.formatMessage({ id: 'common.cancel' })}
            </IonButton>
            <IonButton
              color="danger"
              onClick={handleRemove}
              disabled={removeLoading}
            >
              {removeLoading ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'team.remove_confirm' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
