import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
} from '@ionic/react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'

/**
 * Provider detail drill-down placeholder. Phase 12.3 will replace this
 * body with the real provider detail view (stats + notes + edit/delete +
 * order modal entry point).
 *
 * Mounted at `/<businessId>/providers/:id` from BusinessTabsLayout's
 * IonRouterOutlet. The IonBackButton defaults to the providers list so
 * deep-link entries fall back gracefully when there is no in-app history.
 */
export function ProviderDetailPage() {
  const { businessId, id } = useParams<{ businessId: string; id: string }>()
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/${businessId}/providers`} />
          </IonButtons>
          <IonTitle>{intl.formatMessage({ id: 'providers.detail_title' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="p-4 text-sm text-[var(--color-text-secondary)]">
          Provider detail — id={id}. Phase 12.3 will implement this view.
        </div>
      </IonContent>
    </IonPage>
  )
}
