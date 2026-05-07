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

import { ProviderDetailClient } from '@/components/providers/ProviderDetailClient'
import { useProviders } from '@/contexts/providers-context'

// Title is hoisted from useProviders() so it renders before
// ProviderDetailClient finishes its detail fetch; the body still owns
// the canonical fetch and the not-found UX.
export function ProviderDetailPage() {
  const { businessId, id } = useParams<{ businessId: string; id: string }>()
  const intl = useIntl()
  const { providers } = useProviders()
  const provider = providers.find((p) => p.id === id)
  const title = provider?.name ?? intl.formatMessage({ id: 'providers.detail_title' })

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/${businessId}/providers`} />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ProviderDetailClient businessId={businessId} providerId={id} />
      </IonContent>
    </IonPage>
  )
}
