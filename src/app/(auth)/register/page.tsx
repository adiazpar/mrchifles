'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      // Validate passwords match
      if (password !== passwordConfirm) {
        setError('Passwords do not match')
        return
      }

      // Validate password length
      if (password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to create account')
          return
        }

        // Success - redirect to dashboard
        router.push('/')
        router.refresh()
      } catch {
        setError('Connection error')
      } finally {
        setIsLoading(false)
      }
    },
    [email, password, passwordConfirm, name, router]
  )

  return (
    <>
      <Card padding="lg">
        <h2 className="text-xl font-display font-bold mb-1">Create account</h2>
        <p className="text-sm text-text-tertiary mb-6">
          Set up your account to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            autoComplete="name"
            autoFocus
            required
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />

          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-text-tertiary mt-1">
              This password protects your account
            </p>
          </div>

          <Input
            label="Confirm password"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Repeat your password"
            autoComplete="new-password"
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
                <span className="sr-only">Creating account...</span>
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
      </Card>

      <div className="auth-footer">
        <p className="auth-footer-link">
          <span className="text-text-tertiary">Already have an account? </span>
          <Link href="/login" className="text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </>
  )
}
