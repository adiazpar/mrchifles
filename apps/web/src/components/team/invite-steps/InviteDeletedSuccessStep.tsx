import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
} from '@ionic/react'
import { ConfirmationAnimation } from '@/components/ui'
import { useInviteCallbacks } from './InviteNavContext'

export function InviteDeletedSuccessStep() {
  const t = useIntl()
  const { onClose, codeDeleted } = useInviteCallbacks()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t.formatMessage({ id: 'team.step_code_deleted' })}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <ConfirmationAnimation
          type="error"
          triggered={codeDeleted}
          title={t.formatMessage({ id: 'team.code_deleted_heading' })}
          subtitle={t.formatMessage({ id: 'team.code_deleted_description' })}
        />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <IonButton expand="block" onClick={onClose}>
            {t.formatMessage({ id: 'common.close' })}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
