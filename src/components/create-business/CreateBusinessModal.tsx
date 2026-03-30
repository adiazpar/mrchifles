'use client'

import { useCallback, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Modal, Spinner, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import {
  BUSINESS_TYPES,
  LOCALES,
  CURRENCIES,
  COMMON_TIMEZONES,
  getCurrencyConfig,
} from '@/lib/locale-config'
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
    setCurrency,
    setTimezone,
    setIcon,
    isCreating,
    createSuccess,
    error,
    createdBusiness,
    isStep1Valid,
    handleCreateBusiness,
  } = createBusiness

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onExitComplete={handleExitComplete}
    >
      {/* Step 0: Business Name & Type */}
      <Modal.Step title="Create Business" hideBackButton>
        <NameAndTypeContent
          name={formData.name}
          setName={setName}
          type={formData.type}
          setType={setType}
        />
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <NextStepButton disabled={!isStep1Valid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Locale & Settings */}
      <Modal.Step title="Location & Currency">
        <LocaleContent
          locale={formData.locale}
          setLocale={setLocale}
          currency={formData.currency}
          setCurrency={setCurrency}
          timezone={formData.timezone}
          setTimezone={setTimezone}
        />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <NextStepButton />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Icon Selection */}
      <Modal.Step title="Business Icon">
        <IconContent
          icon={formData.icon}
          setIcon={setIcon}
          businessType={formData.type}
        />
        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <CreateButton
            isCreating={isCreating}
            onCreate={handleCreateBusiness}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Success */}
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
      </Modal.Step>
    </Modal>
  )
}

// ============================================
// STEP 0: NAME AND TYPE
// ============================================

interface NameAndTypeContentProps {
  name: string
  setName: (name: string) => void
  type: BusinessType | null
  setType: (type: BusinessType) => void
}

function NameAndTypeContent({ name, setName, type, setType }: NameAndTypeContentProps) {
  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary text-center">
          Enter your business name and select a type
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
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Business Type
        </label>
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
              <span className="text-2xl">{bt.icon}</span>
              <span className="text-sm font-medium text-text-primary">{bt.label}</span>
            </button>
          ))}
        </div>
      </Modal.Item>
    </>
  )
}

// ============================================
// STEP 1: LOCALE CONTENT
// ============================================

interface LocaleContentProps {
  locale: string
  setLocale: (locale: string) => void
  currency: string
  setCurrency: (currency: string) => void
  timezone: string
  setTimezone: (timezone: string) => void
}

function LocaleContent({
  locale,
  setLocale,
  currency,
  setCurrency,
  timezone,
  setTimezone,
}: LocaleContentProps) {
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false)

  const selectedCurrency = getCurrencyConfig(currency)

  // Get unique currencies
  const uniqueCurrencies = Object.values(CURRENCIES)

  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary text-center mb-2">
          Select your location to set currency and timezone
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
          {LOCALES.map((loc) => (
            <option key={loc.code} value={loc.code}>
              {loc.flag} {loc.country} ({loc.name})
            </option>
          ))}
        </select>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Currency
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
            className="input w-full flex items-center justify-between"
          >
            <span>
              {selectedCurrency?.symbol} {selectedCurrency?.name} ({currency})
            </span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>
          {showCurrencyDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {uniqueCurrencies.map((cur) => (
                <button
                  key={cur.code}
                  type="button"
                  onClick={() => {
                    setCurrency(cur.code)
                    setShowCurrencyDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-surface-secondary flex items-center justify-between ${
                    currency === cur.code ? 'bg-brand-subtle' : ''
                  }`}
                >
                  <span>{cur.symbol} {cur.name}</span>
                  {currency === cur.code && <Check className="w-4 h-4 text-brand" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal.Item>
      <Modal.Item>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Timezone
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
            className="input w-full flex items-center justify-between"
          >
            <span>
              {COMMON_TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}
            </span>
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </button>
          {showTimezoneDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {COMMON_TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  type="button"
                  onClick={() => {
                    setTimezone(tz.value)
                    setShowTimezoneDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-surface-secondary flex items-center justify-between ${
                    timezone === tz.value ? 'bg-brand-subtle' : ''
                  }`}
                >
                  <span>{tz.label}</span>
                  {timezone === tz.value && <Check className="w-4 h-4 text-brand" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal.Item>
    </>
  )
}

// ============================================
// STEP 2: ICON CONTENT
// ============================================

interface IconContentProps {
  icon: string | null
  setIcon: (icon: string | null) => void
  businessType: BusinessType | null
}

// Common business-related emojis
const ICON_OPTIONS = [
  // Food & Beverage
  '🍽️', '🍕', '🍔', '🌮', '🍜', '🍣', '🥗', '☕', '🍰', '🍦',
  // Retail
  '🛍️', '👕', '👗', '👟', '💎', '🎁', '📱', '💻', '🎮', '📚',
  // Services
  '✂️', '💇', '💅', '🧹', '🔧', '🚗', '📸', '🎨', '✏️', '🏋️',
  // Wholesale/Manufacturing
  '📦', '🏭', '🔩', '⚙️', '🧱', '🪵', '🧵', '🧶', '🪡', '🔨',
  // General Business
  '💼', '🏪', '🏢', '🛒', '💰', '📊', '🎯', '⭐', '🚀', '💡',
]

function IconContent({ icon, setIcon, businessType }: IconContentProps) {
  const typeConfig = BUSINESS_TYPES.find(t => t.value === businessType)
  const defaultIcon = typeConfig?.icon || '💼'

  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary text-center">
          Choose an icon for your business (optional)
        </p>
      </Modal.Item>
      <Modal.Item>
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-2xl bg-brand-subtle flex items-center justify-center text-5xl">
            {icon || defaultIcon}
          </div>
        </div>
      </Modal.Item>
      <Modal.Item>
        <div className="grid grid-cols-5 gap-2">
          {ICON_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${
                icon === emoji
                  ? 'bg-brand-subtle border-2 border-brand'
                  : 'bg-surface-secondary hover:bg-surface-tertiary border-2 border-transparent'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
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
      goToStep(3)
    }
  }, [onCreate, goToStep])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isCreating}
      className="btn btn-primary flex-1"
    >
      {isCreating ? <Spinner size="sm" /> : 'Create Business'}
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
      <p
        className="text-xs text-text-tertiary mt-3 transition-opacity duration-500 delay-300"
        style={{ opacity: createSuccess ? 1 : 0 }}
      >
        Redirecting...
      </p>
    </div>
  )
}
