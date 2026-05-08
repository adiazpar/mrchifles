'use client'

import { useState, useEffect, useRef } from 'react'
import { IonInput } from '@ionic/react'
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
 *
 * Renders a bare `<IonInput>` internally. Wrap in `<IonItem>` at the
 * callsite if you want the standard Ionic row chrome.
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

// Derive decimal/group separators from the active locale via Intl.NumberFormat
// so they stay consistent with every other number rendered in the app.
function getSeparators(locale: string): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5)
  const decimal = parts.find(p => p.type === 'decimal')?.value ?? '.'
  const group = parts.find(p => p.type === 'group')?.value ?? ','
  return { decimal, group }
}

// Parse a locale-formatted string back to a canonical numeric string
// (digits + optional "." decimal, no group separators). Returns '' when
// the input is empty or unparseable.
function parseLocaleValue(raw: string, decimal: string, group: string): string {
  if (!raw) return ''
  // Strip group separators, replace locale decimal with '.'
  const normalised = raw
    .split(group).join('')
    .replace(decimal, '.')
  const n = parseFloat(normalised)
  return isNaN(n) ? '' : String(n)
}

// Format a canonical numeric string for display using the locale separators.
// Intl.NumberFormat handles group separators automatically for the locale.
// Leaves trailing decimal (e.g. "1234.") intact so typing feels natural.
function formatForDisplay(
  canonical: string,
  locale: string,
  decimals: number,
  decimal: string,
): string {
  if (!canonical) return ''

  // Handle "123." — user is mid-typing a decimal; show as-is to avoid
  // swallowing the trailing separator.
  const trailingDecimal = canonical.endsWith('.')

  const n = parseFloat(canonical)
  if (isNaN(n)) return canonical

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n)

  // Restore trailing decimal separator if the user was mid-typing.
  return trailingDecimal ? formatted + decimal : formatted
}

export function PriceInput({
  id,
  value,
  onValueChange,
  placeholder = '0',
  className,
  disabled = false,
  autoFocus = false,
  ariaLabel,
}: PriceInputProps) {
  const { locale, currency } = useBusinessFormat()
  const currencyConfig = getCurrencyConfig(currency)
  const decimals = currencyConfig?.decimals ?? 2
  const { decimal, group } = getSeparators(locale)

  // Internal display state — may contain locale separators, trailing decimal,
  // partial input, etc. We only push canonical (raw) values upward via
  // onValueChange so callers never deal with locale-formatted strings.
  const [displayValue, setDisplayValue] = useState<string>(() =>
    formatForDisplay(value, locale, decimals, decimal),
  )

  // Keep display in sync when the parent updates `value` externally (e.g.
  // form reset), but do NOT reformat while the field is focused (would
  // clobber mid-type partial strings).
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setDisplayValue(formatForDisplay(value, locale, decimals, decimal))
    }
  }, [value, locale, decimals, decimal, group])

  function handleIonInput(e: CustomEvent) {
    const raw: string = (e.detail.value as string) ?? ''

    // Strip any character that isn't a digit, the decimal sep, or the group sep.
    const allowed = new RegExp(`[^0-9${escapeRegex(decimal)}${escapeRegex(group)}]`, 'g')
    let filtered = raw.replace(allowed, '')

    // Enforce at most one decimal separator.
    const parts = filtered.split(decimal)
    if (parts.length > 2) {
      filtered = parts[0] + decimal + parts.slice(1).join('')
    }

    // Enforce decimal limit.
    if (decimals === 0) {
      filtered = filtered.split(decimal)[0]
    } else if (parts.length === 2 && parts[1].length > decimals) {
      filtered = parts[0] + decimal + parts[1].slice(0, decimals)
    }

    setDisplayValue(filtered)

    const canonical = parseLocaleValue(filtered, decimal, group)
    onValueChange(canonical)
  }

  function handleIonFocus() {
    focusedRef.current = true
    // On focus, show the raw display value without group separators so
    // editing is easier (matches CurrencyInput's unformat-on-focus behaviour).
    if (displayValue) {
      const stripped = displayValue.split(group).join('')
      setDisplayValue(stripped)
    }
  }

  function handleIonBlur() {
    focusedRef.current = false
    // Re-format when the user leaves the field.
    const canonical = parseLocaleValue(displayValue, decimal, group)
    if (canonical) {
      const formatted = formatForDisplay(canonical, locale, decimals, decimal)
      setDisplayValue(formatted)
      // Ensure parent value is consistent after blur.
      onValueChange(canonical)
    }
  }

  return (
    <IonInput
      id={id}
      type="text"
      inputmode="decimal"
      value={displayValue}
      placeholder={placeholder}
      disabled={disabled}
      autofocus={autoFocus}
      aria-label={ariaLabel}
      class={className}
      onIonInput={handleIonInput}
      onIonFocus={handleIonFocus}
      onIonBlur={handleIonBlur}
    />
  )
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
