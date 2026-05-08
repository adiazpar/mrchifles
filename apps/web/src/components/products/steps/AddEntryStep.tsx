import { useIntl } from 'react-intl'
import { useRef } from 'react'
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
import { Sparkles, UserPlus, FileScan, FileSpreadsheet } from 'lucide-react'
import { useProductNavRef, useAddProductCallbacks } from './ProductNavContext'
import { AiPhotoStep } from './AiPhotoStep'
import { FormStep } from './FormStep'

export function AddEntryStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { onClose, onExitComplete, onOpenSettings } = useAddProductCallbacks()

  const gradientId = useRef(`ai-icon-gradient-${Math.random().toString(36).slice(2, 7)}`).current

  function handleCancel() {
    onClose()
    onExitComplete()
  }

  function goToAiPhoto() {
    navRef.current?.push(() => <AiPhotoStep />)
  }

  function goToManual() {
    navRef.current?.push(() => <FormStep />)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.title_add' })}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleCancel}>
              {t.formatMessage({ id: 'common.cancel' })}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
        </svg>
        <div className="caja-actions caja-actions--stacked">
          <div className="caja-actions">
            <button
              type="button"
              onClick={goToAiPhoto}
              className="caja-action-btn caja-action-btn--large caja-action-btn--align-start"
            >
              <Sparkles className="caja-action-btn__icon" color={`url(#${gradientId})`} />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">{t.formatMessage({ id: 'productForm.snap_to_add_title' })}</span>
                <span className="caja-action-btn__desc">{t.formatMessage({ id: 'productForm.snap_to_add_desc' })}</span>
              </div>
            </button>

            <button
              type="button"
              disabled
              className="caja-action-btn caja-action-btn--large caja-action-btn--align-start"
              title={t.formatMessage({ id: 'productForm.add_from_document_desc' })}
            >
              <FileScan className="caja-action-btn__icon" color={`url(#${gradientId})`} />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">{t.formatMessage({ id: 'productForm.add_from_document_title' })}</span>
                <span className="caja-action-btn__desc">{t.formatMessage({ id: 'productForm.add_from_document_desc' })}</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {t.formatMessage({ id: 'common.or' })}
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>

          <div className="caja-actions">
            <button
              type="button"
              onClick={goToManual}
              className="caja-action-btn caja-action-btn--large caja-action-btn--align-start"
            >
              <UserPlus className="caja-action-btn__icon text-text-secondary" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">{t.formatMessage({ id: 'productForm.add_manually_title' })}</span>
                <span className="caja-action-btn__desc">{t.formatMessage({ id: 'productForm.add_manually_desc' })}</span>
              </div>
            </button>

            <button
              type="button"
              disabled
              className="caja-action-btn caja-action-btn--large caja-action-btn--align-start"
              title={t.formatMessage({ id: 'productForm.import_file_desc' })}
            >
              <FileSpreadsheet className="caja-action-btn__icon text-text-tertiary" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">{t.formatMessage({ id: 'productForm.import_file_title' })}</span>
                <span className="caja-action-btn__desc">{t.formatMessage({ id: 'productForm.import_file_desc' })}</span>
              </div>
            </button>
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <IonButton expand="block" fill="outline" onClick={onOpenSettings}>
            {t.formatMessage({ id: 'productForm.settings_button' })}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
