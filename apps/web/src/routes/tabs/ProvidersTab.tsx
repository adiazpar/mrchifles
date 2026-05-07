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

import { ProvidersDrilldown } from '@/components/providers/ProvidersDrilldown'

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
        <ProvidersDrilldown businessId={businessId} />
      </IonContent>
    </IonPage>
  )
}
