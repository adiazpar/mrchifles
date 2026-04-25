'use client'

import { Suspense, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input, Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { APP_VERSION } from '@/lib/version'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/home'
  const { login } = useAuth()
  const { playEntry } = useAuthGate()
  const { setPendingHref } = usePageTransition()
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')

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

  const handleGoToRegister = useCallback(() => {
    setPendingHref('/register')
    router.push('/register')
  }, [router, setPendingHref])

  return (
    <>
      <form onSubmit={handleSubmit} className="auth-main">
        <h1 className="auth-heading">{t('heading_login')}</h1>

        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {error}
          </div>
        )}

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email_placeholder')}
          autoComplete="email"
          autoFocus
          required
        />

        <Input
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
            t('continue_button')
          )}
        </button>
      </form>

      <div className="auth-page-footer">
        <div className="auth-or-divider">{tCommon('or')}</div>
        <button
          type="button"
          onClick={handleGoToRegister}
          className="btn btn-secondary btn-lg w-full"
        >
          {t('register_button')}
        </button>
        <p className="auth-version">
          {t('version_label', { version: APP_VERSION })}
        </p>
      </div>
    </>
  )
}

function LoginPageFallback() {
  const tCommon = useTranslations('common')

  return (
    <>
      <div className="auth-main">
        <div className="flex flex-col items-center py-8">
          <Spinner className="spinner-lg" />
          <p className="text-text-secondary mt-4">{tCommon('loading')}</p>
        </div>
      </div>
      <div className="auth-page-footer" />
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
