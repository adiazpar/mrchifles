import type { ReactNode } from 'react'
import { BrandMark } from './BrandMark'

// Shared shell for /login and /register. Modern Mercantile chrome:
// wordmark at the top (replaces the legacy K-swoosh image), main slot
// for hero + form (vertically centered in remaining space via flex),
// and an optional footer slot for the "or / secondary CTA / version"
// stack pinned to the bottom.
//
// The auth-* classes live in apps/web/src/styles/auth.css.
interface AuthLayoutProps {
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-container">
      <BrandMark />
      <div className="auth-main">{children}</div>
      {footer ? <div className="auth-footer">{footer}</div> : null}
    </div>
  )
}
