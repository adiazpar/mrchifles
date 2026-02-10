'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (!email.trim() || !password.trim()) {
        setError('Por favor ingresa tu email y contrasena')
        return
      }

      setIsLoading(true)

      // Simulate API call - will be replaced with PocketBase auth
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // For demo, accept any credentials
      // In production, this will use PocketBase authentication
      router.push('/ventas')
    },
    [email, password, router]
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
      <div className="w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold">
            <span className="text-brand">Mr.</span>
            <span className="text-text-primary">Chifles</span>
          </h1>
          <p className="text-text-secondary mt-2">
            Sistema de Gestion de Ventas
          </p>
        </div>

        {/* Login form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              autoFocus
            />

            <Input
              label="Contrasena"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contrasena"
              autoComplete="current-password"
            />

            {error && (
              <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={isLoading}
            >
              Iniciar Sesion
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-text-tertiary mt-6">
          Sistema de gestion para pequenos negocios
        </p>
      </div>
    </div>
  )
}
