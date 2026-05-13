import { IonIcon } from '@ionic/react'
import { eye, eyeOff } from 'ionicons/icons'
import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { useIntl } from 'react-intl'

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  label: string
  trailing?: ReactNode
  // Optional content rendered inside the field card, below the input —
  // used for a password strength meter, inline hint, or per-field error.
  below?: ReactNode
  // When true and type === 'password', render a show/hide eye toggle as the
  // trailing slot. Overrides any caller-provided trailing.
  revealable?: boolean
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  function AuthField(
    { label, id, className, trailing, below, revealable, type, ...inputProps },
    ref,
  ) {
    const intl = useIntl()
    const [revealed, setRevealed] = useState(false)

    if (import.meta.env.MODE !== 'production' && revealable && trailing) {
      // eslint-disable-next-line no-console
      console.warn(
        'AuthField: `revealable` and `trailing` both passed — `revealable` wins, `trailing` is ignored.',
      )
    }

    const inputId =
      id ?? `auth-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    const inputClass = ['auth-field__input', className].filter(Boolean).join(' ')

    const useReveal = revealable && type === 'password'
    const effectiveType = useReveal && revealed ? 'text' : type
    const revealButton = useReveal ? (
      <button
        type="button"
        className="auth-field__reveal"
        aria-label={intl.formatMessage({
          id: revealed
            ? 'auth.register_wizard.hide_password_aria'
            : 'auth.register_wizard.reveal_password_aria',
        })}
        onClick={() => setRevealed((v) => !v)}
      >
        <IonIcon icon={revealed ? eyeOff : eye} />
      </button>
    ) : null

    const trailingNode = useReveal ? revealButton : trailing

    return (
      <label className="auth-field" htmlFor={inputId}>
        <span className="auth-field__label">{label}</span>
        <input {...inputProps} type={effectiveType} id={inputId} ref={ref} className={inputClass} />
        {trailingNode ? <span className="auth-field__trailing">{trailingNode}</span> : null}
        {below ? <div className="auth-field__below">{below}</div> : null}
      </label>
    )
  },
)
