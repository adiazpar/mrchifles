'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import { Modal, Spinner, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import {
  BUSINESS_TYPES,
  REGIONS,
  getLocalesByRegion,
  getCurrencyConfig,
} from '@/lib/locale-config'
import { FoodBeverageIcon, ServicesIcon, RetailIcon, WholesaleIcon, ManufacturingIcon, OtherBusinessIcon } from '@/components/icons'
import type { UseCreateBusinessReturn, BusinessType } from '@/hooks'

interface CreateBusinessModalProps {
  createBusiness: UseCreateBusinessReturn
}

export function CreateBusinessModal({ createBusiness }: CreateBusinessModalProps) {
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
      <Modal.Step title="Create Business" hideBackButton>
        <NameContent name={formData.name} setName={setName} />
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <NextStepButton disabled={!isNameValid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Business Type */}
      <Modal.Step title="Business Type">
        <TypeContent type={formData.type} setType={setType} />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <NextStepButton disabled={!isTypeValid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Location (also sets currency) */}
      <Modal.Step title="Location">
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
      <Modal.Step title="Business Logo">
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
      <Modal.Step title="Business Created" hideBackButton>
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
            Done
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
  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          Step 1 of 4
        </div>
        <p className="text-sm text-text-secondary text-center">
          What&apos;s the name of your business?
        </p>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Business Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Business"
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
  food: FoodBeverageIcon,
  retail: RetailIcon,
  services: ServicesIcon,
  wholesale: WholesaleIcon,
  manufacturing: ManufacturingIcon,
  other: OtherBusinessIcon,
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

function getBusinessTypeIcon(typeValue: string, isSelected: boolean) {
  const IconComponent = BUSINESS_TYPE_ICONS[typeValue]
  if (IconComponent) {
    return (
      <IconComponent
        className={`w-8 h-8 ${isSelected ? 'text-brand' : 'text-text-secondary'}`}
      />
    )
  }
  return <span className="text-2xl">{FALLBACK_EMOJIS[typeValue] || '💼'}</span>
}

function TypeContent({ type, setType }: TypeContentProps) {
  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          Step 2 of 4
        </div>
        <p className="text-sm text-text-secondary text-center">
          Select the type that best fits your business
        </p>
      </Modal.Item>
      <Modal.Item>
        <div className="grid grid-cols-2 gap-2">
          {BUSINESS_TYPES.map((bt) => (
            <button
              key={bt.value}
              type="button"
              onClick={() => setType(bt.value as BusinessType)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                type === bt.value
                  ? 'border-brand bg-brand-subtle'
                  : 'border-border hover:border-brand-300'
              }`}
            >
              {getBusinessTypeIcon(bt.value, type === bt.value)}
              <span className="text-sm font-medium text-text-primary">{bt.label}</span>
            </button>
          ))}
        </div>
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
  const localesByRegion = getLocalesByRegion()
  const currencyConfig = getCurrencyConfig(currency)

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          Step 3 of 4
        </div>
        <p className="text-sm text-text-secondary text-center mb-2">
          Select your location. Currency is set automatically.
        </p>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Location
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="input"
        >
          {REGIONS.map((region) => (
            <optgroup key={region} label={region}>
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
            <span className="text-sm text-text-secondary">Currency</span>
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
// STEP 2: LOGO UPLOAD
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    // Reset the input so picking the same file again re-triggers onChange
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (PNG, JPG, WebP, or GIF)')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setUploadError('Image must be under 2MB')
      return
    }
    setLogoFile(file)
  }

  return (
    <>
      <Modal.Item>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          Step 4 of 4
        </div>
        <p className="text-sm text-text-secondary text-center">
          Upload your business logo (optional)
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
                aria-label="Remove logo"
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
            {logoPreview ? 'Change Logo' : 'Upload Logo'}
          </span>
        </button>
        {uploadError ? (
          <p className="text-xs text-error text-center mt-2">{uploadError}</p>
        ) : (
          <p className="text-xs text-text-tertiary text-center mt-2">
            PNG, JPG up to 2MB
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

  return (
    <button
      type="button"
      onClick={goNext}
      disabled={disabled}
      className="btn btn-primary flex-1"
    >
      Continue
    </button>
  )
}

interface CreateButtonProps {
  isCreating: boolean
  onCreate: () => Promise<boolean>
}

function CreateButton({ isCreating, onCreate }: CreateButtonProps) {
  const { goToStep } = useMorphingModal()

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
      {isCreating ? <Spinner size="sm" /> : "Let's Go!"}
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
        Business Created
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
        style={{ opacity: createSuccess ? 1 : 0 }}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {createdBusiness?.name || 'Your business'} is ready to use
      </p>
    </div>
  )
}
