'use client'

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react'

export interface OTPInputProps {
  length?: number
  onComplete: (code: string) => void
  error?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function OTPInput({
  length = 6,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  // Clear error state when user starts typing
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (error) {
      setHasError(true)
      // Clear values on error
      setValues(Array(length).fill(''))
      // Focus first input
      inputRefs.current[0]?.focus()
    }
  }, [error, length])

  const handleChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/\D/g, '').slice(-1)

      setHasError(false)

      const newValues = [...values]
      newValues[index] = digit
      setValues(newValues)

      // If digit entered, move to next input
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      // Check if complete
      const code = newValues.join('')
      if (code.length === length && !newValues.includes('')) {
        onComplete(code)
      }
    },
    [values, length, onComplete]
  )

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (!values[index] && index > 0) {
          // If current is empty, go to previous and clear it
          inputRefs.current[index - 1]?.focus()
          const newValues = [...values]
          newValues[index - 1] = ''
          setValues(newValues)
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    },
    [values, length]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '')
      const digits = pastedData.slice(0, length).split('')

      const newValues = [...values]
      digits.forEach((digit, i) => {
        if (i < length) {
          newValues[i] = digit
        }
      })
      setValues(newValues)
      setHasError(false)

      // Focus the next empty input or the last one
      const nextEmpty = newValues.findIndex((v) => !v)
      if (nextEmpty !== -1) {
        inputRefs.current[nextEmpty]?.focus()
      } else {
        inputRefs.current[length - 1]?.focus()
        // Complete
        const code = newValues.join('')
        if (code.length === length) {
          onComplete(code)
        }
      }
    },
    [values, length, onComplete]
  )

  return (
    <div className="w-full">
      <div className="flex justify-center gap-2">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={values[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-2xl font-bold
              border-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand
              ${
                hasError
                  ? 'border-error bg-error-subtle'
                  : 'border-border bg-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label={`Digito ${index + 1}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-error text-sm mt-3">{error}</p>
      )}
    </div>
  )
}
