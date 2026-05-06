'use client'

import { useIntl } from 'react-intl';
import { useCallback, useRef, useState, useEffect } from 'react'

interface StockStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

/**
 * Simple +/- stepper with editable center input for setting stock values.
 * Shows and edits the absolute stock value directly.
 */
export function StockStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
}: StockStepperProps) {
  const t = useIntl()
  const inputRef = useRef<HTMLInputElement>(null)

  // Local state for input field to allow empty/partial input while typing
  const [inputValue, setInputValue] = useState(() => String(value))

  // Sync local input with external value changes (e.g., from +/- buttons)
  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  // Clamp value within valid range
  const clamp = useCallback((v: number) => {
    return Math.max(min, Math.min(max, v))
  }, [min, max])

  const handleDecrement = useCallback(() => {
    onChange(clamp(value - 1))
  }, [value, onChange, clamp])

  const handleIncrement = useCallback(() => {
    onChange(clamp(value + 1))
  }, [value, onChange, clamp])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    // Allow empty for typing
    if (raw === '') {
      setInputValue(raw)
      return
    }

    // Allow valid number patterns
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      const clamped = clamp(parsed)
      setInputValue(raw)
      onChange(clamped)
    }
  }, [onChange, clamp])

  const handleInputBlur = useCallback(() => {
    // On blur, parse and commit the value (default to 0 if empty/invalid)
    const parsed = parseInt(inputValue, 10)
    const finalValue = isNaN(parsed) ? 0 : clamp(parsed)
    onChange(finalValue)
    setInputValue(String(finalValue))
  }, [inputValue, onChange, clamp])

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Stepper controls */}
      <div className="flex items-center gap-2">
        {/* Minus button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          data-tap-feedback
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-transform duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-text-primary data-[pressed='true']:scale-[0.94]"
        >
          -
        </button>

        {/* Editable number input */}
        <div className="relative rounded-xl bg-bg-muted transition-colors duration-200">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="0"
            className="w-20 h-12 text-center text-2xl font-display font-bold bg-transparent border-none outline-none placeholder:text-text-tertiary text-text-primary"
          />
        </div>

        {/* Plus button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          data-tap-feedback
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-transform duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-text-primary data-[pressed='true']:scale-[0.94]"
        >
          +
        </button>
      </div>
      {/* Label */}
      <div className="text-xs text-text-secondary">
        {t.formatMessage({
          id: 'ui.stock_stepper.units'
        })}
      </div>
    </div>
  );
}
