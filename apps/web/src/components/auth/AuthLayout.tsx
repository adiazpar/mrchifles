import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import Image from '@/lib/Image'

// Ported from the original Next.js auth layout (apps/api/src/app/(auth)/layout.tsx
// in commit 0bcff5c). The original was an async Server Component using
// next-intl/server's getTranslations; here it's a plain client component
// because Vite has no server-component split. Phase 6 codemods next-intl
// to react-intl.
//
// The wrapper styling (auth-container, auth-logo) is referenced by class
// name only — the corresponding CSS lived in apps/api/src/app/styles/
// and was deleted with the rest of the legacy client routes. Until those
// styles are ported (out-of-scope for Phase 5.2), the auth pages will
// render structurally correct but visually unstyled. That's accepted.
interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations('auth')
  return (
    <div className="flex-1 flex flex-col">
      <div className="auth-container">
        <div className="auth-logo">
          <Image
            src="/icon-source.png"
            alt={t('logo_alt')}
            width={96}
            height={96}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  )
}
