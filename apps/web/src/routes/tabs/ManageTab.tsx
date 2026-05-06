import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

/**
 * Manage tab placeholder. Phase 11.2 will replace this body with the real
 * ManageView (settings shortcuts, ownership transfer, delete business,
 * shortcuts to providers and team).
 */
export function ManageTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.manage' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="p-4 text-sm text-[var(--color-text-secondary)]">
          Manage — Phase 11 will implement this tab.
        </div>
      </IonContent>
    </IonPage>
  )
}
