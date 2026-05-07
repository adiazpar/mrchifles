'use client'

import CurrencyInput from 'react-currency-input-field'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { getCurrencyConfig } from '@kasero/shared/locale-config'

/**
 * Locale-aware currency input. Reads the current business's locale and
 * currency from `BusinessContext` and renders a properly formatted price
 * field: correct decimal/thousand separators, correct currency symbol,
 * correct number of decimals (0 for CLP/COP/CRC/PYG, 2 for everything
 * else), and only digits + one decimal separator are accepted.
 *
 * Works as a controlled input — pass `value` as a string (the raw number
 * without formatting, e.g., `"1234.56"`) and `onValueChange` receives the
 * same raw-string format.
 */
export interface PriceInputProps {
  id?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
  ariaLabel?: string
}

// react-currency-input-field uses these to format the number.
// Locales use '.' (US) or ',' (most EU/LATAM) as the decimal separator,
// with the opposite char as the thousand grouper. We derive these from
// the active locale via Intl.NumberFormat to stay consistent with how
// the same number is rendered everywhere else in the app.
function getSeparators(locale: string): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5)
  const decimal = parts.find(p => p.type === 'decimal')?.value ?? '.'
  const group = parts.find(p => p.type === 'group')?.value ?? ','
  return { decimal, group }
}

export function PriceInput({
  id,
  value,
  onValueChange,
  placeholder = '0',
  className = 'input',
  disabled = false,
  autoFocus = false,
  ariaLabel,
}: PriceInputProps) {
  const { locale, currency } = useBusinessFormat()
  const currencyConfig = getCurrencyConfig(currency)
  const decimals = currencyConfig?.decimals ?? 2
  const { decimal, group } = getSeparators(locale)

  return (
    <CurrencyInput
      id={id}
      className={className}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      intlConfig={{ locale, currency }}
      decimalsLimit={decimals}
      decimalScale={decimals}
      decimalSeparator={decimal}
      groupSeparator={group}
      allowNegativeValue={false}
      // onValueChange returns the raw numeric string (e.g. "1234.56") —
      // this matches how our form state currently stores prices so the
      // migration is drop-in.
      onValueChange={(v) => onValueChange(v ?? '')}
    />
  )
}
