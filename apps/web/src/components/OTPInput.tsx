import { useRef, useEffect, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from 'react'
import './OTPInput.css'

interface OTPInputProps {
  value: string
  onChange: (next: string) => void
  onComplete?: (code: string) => void
  length?: number
  autoFocus?: boolean
  disabled?: boolean
  error?: boolean
}

export function OTPInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus = true,
  disabled,
  error,
}: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus && !disabled) {
      refs.current[0]?.focus()
    }
  }, [autoFocus, disabled])

  const setRef = (i: number) => (el: HTMLInputElement | null) => {
    refs.current[i] = el
  }

  const handleChange = (i: number, e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Strip everything that isn't a digit; keep only the last character so
    // pasting "12" into a single cell still advances reasonably.
    const digit = raw.replace(/\D/g, '').slice(-1)
    if (!digit) {
      // User typed something non-numeric — leave state untouched.
      return
    }
    const chars = value.padEnd(length, ' ').split('')
    chars[i] = digit
    const joined = chars.join('').replace(/\s/g, '').slice(0, length)
    onChange(joined)
    if (i < length - 1) {
      refs.current[i + 1]?.focus()
    }
    if (joined.length === length && onComplete) {
      onComplete(joined)
    }
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[i]) {
        // Cell has a digit — let the default Backspace fire so onChange
        // can clear it. But manually clear and rebuild here since the
        // single-char input setup is asymmetric: we own the value.
        e.preventDefault()
        const chars = value.split('')
        chars[i] = ''
        onChange(chars.join('').slice(0, length))
      } else if (i > 0) {
        e.preventDefault()
        refs.current[i - 1]?.focus()
      }
      return
    }
    if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault()
      refs.current[i - 1]?.focus()
      return
    }
    if (e.key === 'ArrowRight' && i < length - 1) {
      e.preventDefault()
      refs.current[i + 1]?.focus()
      return
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted.length === 0) {
      // Don't preventDefault — let nothing happen.
      return
    }
    e.preventDefault()
    onChange(pasted)
    if (pasted.length === length && onComplete) {
      onComplete(pasted)
    }
    const focusIdx = Math.min(pasted.length, length - 1)
    refs.current[focusIdx]?.focus()
  }

  return (
    <div className={`otp-input${error ? ' otp-input--error' : ''}`} role="group" aria-label={`${length}-digit verification code`}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={setRef(i)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-label={`Digit ${i + 1} of ${length}`}
          data-testid={`otp-input-${i}`}
        />
      ))}
    </div>
  )
}
