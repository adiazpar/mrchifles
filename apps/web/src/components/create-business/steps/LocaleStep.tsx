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
import { LocalePicker } from '@/components/businesses/shared'
import { useCreateBusinessCtx, useNavRef } from '../CreateBusinessModal'
import { LogoStep } from './LogoStep'

export function LocaleStep() {
  const t = useIntl()
  const navRef = useNavRef()
  const { formData, setLocale, handleClose, handleExitComplete } = useCreateBusinessCtx()

  function handleCancel() {
    handleClose()
    handleExitComplete()
  }

  function handleNext() {
    navRef.current?.push(() => <LogoStep />)
  }

  const titleNode = useMemo(() => {
    const full = t.formatMessage({ id: 'createBusiness.locale_title' })
    const emphasis = t.formatMessage({ id: 'createBusiness.locale_title_emphasis' })
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
            <IonButton fill="clear" onClick={handleCancel} aria-label={t.formatMessage({ id: 'common.close' })}>
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
                { current: 3, total: 4 },
              )}
            </div>
            <h1 className="wizard-hero__title">{titleNode}</h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'createBusiness.locale_subtitle' })}
            </p>
          </header>

          <div className="create-business__locale-shelf">
            <p className="wizard-note">
              {t.formatMessage({ id: 'createBusiness.locale_currency_note' })}
            </p>
            <LocalePicker value={formData.locale} onChange={setLocale} />
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <IonButton expand="block" onClick={handleNext}>
              {t.formatMessage({ id: 'common.continue' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
