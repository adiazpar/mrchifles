'use client'

import { useState, useCallback, useEffect } from 'react'
import { IconClose, IconBackspace } from '@/components/icons'

interface PinPadProps {
  onComplete: (pin: string) => void
  disabled?: boolean
  error?: string
  maxLength?: number
}

export function PinPad({
  onComplete,
  disabled = false,
  error,
  maxLength = 4,
}: PinPadProps) {
  const [pin, setPin] = useState('')

  // Reset PIN when error changes
  useEffect(() => {
    if (error) {
      setPin('')
    }
  }, [error])

  const handleDigit = useCallback((digit: string) => {
    if (disabled) return
    if (pin.length >= maxLength) return

    const newPin = pin + digit
    setPin(newPin)

    if (newPin.length === maxLength) {
      onComplete(newPin)
    }
  }, [pin, maxLength, disabled, onComplete])

  const handleBackspace = useCallback(() => {
    if (disabled) return
    setPin(prev => prev.slice(0, -1))
  }, [disabled])

  const handleClear = useCallback(() => {
    if (disabled) return
    setPin('')
  }, [disabled])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return

      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Delete' || e.key === 'Escape') {
        handleClear()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, handleDigit, handleBackspace, handleClear])

  return (
    <div className="pin-pad-container">
      {/* PIN dots display */}
      <div className="pin-dots" role="status" aria-label={`${pin.length} de ${maxLength} digitos ingresados`}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="pin-error" role="alert">
          {error}
        </p>
      )}

      {/* Number pad */}
      <div className="pin-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            type="button"
            className="pin-key"
            onClick={() => handleDigit(num.toString())}
            disabled={disabled}
            aria-label={num.toString()}
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          className="pin-key pin-key-action"
          onClick={handleClear}
          disabled={disabled}
          aria-label="Borrar todo"
        >
          <IconClose className="w-6 h-6" />
        </button>
        <button
          type="button"
          className="pin-key"
          onClick={() => handleDigit('0')}
          disabled={disabled}
          aria-label="0"
        >
          0
        </button>
        <button
          type="button"
          className="pin-key pin-key-action"
          onClick={handleBackspace}
          disabled={disabled}
          aria-label="Borrar"
        >
          <IconBackspace className="w-8 h-8" />
        </button>
      </div>
    </div>
  )
}
