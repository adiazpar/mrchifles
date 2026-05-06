import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

/**
 * Sales tab placeholder. Phase 11.2 will replace this body with the real
 * SalesView (sales sessions, transactions, point-of-sale UI).
 */
export function SalesTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.sales' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="p-4 text-sm text-[var(--color-text-secondary)]">
          Sales — Phase 11 will implement this tab.
        </div>
      </IonContent>
    </IonPage>
  )
}
