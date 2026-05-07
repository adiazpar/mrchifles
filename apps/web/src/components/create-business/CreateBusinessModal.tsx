'use client'

import { useIntl } from 'react-intl';

import Image from '@/lib/Image'
import { useCallback, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Modal, Spinner, useModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import type { UseCreateBusinessReturn, BusinessType } from '@/hooks'
import {
  BusinessTypeGrid,
  LocalePicker,
  BUSINESS_TYPE_ICONS,
  BUSINESS_TYPE_FALLBACK_EMOJIS,
} from '@/components/businesses/shared'
import { MAX_UPLOAD_SIZE } from '@/lib/storage-client'

interface CreateBusinessModalProps {
  createBusiness: UseCreateBusinessReturn
}

export function CreateBusinessModal({ createBusiness }: CreateBusinessModalProps) {
  const t = useIntl()
  const tCommon = useIntl()

  const {
    isOpen,
    handleClose,
    handleExitComplete,
    formData,
    setName,
    setType,
    setLocale,
    setLogoFile,
    clearLogo,
    isCreating,
    createSuccess,
    error,
    createdBusiness,
    isNameValid,
    isTypeValid,
    handleCreateBusiness,
  } = createBusiness

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onExitComplete={handleExitComplete}
    >
      {/* Step 0: Business Name */}
      <Modal.Step title={t.formatMessage({
        id: 'createBusiness.modal_title'
      })} hideBackButton>
        <NameContent name={formData.name} setName={setName} />
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary flex-1"
          >
            {tCommon.formatMessage({
              id: 'common.cancel'
            })}
          </button>
          <NextStepButton disabled={!isNameValid} />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 1: Business Type */}
      <Modal.Step title={t.formatMessage({
        id: 'createBusiness.step_type_title'
      })}>
        <TypeContent type={formData.type} setType={setType} />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <NextStepButton disabled={!isTypeValid} />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 2: Location (also sets currency) */}
      <Modal.Step title={t.formatMessage({
        id: 'createBusiness.step_location_title'
      })}>
        <LocaleContent
          locale={formData.locale}
          setLocale={setLocale}
        />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <NextStepButton />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 3: Logo Upload */}
      <Modal.Step title={t.formatMessage({
        id: 'createBusiness.step_logo_title'
      })}>
        <LogoUploadContent
          businessType={formData.type}
          logoPreview={formData.logoPreview}
          setLogoFile={setLogoFile}
          clearLogo={clearLogo}
        />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <CreateButton
            isCreating={isCreating}
            onCreate={handleCreateBusiness}
          />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 4: Success */}
      <Modal.Step title={t.formatMessage({
        id: 'createBusiness.step_success_title'
      })} hideBackButton className="modal-step--centered">
        <Modal.Item>
          <SuccessContent
            createdBusiness={createdBusiness}
            createSuccess={createSuccess}
            icon={formData.icon}
          />
        </Modal.Item>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg text-center">
              {error}
            </div>
          </Modal.Item>
        )}
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-primary flex-1"
          >
            {tCommon.formatMessage({
              id: 'common.done'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}

// ============================================
// STEP 0: NAME
// ============================================

interface NameContentProps {
  name: string
  setName: (name: string) => void
}

function NameContent({ name, setName }: NameContentProps) {
  const t = useIntl()

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage({
            id: 'createBusiness.step_indicator'
          }, { current: 1, total: 4 })}
        </div>
        <p className="text-sm text-text-secondary text-center">
          {t.formatMessage({
            id: 'createBusiness.step_name_subtitle'
          })}
        </p>
      </Modal.Item>
      <Modal.Item>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.formatMessage({
            id: 'createBusiness.name_placeholder'
          })}
          maxLength={100}
          className="input"
          autoComplete="off"
        />
      </Modal.Item>
    </>
  );
}

// ============================================
// STEP 1: BUSINESS TYPE
// ============================================

interface TypeContentProps {
  type: BusinessType | null
  setType: (type: BusinessType) => void
}

function TypeContent({ type, setType }: TypeContentProps) {
  const t = useIntl()

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage({
            id: 'createBusiness.step_indicator'
          }, { current: 2, total: 4 })}
        </div>
        <p className="text-sm text-text-secondary text-center">
          {t.formatMessage({
            id: 'createBusiness.step_type_subtitle'
          })}
        </p>
      </Modal.Item>
      <Modal.Item>
        <BusinessTypeGrid selected={type} onSelect={setType} />
      </Modal.Item>
    </>
  );
}

// ============================================
// STEP 2: LOCALE CONTENT
// ============================================

interface LocaleContentProps {
  locale: string
  setLocale: (locale: string) => void
}

