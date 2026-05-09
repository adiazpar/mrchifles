import { useMemo } from 'react'
import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { BusinessTypeGrid } from '@/components/businesses/shared'
import { useCreateBusinessCtx, useNavRef } from '../CreateBusinessModal'
import { LocaleStep } from './LocaleStep'

export function TypeStep() {
  const t = useIntl()
  const navRef = useNavRef()
  const { formData, setType, isTypeValid, handleClose, handleExitComplete } = useCreateBusinessCtx()

  function handleCancel() {
    handleClose()
    handleExitComplete()
  }

  function handleNext() {
    navRef.current?.push(() => <LocaleStep />)
  }

  const titleNode = useMemo(() => {
    const full = t.formatMessage({ id: 'createBusiness.type_title' })
    const emphasis = t.formatMessage({ id: 'createBusiness.type_title_emphasis' })
    const idx = emphasis ? full.indexOf(emphasis) : -1
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [t])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={handleCancel} aria-label={t.formatMessage({ id: 'common.close' })}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="wizard-content">
        <div className="wizard-step">
          <header className="wizard-hero">
            <div className="wizard-hero__eyebrow">
              {t.formatMessage(
                { id: 'createBusiness.step_indicator' },
                { current: 2, total: 4 },
              )}
            </div>
            <h1 className="wizard-hero__title">{titleNode}</h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'createBusiness.type_subtitle' })}
            </p>
          </header>

          {/* The shared BusinessTypeGrid is unmodified. The wrapper gives
              it a hair-line top edge so the picker reads as a "shelf"
              of options under the editorial hero. */}
          <div className="create-business__type-shelf">
            <BusinessTypeGrid selected={formData.type} onSelect={setType} />
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <IonButton
              expand="block"
              disabled={!isTypeValid}
              onClick={handleNext}
            >
              {t.formatMessage({ id: 'common.continue' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
