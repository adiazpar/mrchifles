'use client'

import { Suspense, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Input, Card, Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/home'
  const { login } = useAuth()
  const { playEntry } = useAuthGate()
  const t = useTranslations('auth')

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
          setError(result.error ?? '')
          setIsLoading(false)
          return
        }

        // playEntry handles router.push + router.refresh internally and
        // resolves when the overlay has fully faded out. We intentionally
        // do NOT clear isLoading on success — the form is covered by the
        // overlay during the transition and unmounted afterward.
        await playEntry(redirect)
      } catch {
        setError(t('connection_error'))
        setIsLoading(false)
      }
    },
    [email, password, redirect, login, playEntry, t]
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
            label={t('email_label')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('email_placeholder')}
            autoComplete="email"
            autoFocus
            required
          />

          <Input
            label={t('password_label')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('password_placeholder')}
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
                <span className="sr-only">{t('logging_in')}</span>
              </>
            ) : (
              t('login_button')
            )}
          </button>
        </form>
      </Card>

      <div className="auth-footer">
        <p className="auth-footer-link">
          <span className="text-text-tertiary">{t('no_account_prefix')} </span>
          <Link href="/register" className="text-brand hover:underline">
            {t('sign_up_link')}
          </Link>
        </p>
      </div>
    </>
  )
}

function LoginPageFallback() {
  const tCommon = useTranslations('common')

  return (
    <Card padding="lg">
      <div className="flex flex-col items-center py-8">
        <Spinner className="spinner-lg" />
        <p className="text-text-secondary mt-4">{tCommon('loading')}</p>
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
