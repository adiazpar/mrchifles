'use client'

import { useState, useCallback, useEffect } from 'react'

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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>
    </div>
  )
}
