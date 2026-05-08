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
import { LocalePicker } from '@/components/businesses/shared'
import { useCreateBusinessCtx, useNavRef } from '../CreateBusinessModal'
import { LogoStep } from './LogoStep'

export function LocaleStep() {
  const t = useIntl()
  const navRef = useNavRef()
  const { formData, setLocale } = useCreateBusinessCtx()

  function handleNext() {
    navRef.current?.push(() => <LogoStep />)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'createBusiness.step_location_title' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage(
            { id: 'createBusiness.step_indicator' },
            { current: 3, total: 4 },
          )}
        </div>
        <p className="text-sm text-text-secondary text-center mb-4">
          {t.formatMessage({ id: 'createBusiness.step_location_subtitle' })}
        </p>
        <LocalePicker value={formData.locale} onChange={setLocale} />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <IonButton expand="block" onClick={handleNext}>
            {t.formatMessage({ id: 'common.continue' })}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
