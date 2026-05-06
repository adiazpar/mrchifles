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
 * Team tab placeholder. Phase 12.2 will replace this body with the real
 * team list (drill-down from manage). Includes a back button defaulting
 * to the manage tab so deep-link entries land somewhere sensible.
 */
export function TeamTab() {
  const { businessId } = useParams<{ businessId: string }>()
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/${businessId}/manage`} />
          </IonButtons>
          <IonTitle>{intl.formatMessage({ id: 'navigation.team' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="p-4 text-sm text-[var(--color-text-secondary)]">
          Team — Phase 12 will implement this drill-down.
        </div>
      </IonContent>
    </IonPage>
  )
}
