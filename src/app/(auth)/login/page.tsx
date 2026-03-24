'use client'

import { Suspense, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/home'
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setIsLoading(true)

      try {
        const result = await login(email, password)

        if (!result.success) {
          setError(result.error || 'Failed to log in')
          return
        }

        // Redirect to intended page or dashboard
        router.push(redirect)
        router.refresh()
      } catch {
        setError('Connection error')
      } finally {
        setIsLoading(false)
      }
    },
    [email, password, redirect, router, login]
  )

  return (
    <>
      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            autoFocus
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner />
                <span className="sr-only">Logging in...</span>
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>
      </Card>

      <div className="auth-footer">
        <p className="auth-footer-link">
          <span className="text-text-tertiary">Don't have an account? </span>
          <Link href="/register" className="text-brand hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </>
  )
}

function LoginPageFallback() {
  return (
    <Card padding="lg">
      <div className="flex flex-col items-center py-8">
        <Spinner className="spinner-lg" />
        <p className="text-text-secondary mt-4">Loading...</p>
      </div>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
