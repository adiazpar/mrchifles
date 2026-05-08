import { useCallback, useRef, useState } from 'react'
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
  IonSpinner,
} from '@ionic/react'
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
    return <IconComponent className="w-14 h-14 text-brand" />
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
  } = useCreateBusinessCtx()

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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'createBusiness.step_logo_title' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage(
            { id: 'createBusiness.step_indicator' },
            { current: 4, total: 4 },
          )}
        </div>
        <p className="text-sm text-text-secondary text-center mb-4">
          {t.formatMessage({ id: 'createBusiness.step_logo_subtitle' })}
        </p>

        {/* Logo preview */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-brand-subtle flex items-center justify-center overflow-hidden">
              {formData.logoPreview ? (
                <Image
                  src={formData.logoPreview}
                  alt="Business logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                getDefaultIconForType(formData.type)
              )}
            </div>
            {formData.logoPreview && (
              <button
                type="button"
                onClick={clearLogo}
                className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow-md hover:bg-error-hover transition-colors"
                aria-label={t.formatMessage({ id: 'createBusiness.logo_remove' })}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* File input */}
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
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-brand hover:bg-brand-subtle transition-all text-text-secondary hover:text-brand"
        >
          <Upload className="w-5 h-5" />
          <span className="text-sm font-medium">
            {formData.logoPreview
              ? t.formatMessage({ id: 'createBusiness.logo_change_button' })
              : t.formatMessage({ id: 'createBusiness.logo_upload_button' })}
          </span>
        </button>
        {uploadError ? (
          <p className="text-xs text-error text-center mt-2">{uploadError}</p>
        ) : (
          <p className="text-xs text-text-tertiary text-center mt-2">
            {t.formatMessage({ id: 'createBusiness.logo_size_hint' })}
          </p>
        )}
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
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
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
