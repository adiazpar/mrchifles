'use client'

import { Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { getInviteRoleLabel } from '@/lib/auth'
import type { InviteRole } from '@/types'

type InviteStep = 'loading' | 'code' | 'info'

interface InviteInfo {
  code: string
  role: InviteRole
}

function InvitePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasAutoValidated = useRef(false)

  // Check for code in URL query parameter
  const codeFromUrl = searchParams.get('code')

  const [step, setStep] = useState<InviteStep>(codeFromUrl ? 'loading' : 'code')
  const [inviteCode, setInviteCode] = useState(codeFromUrl?.toUpperCase() || '')
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Auto-validate code from URL parameter
  useEffect(() => {
    if (!codeFromUrl || hasAutoValidated.current) return
    hasAutoValidated.current = true

    const validateCodeFromUrl = async () => {
      const code = codeFromUrl.trim().toUpperCase()

      if (!code || code.length !== 6) {
        setErrors({ code: 'Invalid code' })
        setStep('code')
        return
      }

      try {
        const response = await fetch('/api/invite/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        const result = await response.json()

        if (!result.valid) {
          setErrors({ code: result.error || 'Invalid or expired code' })
          setStep('code')
          return
        }

        setInviteInfo({
          code,
          role: result.role as InviteRole,
        })
        setStep('info')
      } catch (err) {
        console.error('Code validation error:', err)
        setErrors({ code: 'Failed to verify code' })
        setStep('code')
      }
    }

    validateCodeFromUrl()
  }, [codeFromUrl])

  const handleCodeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      const code = inviteCode.trim().toUpperCase()

      if (!code || code.length !== 6) {
        setErrors({ code: 'Code must be 6 characters' })
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch('/api/invite/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        const result = await response.json()

        if (response.status === 429) {
          setErrors({ code: result.error || 'Too many attempts' })
          setIsLoading(false)
          return
        }

        if (!result.valid) {
          setErrors({ code: result.error || 'Invalid or expired code' })
          setIsLoading(false)
          return
        }

        setInviteInfo({
          code,
          role: result.role as InviteRole,
        })
        setStep('info')
      } catch (err) {
        console.error('Code validation error:', err)
        setErrors({ code: 'Failed to verify code' })
      } finally {
        setIsLoading(false)
      }
    },
    [inviteCode]
  )

  const handleInfoSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      // Validate passwords match
      if (password !== passwordConfirm) {
        setErrors({ passwordConfirm: 'Passwords do not match' })
        return
      }

      // Validate password length
      if (password.length < 8) {
        setErrors({ password: 'Password must be at least 8 characters' })
        return
      }

      // Validate name
      if (name.trim().length < 2) {
        setErrors({ name: 'Name must be at least 2 characters' })
        return
      }

      // Validate email
      if (!email.includes('@')) {
        setErrors({ email: 'Invalid email' })
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch('/api/invite/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteCode: inviteInfo?.code,
            email,
            password,
            name,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          const errorMessage = data.error || 'Failed to create account'

          // Check for specific error messages
          if (errorMessage.includes('email')) {
            setErrors({ email: errorMessage })
          } else {
            setErrors({ general: errorMessage })
          }
          setIsLoading(false)
          return
        }

        router.push('/home')
      } catch (err) {
        console.error('Registration error:', err)
        setErrors({ general: 'Failed to create account' })
      } finally {
        setIsLoading(false)
      }
    },
    [inviteInfo, email, password, passwordConfirm, name, router]
  )

  const handleBackToCode = useCallback(() => {
    setStep('code')
    setErrors({})
    setInviteInfo(null)
  }, [])

  // Loading state (auto-validating code from URL)
  if (step === 'loading') {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-8">
          <Spinner className="spinner-lg" />
          <p className="text-text-secondary mt-4">Verifying code...</p>
        </div>
      </Card>
    )
  }

  // Code step
  if (step === 'code') {
    return (
      <>
        <Card padding="lg">
          <h2 className="text-xl font-display font-bold mb-1">Invite code</h2>
          <p className="text-sm text-text-tertiary mb-6">
            Enter the code shared by the owner
          </p>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <Input
              label="Code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
              autoFocus
              maxLength={6}
              className="text-center text-2xl tracking-widest uppercase"
              error={errors.code}
            />

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="sr-only">Verifying...</span>
                </>
              ) : (
                'Verify code'
              )}
            </button>
          </form>
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </>
    )
  }

  // Info step
  return (
    <>
      <Card padding="lg">
        {inviteInfo && (
          <div className="mb-6 p-3 bg-brand-subtle rounded-lg text-center">
            <p className="text-sm text-text-secondary">You will join as</p>
            <p className="font-display font-bold text-brand">
              {getInviteRoleLabel(inviteInfo.role)}
            </p>
          </div>
        )}

        <form onSubmit={handleInfoSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {errors.general}
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
            error={errors.email}
          />

          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            autoComplete="name"
            error={errors.name}
          />

          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              error={errors.password}
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
            error={errors.passwordConfirm}
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
          <button
            type="button"
            onClick={handleBackToCode}
            className="text-brand hover:underline"
          >
            Use another code
          </button>
        </p>
      </div>
    </>
  )
}

function InvitePageFallback() {
  return (
    <Card padding="lg">
      <div className="flex flex-col items-center py-8">
        <Spinner className="spinner-lg" />
        <p className="text-text-secondary mt-4">Loading...</p>
      </div>
    </Card>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<InvitePageFallback />}>
      <InvitePageContent />
    </Suspense>
  )
}
