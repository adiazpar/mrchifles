import { IonContent, IonPage } from '@ionic/react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'

import { BusinessHeader } from '@/components/layout'
import { ProvidersDrilldown } from '@/components/providers/ProvidersDrilldown'

export function ProvidersTab() {
  const { businessId } = useParams<{ businessId: string }>()
  const intl = useIntl()
  return (
    <IonPage>
      <BusinessHeader
        title={intl.formatMessage({ id: 'navigation.providers' })}
        backHref={`/${businessId}/manage`}
        backLabel={intl.formatMessage({ id: 'common.back' })}
      />
      <IonContent>
        <ProvidersDrilldown businessId={businessId} />
      </IonContent>
    </IonPage>
  )
}
