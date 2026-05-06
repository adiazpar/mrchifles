import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

/**
 * Products tab placeholder. Phase 11.2 will replace this body with the
 * real ProductsView (catalog list + add/edit modal entry points).
 */
export function ProductsTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.products' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="p-4 text-sm text-[var(--color-text-secondary)]">
          Products — Phase 11 will implement this tab.
        </div>
      </IonContent>
    </IonPage>
  )
}
