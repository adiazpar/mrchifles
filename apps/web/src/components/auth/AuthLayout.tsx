import type { ReactNode } from 'react'
import { useIntl } from 'react-intl'
import { IonIcon } from '@ionic/react'
import { chevronBack } from 'ionicons/icons'
import { BrandMark } from './BrandMark'

// Shared shell for /login and /register. Modern Mercantile chrome:
// wordmark at the top (replaces the legacy K-swoosh image), main slot
// for hero + form (vertically centered in remaining space via flex),
// and an optional footer slot for the "or / secondary CTA / version"
// stack pinned to the bottom.
//
// When `onBack` is set, a small back chevron is rendered at the top-left
// of the main slot. Used by the register wizard's step 2 and step 3.
//
// The auth-* classes live in apps/web/src/styles/auth.css.
interface AuthLayoutProps {
  children: ReactNode
  footer?: ReactNode
  onBack?: () => void
}

export function AuthLayout({ children, footer, onBack }: AuthLayoutProps) {
  const intl = useIntl()
  return (
    <div className="auth-container">
      <BrandMark />
      <div className="auth-main">
        {onBack ? (
          <button
            type="button"
            className="auth-back"
            aria-label={intl.formatMessage({ id: 'auth.register_wizard.back_aria' })}
            onClick={onBack}
          >
            <IonIcon icon={chevronBack} />
          </button>
        ) : null}
        {children}
      </div>
      {footer ? <div className="auth-footer">{footer}</div> : null}
    </div>
  )
}
