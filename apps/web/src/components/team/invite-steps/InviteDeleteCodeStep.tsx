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
  IonButton,
} from '@ionic/react'
import { ConfirmationAnimation } from '@/components/ui'
import { useInviteNavRef, useInviteCallbacks } from './InviteNavContext'
import { InviteDeletedSuccessStep } from './InviteDeletedSuccessStep'

export function InviteDeleteCodeStep() {
  const t = useIntl()
  const navRef = useInviteNavRef()
  const { newCode, isDeletingCode, onDeleteCode } = useInviteCallbacks()

  const handleDelete = async () => {
    const ok = await onDeleteCode()
    if (ok) {
      navRef.current?.push(() => <InviteDeletedSuccessStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>{t.formatMessage({ id: 'team.step_delete_code' })}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p className="text-text-secondary">
          {t.formatMessage({ id: 'team.delete_code_description' }, { code: newCode ?? '' })}
        </p>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            <IonButton
              fill="outline"
              onClick={() => navRef.current?.pop()}
              disabled={isDeletingCode}
            >
              {t.formatMessage({ id: 'common.cancel' })}
            </IonButton>
            <IonButton
              color="danger"
              onClick={handleDelete}
              disabled={isDeletingCode}
            >
              {t.formatMessage({ id: 'common.delete' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
