'use client'

import { useCallback, useRef, useEffect } from 'react'

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

    // Allow empty, minus sign, or number
    if (raw === '' || raw === '-') {
      // Temporarily allow for typing
      onChange(0)
      return
    }

    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      onChange(clamp(parsed))
    }
  }, [onChange, clamp])

  const handleInputBlur = useCallback(() => {
    // Ensure value is clamped on blur
    onChange(clamp(value))
  }, [value, onChange, clamp])

  // Determine styling based on value
  const adjustmentType = value < 0 ? 'remove' : value > 0 ? 'add' : 'zero'

  // Get colors based on type
  const getColors = () => {
    switch (adjustmentType) {
      case 'remove':
        return {
          bg: 'bg-error-subtle',
          text: 'text-error',
          buttonBg: 'bg-error/10 hover:bg-error/20 active:bg-error/30',
          buttonText: 'text-error',
        }
      case 'add':
        return {
          bg: 'bg-success-subtle',
          text: 'text-success',
          buttonBg: 'bg-success/10 hover:bg-success/20 active:bg-success/30',
          buttonText: 'text-success',
        }
      default:
        return {
          bg: 'bg-bg-muted',
          text: 'text-text-secondary',
          buttonBg: 'bg-bg-muted hover:bg-bg-elevated active:bg-bg-muted',
          buttonText: 'text-text-primary',
        }
    }
  }

  const colors = getColors()

  // Format display value
  const displayValue = value > 0 ? `+${value}` : String(value)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Stepper controls */}
      <div className="flex items-center gap-3">
        {/* Minus button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= -currentStock}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${colors.buttonBg} ${colors.buttonText}`}
        >
          -
        </button>

        {/* Editable number input */}
        <div className={`relative rounded-2xl ${colors.bg} transition-colors duration-200`}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className={`w-28 h-16 text-center text-3xl font-display font-bold bg-transparent border-none outline-none ${colors.text}`}
          />
        </div>

        {/* Plus button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= maxAdd}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${colors.buttonBg} ${colors.buttonText}`}
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
