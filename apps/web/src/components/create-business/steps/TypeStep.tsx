import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonButton,
} from '@ionic/react'
import { BusinessTypeGrid } from '@/components/businesses/shared'
import { useCreateBusinessCtx, useNavRef } from '../CreateBusinessModal'
import { LocaleStep } from './LocaleStep'

export function TypeStep() {
  const t = useIntl()
  const navRef = useNavRef()
  const { formData, setType, isTypeValid } = useCreateBusinessCtx()

  function handleNext() {
    navRef.current?.push(() => <LocaleStep />)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'createBusiness.step_type_title' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage(
            { id: 'createBusiness.step_indicator' },
            { current: 2, total: 4 },
          )}
        </div>
        <p className="text-sm text-text-secondary text-center mb-4">
          {t.formatMessage({ id: 'createBusiness.step_type_subtitle' })}
        </p>
        <BusinessTypeGrid selected={formData.type} onSelect={setType} />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <IonButton
            expand="block"
            disabled={!isTypeValid}
            onClick={handleNext}
          >
            {t.formatMessage({ id: 'common.continue' })}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
