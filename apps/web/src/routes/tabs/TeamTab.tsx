import { IonContent, IonPage } from '@ionic/react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'

import { BusinessHeader } from '@/components/layout'
import { TeamDrilldown } from '@/components/team/TeamDrilldown'

export function TeamTab() {
  const { businessId } = useParams<{ businessId: string }>()
  const intl = useIntl()
  return (
    <IonPage>
      <BusinessHeader
        title={intl.formatMessage({ id: 'navigation.team' })}
        backHref={`/${businessId}/manage`}
        backLabel={intl.formatMessage({ id: 'common.back' })}
      />
      <IonContent>
        <TeamDrilldown businessId={businessId} />
      </IonContent>
    </IonPage>
  )
}
