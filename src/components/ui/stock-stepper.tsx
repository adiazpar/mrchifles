'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

interface StockStepperProps {
  value: number
  onChange: (value: number) => void
  currentStock: number
  maxAdd?: number
}

/**
 * Simple +/- stepper with editable center input for stock adjustments.
 * Positive values = add, negative values = remove.
 */
export function StockStepper({
  value,
  onChange,
  currentStock,
  maxAdd = 999,
}: StockStepperProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Local state for input field to allow empty/partial input while typing
  const [inputValue, setInputValue] = useState(() =>
    value > 0 ? `+${value}` : String(value)
  )

  // Sync local input with external value changes (e.g., from +/- buttons)
  useEffect(() => {
    const formatted = value > 0 ? `+${value}` : String(value)
    setInputValue(formatted)
  }, [value])

  // Clamp value within valid range
  const clamp = useCallback((v: number) => {
    const min = -currentStock
    const max = maxAdd
    return Math.max(min, Math.min(max, v))
  }, [currentStock, maxAdd])

  const handleDecrement = useCallback(() => {
    onChange(clamp(value - 1))
  }, [value, onChange, clamp])

  const handleIncrement = useCallback(() => {
    onChange(clamp(value + 1))
  }, [value, onChange, clamp])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    // Allow empty, minus sign, or plus sign for typing
    if (raw === '' || raw === '-' || raw === '+') {
      setInputValue(raw)
      return
    }

    // Allow valid number patterns (including +/- prefix)
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
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
    // Format the display
    setInputValue(finalValue > 0 ? `+${finalValue}` : String(finalValue))
  }, [inputValue, onChange, clamp])

  // Determine styling based on value
  const adjustmentType = value < 0 ? 'remove' : value > 0 ? 'add' : 'zero'

  // Get colors based on type
  const getColors = () => {
    switch (adjustmentType) {
      case 'remove':
        return {
          bg: 'bg-error-subtle',
          text: 'text-error',
        }
      case 'add':
        return {
          bg: 'bg-success-subtle',
          text: 'text-success',
        }
      default:
        return {
          bg: 'bg-bg-muted',
          text: 'text-text-secondary',
        }
    }
  }

  const colors = getColors()

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Stepper controls */}
      <div className="flex items-center gap-3">
        {/* Minus button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= -currentStock}
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-text-primary active:scale-[0.98]"
        >
          -
        </button>

        {/* Editable number input */}
        <div className={`relative rounded-2xl ${colors.bg} transition-colors duration-200`}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="0"
            className={`w-28 h-16 text-center text-3xl font-display font-bold bg-transparent border-none outline-none placeholder:text-text-tertiary ${colors.text}`}
          />
        </div>

        {/* Plus button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= maxAdd}
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed text-text-primary active:scale-[0.98]"
        >
          +
        </button>
      </div>

      {/* New stock preview */}
      <div className={`text-sm ${value !== 0 ? colors.text : 'text-text-secondary'}`}>
        Nuevo stock: <span className="font-semibold">{currentStock + value}</span>
        {value !== 0 && <span className="text-text-tertiary ml-1">(actual: {currentStock})</span>}
      </div>
    </div>
  )
}
