import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
} from '@ionic/react'
import { useCreateBusinessCtx, useNavRef } from '../CreateBusinessModal'
import { TypeStep } from './TypeStep'

export function NameStep() {
  const t = useIntl()
  const navRef = useNavRef()
  const { formData, setName, isNameValid, handleClose, handleExitComplete } = useCreateBusinessCtx()

  function handleCancel() {
    handleClose()
    handleExitComplete()
  }

  function handleNext() {
    navRef.current?.push(() => <TypeStep />)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            {t.formatMessage({ id: 'createBusiness.modal_title' })}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleCancel}>
              {t.formatMessage({ id: 'common.cancel' })}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage(
            { id: 'createBusiness.step_indicator' },
            { current: 1, total: 4 },
          )}
        </div>
        <p className="text-sm text-text-secondary text-center mb-4">
          {t.formatMessage({ id: 'createBusiness.step_name_subtitle' })}
        </p>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.formatMessage({ id: 'createBusiness.name_placeholder' })}
          maxLength={100}
          className="input"
          autoComplete="off"
        />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <IonButton
            expand="block"
            disabled={!isNameValid}
            onClick={handleNext}
          >
            {t.formatMessage({ id: 'common.continue' })}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
