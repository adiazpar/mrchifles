'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { PageTransition } from '@/components/layout'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('auth')
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