function LocaleContent({ locale, setLocale }: LocaleContentProps) {
  const t = useIntl()

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage({
            id: 'createBusiness.step_indicator'
          }, { current: 3, total: 4 })}
        </div>
        <p className="text-sm text-text-secondary text-center mb-2">
          {t.formatMessage({
            id: 'createBusiness.step_location_subtitle'
          })}
        </p>
      </Modal.Item>
      <Modal.Item>
        <LocalePicker value={locale} onChange={setLocale} />
      </Modal.Item>
    </>
  );
}

// ============================================
// STEP 3: LOGO UPLOAD
// ============================================

interface LogoUploadContentProps {
  businessType: BusinessType | null
  logoPreview: string | null
  setLogoFile: (file: File | null) => void
  clearLogo: () => void
}

function getDefaultIconForType(businessType: BusinessType | null) {
  if (!businessType) return <span className="text-5xl">💼</span>

  const IconComponent = BUSINESS_TYPE_ICONS[businessType]
  if (IconComponent) {
    return <IconComponent className="w-14 h-14 text-brand" />
  }

  return <span className="text-5xl">{BUSINESS_TYPE_FALLBACK_EMOJIS[businessType] || '💼'}</span>
}

function LogoUploadContent({
  businessType,
  logoPreview,
  setLogoFile,
  clearLogo,
}: LogoUploadContentProps) {
  const t = useIntl()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    // Reset the input so picking the same file again re-triggers onChange
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError(t.formatMessage({
        id: 'createBusiness.logo_invalid_type'
      }))
      return
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setUploadError(t.formatMessage({
        id: 'createBusiness.logo_too_large'
      }))
      return
    }
    setLogoFile(file)
  }

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage({
            id: 'createBusiness.step_indicator'
          }, { current: 4, total: 4 })}
        </div>
        <p className="text-sm text-text-secondary text-center">
          {t.formatMessage({
            id: 'createBusiness.step_logo_subtitle'
          })}
        </p>
      </Modal.Item>
      <Modal.Item>
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-brand-subtle flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Business logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                getDefaultIconForType(businessType)
              )}
            </div>
            {logoPreview && (
              <button
                type="button"
                onClick={clearLogo}
                className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow-md hover:bg-error-hover transition-colors"
                aria-label={t.formatMessage({
                  id: 'createBusiness.logo_remove'
                })}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </Modal.Item>
      <Modal.Item>
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
            {logoPreview ? t.formatMessage({
              id: 'createBusiness.logo_change_button'
            }) : t.formatMessage({
              id: 'createBusiness.logo_upload_button'
            })}
          </span>
        </button>
        {uploadError ? (
          <p className="text-xs text-error text-center mt-2">{uploadError}</p>
        ) : (
          <p className="text-xs text-text-tertiary text-center mt-2">
            {t.formatMessage({
              id: 'createBusiness.logo_size_hint'
            })}
          </p>
        )}
      </Modal.Item>
    </>
  );
}

// ============================================
// NAVIGATION BUTTONS
// ============================================

function NextStepButton({ disabled = false }: { disabled?: boolean }) {
  const { goNext } = useModal()
  const tCommon = useIntl()

  return (
    <button
      type="button"
      onClick={goNext}
      disabled={disabled}
      className="btn btn-primary flex-1"
    >
      {tCommon.formatMessage({
        id: 'common.continue'
      })}
    </button>
  );
}

interface CreateButtonProps {
  isCreating: boolean
  onCreate: () => Promise<boolean>
}

function CreateButton({ isCreating, onCreate }: CreateButtonProps) {
  const { goToStep } = useModal()
  const t = useIntl()

  const handleClick = useCallback(async () => {
    const success = await onCreate()
    if (success) {
      goToStep(4)
    }
  }, [onCreate, goToStep])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isCreating}
      className="btn btn-primary flex-1"
    >
      {isCreating ? <Spinner size="sm" /> : t.formatMessage({
        id: 'createBusiness.button_create'
      })}
    </button>
  );
}

// ============================================
// SUCCESS CONTENT
// ============================================

interface SuccessContentProps {
  createdBusiness: { id: string; name: string } | null
  createSuccess: boolean
  icon: string | null
}

function SuccessContent({ createdBusiness, createSuccess, icon }: SuccessContentProps) {
  const t = useIntl()

  return (
    <div className="flex flex-col items-center text-center py-4">
      <div style={{ width: 160, height: 160 }}>
        {createSuccess && (
          <LottiePlayer
            src="/animations/success.json"
            loop={false}
            autoplay={true}
            delay={500}
            style={{ width: 160, height: 160 }}
          />
        )}
      </div>
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
        style={{ opacity: createSuccess ? 1 : 0 }}
      >
        {t.formatMessage({
          id: 'createBusiness.step_success_heading'
        })}
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
        style={{ opacity: createSuccess ? 1 : 0 }}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {t.formatMessage({
          id: 'createBusiness.step_success_description'
        }, { name: createdBusiness?.name || 'Your business' })}
      </p>
    </div>
  );
}
