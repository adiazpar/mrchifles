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

export function MemberPartnerWarningStep() {
  const t = useIntl()
  const navRef = useMemberNavRef()
  const { roleChangeLoading, onSubmitRoleChange } = useMemberCallbacks()

  const handleConfirm = () => {
    void onSubmitRoleChange()
    // Pop back to root (details step)
    navRef.current?.popToRoot()
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
        <IonToolbar>
          {/* Toolbar back returns to the previous step; footer is primary only. */}
          <div className="modal-footer">
            <IonButton onClick={handleConfirm} disabled={roleChangeLoading}>
              {roleChangeLoading ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'team.partner_warning_confirm' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
