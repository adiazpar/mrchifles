import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useIntl } from 'react-intl'

/**
 * Home tab placeholder. Phase 11.1 will replace this body with the real
 * HomeView (dashboard/greeting + business switcher + recent activity).
 *
 * Mounted at `/<businessId>/home` from BusinessTabsLayout's IonRouterOutlet.
 * IonTabs preserves this page's scroll + state when other tabs are active.
 */
export function HomeTab() {
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{intl.formatMessage({ id: 'navigation.home' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="p-4 text-sm text-[var(--color-text-secondary)]">
          Home — Phase 11 will implement this tab.
        </div>
      </IonContent>
    </IonPage>
  )
}
