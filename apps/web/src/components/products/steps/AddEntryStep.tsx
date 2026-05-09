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
  IonIcon,
  IonCard,
  IonCardContent,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { Sparkles, UserPlus, FileScan, FileSpreadsheet, ChevronRight } from 'lucide-react'
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
            <IonButton fill="clear" onClick={handleCancel} aria-label={t.formatMessage({ id: 'common.close' })}>
              <IonIcon icon={close} />
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
        <div className="space-y-3">
          <div className="space-y-3">
            <IonCard button onClick={goToAiPhoto} className="m-0">
              <IonCardContent className="flex items-start gap-4 py-5">
                <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6" color={`url(#${gradientId})`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-text-primary">{t.formatMessage({ id: 'productForm.snap_to_add_title' })}</div>
                  <div className="text-sm text-text-secondary mt-1">{t.formatMessage({ id: 'productForm.snap_to_add_desc' })}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 self-center" />
              </IonCardContent>
            </IonCard>

            {/* Disabled card — plain div avoids IonCard shadow-DOM pointer-events leak */}
            <div className="m-0 opacity-40 pointer-events-none rounded-lg border border-[var(--color-border)] bg-[var(--ion-card-background,var(--color-bg-card,#fff))]">
              <div className="flex items-start gap-4 py-5 px-4">
                <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                  <FileScan className="w-6 h-6" color={`url(#${gradientId})`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-text-primary">{t.formatMessage({ id: 'productForm.add_from_document_title' })}</div>
                  <div className="text-sm text-text-secondary mt-1">{t.formatMessage({ id: 'productForm.add_from_document_desc' })}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 self-center" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {t.formatMessage({ id: 'common.or' })}
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>

          <div className="space-y-3">
            <IonCard button onClick={goToManual} className="m-0">
              <IonCardContent className="flex items-start gap-4 py-5">
                <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-6 h-6 text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-text-primary">{t.formatMessage({ id: 'productForm.add_manually_title' })}</div>
                  <div className="text-sm text-text-secondary mt-1">{t.formatMessage({ id: 'productForm.add_manually_desc' })}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 self-center" />
              </IonCardContent>
            </IonCard>

            {/* Disabled card — plain div avoids IonCard shadow-DOM pointer-events leak */}
            <div className="m-0 opacity-40 pointer-events-none rounded-lg border border-[var(--color-border)] bg-[var(--ion-card-background,var(--color-bg-card,#fff))]">
              <div className="flex items-start gap-4 py-5 px-4">
                <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-text-tertiary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-text-primary">{t.formatMessage({ id: 'productForm.import_file_title' })}</div>
                  <div className="text-sm text-text-secondary mt-1">{t.formatMessage({ id: 'productForm.import_file_desc' })}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 self-center" />
              </div>
            </div>
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
