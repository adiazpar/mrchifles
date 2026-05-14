import type { ReactNode } from 'react'

// Shared body shell for the / (EntryPage) and /register wizard steps.
// The page-level route (EntryPage / RegisterPage) owns the IonHeader +
// IonToolbar chrome — back chevron in the toolbar's start slot, Kasero
// wordmark in the title slot — matching the rest of the app's header
// pattern.
//
// This component just renders the auth body: a vertically-stacked main
// slot (hero + form) and an optional footer slot pinned to the bottom.
//
// The auth-* classes live in apps/web/src/styles/auth.css.
interface AuthLayoutProps {
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-container">
      <div className="auth-main">{children}</div>
      {footer ? <div className="auth-footer">{footer}</div> : null}
    </div>
  )
}
