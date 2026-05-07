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

import { TeamDrilldown } from '@/components/team/TeamDrilldown'

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
        <TeamDrilldown businessId={businessId} />
      </IonContent>
    </IonPage>
  )
}
