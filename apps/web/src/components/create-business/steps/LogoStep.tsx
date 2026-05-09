import { useCallback, useMemo, useRef, useState } from 'react'
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
  IonSpinner,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { Upload, X } from 'lucide-react'
import Image from '@/lib/Image'
import {
  BUSINESS_TYPE_ICONS,
  BUSINESS_TYPE_FALLBACK_EMOJIS,
} from '@/components/businesses/shared'
import { MAX_UPLOAD_SIZE } from '@/lib/storage-client'
import type { BusinessType } from '@/hooks'
import { useCreateBusinessCtx, useNavRef } from '../CreateBusinessModal'
import { SuccessStep } from './SuccessStep'

function getDefaultIconForType(businessType: BusinessType | null) {
  if (!businessType) return <span className="text-5xl">💼</span>

  const IconComponent = BUSINESS_TYPE_ICONS[businessType]
  if (IconComponent) {
    return <IconComponent className="w-16 h-16 text-brand" />
  }

  return (
    <span className="text-5xl">
      {BUSINESS_TYPE_FALLBACK_EMOJIS[businessType] || '💼'}
    </span>
  )
}

export function LogoStep() {
  const t = useIntl()
  const navRef = useNavRef()
  const {
    formData,
    setLogoFile,
    clearLogo,
    isCreating,
    handleCreateBusiness,
    handleClose,
    handleExitComplete,
  } = useCreateBusinessCtx()

  function handleCancel() {
    handleClose()
    handleExitComplete()
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUploadError(null)
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return

      if (!file.type.startsWith('image/')) {
        setUploadError(
          t.formatMessage({ id: 'createBusiness.logo_invalid_type' }),
        )
        return
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        setUploadError(
          t.formatMessage({ id: 'createBusiness.logo_too_large' }),
        )
        return
      }
      setLogoFile(file)
    },
    [setLogoFile, t],
  )

  const handleCreate = useCallback(async () => {
    const success = await handleCreateBusiness()
    if (success) {
      navRef.current?.push(() => <SuccessStep />)
    }
  }, [handleCreateBusiness, navRef])

  const titleNode = useMemo(() => {
    const full = t.formatMessage({ id: 'createBusiness.logo_title' })
    const emphasis = t.formatMessage({ id: 'createBusiness.logo_title_emphasis' })
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

  const hasLogo = !!formData.logoPreview

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
                { current: 4, total: 4 },
              )}
            </div>
            <h1 className="wizard-hero__title">{titleNode}</h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'createBusiness.logo_subtitle' })}
            </p>
          </header>

          {/* Medallion preview — the "stage" for the logo. Falls back to
              the business-type icon when no image is uploaded yet. */}
          <div className="create-business__logo-stage">
            <span className="create-business__logo-stage-label">
              {t.formatMessage({ id: 'createBusiness.logo_preview_label' })}
            </span>
            <div className="create-business__logo-medallion">
              <div className="create-business__logo-medallion-inner">
                {formData.logoPreview ? (
                  <Image
                    src={formData.logoPreview}
                    alt="Business logo"
                    width={144}
                    height={144}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  getDefaultIconForType(formData.type)
                )}
              </div>
              {hasLogo && (
                <button
                  type="button"
                  onClick={clearLogo}
                  className="create-business__logo-remove"
                  aria-label={t.formatMessage({ id: 'createBusiness.logo_remove' })}
                >
                  <X />
                </button>
              )}
            </div>
          </div>

          {/* File input + upload control row. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="create-business__logo-upload"
          >
            <span className="create-business__logo-upload-icon">
              <Upload />
            </span>
            <span className="create-business__logo-upload-body">
              <span className="create-business__logo-upload-label">
                {t.formatMessage({ id: 'createBusiness.logo_action_label' })}
              </span>
              <span className="create-business__logo-upload-value">
                {hasLogo
                  ? t.formatMessage({ id: 'createBusiness.logo_change_button' })
                  : t.formatMessage({ id: 'createBusiness.logo_upload_button' })}
              </span>
            </span>
          </button>

          {uploadError ? (
            <p className="wizard-note wizard-note--center wizard-note--error">
              {uploadError}
            </p>
          ) : (
            <p className="wizard-note wizard-note--center">
              {t.formatMessage({ id: 'createBusiness.logo_size_hint' })}
            </p>
          )}
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <IonButton
              expand="block"
              disabled={isCreating}
              onClick={handleCreate}
            >
              {isCreating ? (
                <IonSpinner name="crescent" />
              ) : (
                t.formatMessage({ id: 'createBusiness.button_create' })
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
