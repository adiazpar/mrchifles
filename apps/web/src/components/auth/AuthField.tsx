import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  label: string
  trailing?: ReactNode
  // Optional content rendered inside the field card, below the input —
  // used for a password strength meter, inline hint, or per-field error.
  below?: ReactNode
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  function AuthField({ label, id, className, trailing, below, ...inputProps }, ref) {
    const inputId =
      id ?? `auth-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    const inputClass = ['auth-field__input', className].filter(Boolean).join(' ')
    return (
      <label className="auth-field" htmlFor={inputId}>
        <span className="auth-field__label">{label}</span>
        <input {...inputProps} id={inputId} ref={ref} className={inputClass} />
        {trailing ? <span className="auth-field__trailing">{trailing}</span> : null}
        {below ? <div className="auth-field__below">{below}</div> : null}
      </label>
    )
  }
)
