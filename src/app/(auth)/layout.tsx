'use client'

import Image from 'next/image'
import { PageTransition } from '@/components/layout'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageTransition>
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <Image
              src="/kasero-logo-light.png"
              alt="Kasero - Business Made Easy"
              width={320}
              height={107}
              className="logo-light"
              priority
            />
            <Image
              src="/kasero-logo-dark.png"
              alt="Kasero - Business Made Easy"
              width={320}
              height={107}
              className="logo-dark"
              priority
            />
          </div>

          {children}
        </div>
      </div>
    </PageTransition>
  )
}
