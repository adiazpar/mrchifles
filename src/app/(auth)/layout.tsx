'use client'

import { AuthGuard } from '@/components/auth'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth={false}>
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <h1 className="auth-logo-title">
              <span className="text-brand">Mr.</span>
              <span>Chifles</span>
            </h1>
            <p className="auth-logo-subtitle">
              Sistema de Gestion de Ventas
            </p>
          </div>

          {children}
        </div>
      </div>
    </AuthGuard>
  )
}
