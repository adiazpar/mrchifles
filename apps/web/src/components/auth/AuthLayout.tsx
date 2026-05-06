import { useIntl } from 'react-intl';
import type { ReactNode } from 'react'
import Image from '@/lib/Image'

// Shared shell for /login and /register. The auth-container / auth-logo
// classes are styled in apps/web/src/styles/.
interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const t = useIntl()
  return (
    <div className="flex-1 flex flex-col">
      <div className="auth-container">
        <div className="auth-logo">
          <Image
            src="/icon-source.png"
            alt={t.formatMessage({
              id: 'auth.logo_alt'
            })}
            width={96}
            height={96}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
