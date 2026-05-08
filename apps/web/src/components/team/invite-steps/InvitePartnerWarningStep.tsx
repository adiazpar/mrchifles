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
} from '@ionic/react'
import { useInviteNavRef, useInviteCallbacks } from './InviteNavContext'
import { InviteCodeStep } from './InviteCodeStep'

export function InvitePartnerWarningStep() {
  const t = useIntl()
  const navRef = useInviteNavRef()
  const { isGenerating, onGenerateCode } = useInviteCallbacks()

  const handleConfirm = async () => {
    await onGenerateCode()
    navRef.current?.push(() => <InviteCodeStep />)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>{t.formatMessage({ id: 'team.step_partner_warning' })}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h3 className="text-lg font-semibold text-text-primary">
          {t.formatMessage({ id: 'team.partner_warning_heading' })}
        </h3>
        <p className="text-sm text-text-secondary mt-2">
          {t.formatMessage({ id: 'team.partner_warning_body' })}
        </p>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navRef.current?.pop()}
              className="btn btn-secondary flex-1"
              disabled={isGenerating}
            >
              {t.formatMessage({ id: 'common.cancel' })}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn btn-primary flex-1"
              disabled={isGenerating}
            >
              {isGenerating ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'team.partner_warning_confirm' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
