'use client'

import { useMemo, type ReactNode } from 'react'
import { useIntl } from 'react-intl'
import { Delete } from 'lucide-react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { getCurrencyConfig } from '@kasero/shared/locale-config'
import { haptic } from '@/lib/haptics'

export interface PriceKeypadStepProps {
  /**
   * Canonical numeric string (e.g. "1234.56"). Empty string and "0" both
   * render as the zero placeholder. The component emits canonical strings
   * back via `onValueChange` — locale separators are display-only.
   */
  value: string
  onValueChange: (value: string) => void
  /**
   * Optional hero block above the amount display. Mono uppercase eyebrow,
   * Fraunces italic title (use `<em>` for terracotta accent on a key
   * word), and italic display subtitle.
   */
  eyebrow?: string
  title?: ReactNode
  subtitle?: string
  /**
   * Small mono uppercase label above the amount display. Typically the
   * field label + currency code (e.g. "Starting cash · USD").
   */
  amountLabel?: string
  /**
   * Helper text below the amount display. Italic display copy reads as
   * a guidance note rather than an instruction.
   */
  helper?: ReactNode
  /** Aria label for the digit grid as a whole. */
  ariaLabel?: string
}

/**
 * Inline cash-counting keypad. Replaces a free-form `<PriceInput>` with
 * an always-visible 3×4 numeric grid + a typographic amount card. Built
 * for one-handed retail use: no system keyboard pop-up, no layout
 * jumping, large display-serif glyphs that read at counter distance.
 *
 * Locale aware: decimal separator follows the business locale (`,` vs
 * `.`); the decimal key is hidden for zero-decimal currencies (JPY,
 * CLP, etc.); currency symbol comes from the locale's currency-formatter.
 *
 * The host modal must lay this out with a flex column at 100% height
 * inside an IonContent with `noScroll` set on ModalShell. The component
 * fills available space (display centered) with the keys docked at the
 * bottom — never scrolls, no matter how short the viewport.
 */
export function PriceKeypadStep({
  value,
  onValueChange,
  eyebrow,
  title,
  subtitle,
  amountLabel,
  helper,
  ariaLabel,
}: PriceKeypadStepProps) {
  const t = useIntl()
  const { locale, currency } = useBusinessFormat()
  const currencyConfig = getCurrencyConfig(currency)
  const decimals = currencyConfig?.decimals ?? 2

  // Currency symbol from the locale's currency formatter.
  const currencySymbol = useMemo(() => {
    try {
      const parts = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).formatToParts(0)
      return parts.find((p) => p.type === 'currency')?.value ?? '$'
    } catch {
      return '$'
    }
  }, [locale, currency])

  const decimalSep = useMemo(() => {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.5)
    return parts.find((p) => p.type === 'decimal')?.value ?? '.'
  }, [locale])

  const { integerPart, decimalPart, hasDecimal } = useMemo(() => {
    if (!value) return { integerPart: '0', decimalPart: '', hasDecimal: false }
    if (value.includes('.')) {
      const [int, dec = ''] = value.split('.')
      return {
        integerPart: int || '0',
        decimalPart: dec,
        hasDecimal: true,
      }
    }
    return { integerPart: value, decimalPart: '', hasDecimal: false }
  }, [value])

  // Group integer part with locale grouping (e.g. "1234" → "1,234").
  const formattedInteger = useMemo(() => {
    const n = parseInt(integerPart, 10)
    if (isNaN(n)) return integerPart
    return new Intl.NumberFormat(locale, {
      useGrouping: true,
      maximumFractionDigits: 0,
    }).format(n)
  }, [integerPart, locale])

  const placeholderDecimals = decimals > 0 ? '0'.repeat(decimals) : ''

  const pressDigit = (digit: string) => {
    haptic()
    if (hasDecimal) {
      if (decimalPart.length >= decimals) return
      onValueChange(value + digit)
      return
    }
    // Integer-part editing.
    if (integerPart === '0') {
      // Replace leading zero with the new digit, unless the digit IS
      // zero (no point growing "0" to "00").
      if (digit === '0') return
      onValueChange(digit)
      return
    }
    onValueChange(integerPart + digit)
  }

  const pressDecimal = () => {
    if (decimals === 0) return
    if (hasDecimal) return
    haptic()
    onValueChange((value === '' ? '0' : value) + '.')
  }

  const pressBackspace = () => {
    if (!value || value === '0') return
    haptic()
    const next = value.slice(0, -1)
    onValueChange(next === '' ? '' : next)
  }

  const decimalDisabled = decimals === 0 || hasDecimal
  const backspaceDisabled = !value || value === '0'

  return (
    <div className="price-keypad">
      {(eyebrow || title || subtitle) && (
        <header className="price-keypad__hero">
          {eyebrow && (
            <span className="price-keypad__hero-eyebrow">{eyebrow}</span>
          )}
          {title && <h1 className="price-keypad__hero-title">{title}</h1>}
          {subtitle && (
            <p className="price-keypad__hero-subtitle">{subtitle}</p>
          )}
        </header>
      )}

      <div className="price-keypad__display">
        {amountLabel && (
          <div className="price-keypad__amount-label">{amountLabel}</div>
        )}
        <div className="price-keypad__amount">
          <span className="price-keypad__amount-currency">{currencySymbol}</span>
          <span className="price-keypad__amount-num">
            {formattedInteger}
            {decimals > 0 && (
              hasDecimal ? (
                <>
                  {decimalSep}
                  {decimalPart}
                  {decimalPart.length < decimals && (
                    <span className="price-keypad__amount-pale">
                      {'0'.repeat(decimals - decimalPart.length)}
                    </span>
                  )}
                </>
              ) : (
                <span className="price-keypad__amount-pale">
                  {decimalSep}
                  {placeholderDecimals}
                </span>
              )
            )}
          </span>
        </div>
        {helper && <div className="price-keypad__helper">{helper}</div>}
      </div>

      <div
        className="price-keypad__keys"
        role="group"
        aria-label={ariaLabel}
      >
        {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map((d) => (
          <button
            key={d}
            type="button"
            className="price-keypad__key"
            onClick={() => pressDigit(d)}
          >
            {d}
          </button>
        ))}

        {decimals > 0 ? (
          <button
            type="button"
            className="price-keypad__key price-keypad__key--muted"
            onClick={pressDecimal}
            disabled={decimalDisabled}
            aria-label={t.formatMessage({ id: 'keypad.decimal_aria' })}
          >
            {decimalSep}
          </button>
        ) : (
          <span
            className="price-keypad__key price-keypad__key--ghost"
            aria-hidden="true"
          />
        )}

        <button
          type="button"
          className="price-keypad__key"
          onClick={() => pressDigit('0')}
        >
          0
        </button>

        <button
          type="button"
          className="price-keypad__key price-keypad__key--muted"
          onClick={pressBackspace}
          disabled={backspaceDisabled}
          aria-label={t.formatMessage({ id: 'keypad.backspace_aria' })}
        >
          <Delete size={20} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  )
}
