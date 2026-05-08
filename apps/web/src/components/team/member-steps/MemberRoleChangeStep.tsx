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
} from '@ionic/react'
import { Spinner } from '@/components/ui'
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
            <button
              type="button"
              onClick={() => navRef.current?.pop()}
              className="btn btn-secondary flex-1"
              disabled={roleChangeLoading}
            >
              {t.formatMessage({ id: 'common.cancel' })}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary flex-1"
              disabled={roleChangeLoading || isDisabled}
            >
              {roleChangeLoading ? <Spinner /> : t.formatMessage({ id: 'common.save' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
