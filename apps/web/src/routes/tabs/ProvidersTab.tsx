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
 * Providers tab placeholder. Phase 12.1 will replace this body with the
 * real providers list (drill-down from manage; the IonTabBar entry exists
 * because the providers list owns its own navigation stack inside Ionic's
 * tab model). Includes a back button defaulting to the manage tab so
 * deep-link entries land somewhere sensible.
 */
export function ProvidersTab() {
  const { businessId } = useParams<{ businessId: string }>()
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/${businessId}/manage`} />
          </IonButtons>
          <IonTitle>{intl.formatMessage({ id: 'navigation.providers' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="p-4 text-sm text-[var(--color-text-secondary)]">
          Providers — Phase 12 will implement this drill-down.
        </div>
      </IonContent>
    </IonPage>
  )
}
