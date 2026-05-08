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
import { RoleChangeContent } from '../RoleChangeStep'
import { useMemberNavRef, useMemberCallbacks } from './MemberNavContext'
import { MemberPartnerWarningStep } from './MemberPartnerWarningStep'

export function MemberRoleChangeStep() {
  const t = useIntl()
  const navRef = useMemberNavRef()
  const {
    member,
    newRole,
    setNewRole,
    roleChangeLoading,
    onSubmitRoleChange,
  } = useMemberCallbacks()

  const isDisabled = newRole === member.role

  const handleSave = () => {
    if (newRole === 'partner') {
      navRef.current?.push(() => <MemberPartnerWarningStep />)
    } else {
      void onSubmitRoleChange()
      navRef.current?.pop()
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>{t.formatMessage({ id: 'team.step_change_role' })}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <RoleChangeContent
          memberName={member.name}
          newRole={newRole}
          setNewRole={setNewRole}
        />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            <IonButton
              fill="outline"
              onClick={() => navRef.current?.pop()}
              disabled={roleChangeLoading}
            >
              {t.formatMessage({ id: 'common.cancel' })}
            </IonButton>
            <IonButton
              onClick={handleSave}
              disabled={roleChangeLoading || isDisabled}
            >
              {roleChangeLoading ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.save' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
