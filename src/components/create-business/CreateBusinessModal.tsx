'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X, ChefHat, HandHelping, Store, Boxes, Factory, Shapes } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Modal, Spinner, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import {
  REGIONS,
  getLocalesByRegion,
  getCurrencyConfig,
} from '@/lib/locale-config'
import type { Region } from '@/lib/locale-config'
import type { UseCreateBusinessReturn, BusinessType } from '@/hooks'
import { BusinessTypeGrid } from '@/components/businesses/shared'

interface CreateBusinessModalProps {
  createBusiness: UseCreateBusinessReturn
}

export function CreateBusinessModal({ createBusiness }: CreateBusinessModalProps) {
  const t = useTranslations('createBusiness')
  const tCommon = useTranslations('common')

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
      <Modal.Step title={t('modal_title')} hideBackButton>
        <NameContent name={formData.name} setName={setName} />
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary flex-1"
          >
            {tCommon('cancel')}
          </button>
          <NextStepButton disabled={!isNameValid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Business Type */}
      <Modal.Step title={t('step_type_title')}>
        <TypeContent type={formData.type} setType={setType} />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <NextStepButton disabled={!isTypeValid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Location (also sets currency) */}
      <Modal.Step title={t('step_location_title')}>
        <LocaleContent
          locale={formData.locale}
          setLocale={setLocale}
          currency={formData.currency}
        />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <NextStepButton />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Logo Upload */}
      <Modal.Step title={t('step_logo_title')}>
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
      <Modal.Step title={t('step_success_title')} hideBackButton>
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
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

// ============================================
// STEP 0: NAME
// ============================================

interface NameContentProps {
  name: string
  setName: (name: string) => void
}

function NameContent({ name, setName }: NameContentProps) {
  const t = useTranslations('createBusiness')

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t('step_indicator', { current: 1, total: 4 })}
        </div>
        <p className="text-sm text-text-secondary text-center">
          {t('step_name_subtitle')}
        </p>
      </Modal.Item>
      <Modal.Item>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name_placeholder')}
          maxLength={100}
          className="input"
          autoFocus
          autoComplete="off"
        />
      </Modal.Item>
    </>
  )
}

// ============================================
// STEP 1: BUSINESS TYPE
// ============================================

interface TypeContentProps {
  type: BusinessType | null
  setType: (type: BusinessType) => void
}

// Custom icon components for business types (takes precedence over emojis)
const BUSINESS_TYPE_ICONS: Partial<Record<string, React.ComponentType<{ className?: string }>>> = {
  food: ChefHat,
  retail: Store,
  services: HandHelping,
  wholesale: Boxes,
  manufacturing: Factory,
  other: Shapes,
}

// Fallback emojis for types without custom icons
const FALLBACK_EMOJIS: Record<string, string> = {
  food: '🍽️',
  retail: '🛍️',
  services: '✂️',
  wholesale: '📦',
  manufacturing: '🏭',
  other: '💼',
}

function TypeContent({ type, setType }: TypeContentProps) {
  const t = useTranslations('createBusiness')

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t('step_indicator', { current: 2, total: 4 })}
        </div>
        <p className="text-sm text-text-secondary text-center">
          {t('step_type_subtitle')}
        </p>
      </Modal.Item>
      <Modal.Item>
        <BusinessTypeGrid selected={type} onSelect={setType} />
      </Modal.Item>
    </>
  )
}

// ============================================
// STEP 2: LOCALE CONTENT
// ============================================

interface LocaleContentProps {
  locale: string
  setLocale: (locale: string) => void
  currency: string
}

function LocaleContent({
  locale,
  setLocale,
  currency,
}: LocaleContentProps) {
  const t = useTranslations('createBusiness')
  const localesByRegion = getLocalesByRegion()
  const currencyConfig = getCurrencyConfig(currency)

  const regionLabels: Record<Region, string> = {
    'North America': t('region_north_america'),
    'Central America': t('region_central_america'),
    'South America': t('region_south_america'),
    'Caribbean': t('region_caribbean'),
    'Europe': t('region_europe'),
  }

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t('step_indicator', { current: 3, total: 4 })}
        </div>
        <p className="text-sm text-text-secondary text-center mb-2">
          {t('step_location_subtitle')}
        </p>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          {t('location_label')}
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="input"
        >
          {REGIONS.map((region) => (
            <optgroup key={region} label={regionLabels[region]}>
              {localesByRegion[region].map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.flag} {loc.country} ({loc.name})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Modal.Item>
      {currencyConfig && (
        <Modal.Item>
          <div className="flex items-center justify-between rounded-lg bg-bg-muted px-3 py-2">
            <span className="text-sm text-text-secondary">{t('currency_label')}</span>
            <span className="text-sm font-medium text-text-primary">
              {currencyConfig.symbol} {currencyConfig.name} ({currencyConfig.code})
            </span>
          </div>
        </Modal.Item>
      )}
    </>
  )
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

  return <span className="text-5xl">{FALLBACK_EMOJIS[businessType] || '💼'}</span>
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024

function LogoUploadContent({
  businessType,
  logoPreview,
  setLogoFile,
  clearLogo,
}: LogoUploadContentProps) {
  const t = useTranslations('createBusiness')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    // Reset the input so picking the same file again re-triggers onChange
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError(t('logo_invalid_type'))
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setUploadError(t('logo_too_large'))
      return
    }
    setLogoFile(file)
  }

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t('step_indicator', { current: 4, total: 4 })}
        </div>
        <p className="text-sm text-text-secondary text-center">
          {t('step_logo_subtitle')}
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
                aria-label={t('logo_remove')}
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
            {logoPreview ? t('logo_change_button') : t('logo_upload_button')}
          </span>
        </button>
        {uploadError ? (
          <p className="text-xs text-error text-center mt-2">{uploadError}</p>
        ) : (
          <p className="text-xs text-text-tertiary text-center mt-2">
            {t('logo_size_hint')}
          </p>
        )}
      </Modal.Item>
    </>
  )
}

// ============================================
// NAVIGATION BUTTONS
// ============================================

function NextStepButton({ disabled = false }: { disabled?: boolean }) {
  const { goNext } = useMorphingModal()
  const tCommon = useTranslations('common')

  return (
    <button
      type="button"
      onClick={goNext}
      disabled={disabled}
      className="btn btn-primary flex-1"
    >
      {tCommon('continue')}
    </button>
  )
}

interface CreateButtonProps {
  isCreating: boolean
  onCreate: () => Promise<boolean>
}

function CreateButton({ isCreating, onCreate }: CreateButtonProps) {
  const { goToStep } = useMorphingModal()
  const t = useTranslations('createBusiness')

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
      {isCreating ? <Spinner size="sm" /> : t('button_create')}
    </button>
  )
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
  const t = useTranslations('createBusiness')

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
        {t('step_success_heading')}
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
        style={{ opacity: createSuccess ? 1 : 0 }}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {t('step_success_description', { name: createdBusiness?.name || 'Your business' })}
      </p>
    </div>
  )
}
