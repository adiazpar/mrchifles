import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { PageTransition } from '@/components/layout'

// Server Component — only uses translations + composes a client child
// (PageTransition). RSCs can render client components directly, so the
// client boundary stays at PageTransition.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('auth')
  return (
    <PageTransition>
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <Image
              src="/kasero-logo.png"
              alt={t('logo_alt')}
              width={320}
              height={107}
              priority
            />
          </div>

          {children}
        </div>
      </div>
    </PageTransition>
  )
}
