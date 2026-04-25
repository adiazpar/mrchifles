'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input, Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { APP_VERSION } from '@/lib/version'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const { register } = useAuth()
  const { playEntry } = useAuthGate()
  const { setPendingHref } = usePageTransition()

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

      if (password !== passwordConfirm) {
        setError(t('passwords_dont_match'))
        return
      }

      if (password.length < 8) {
        setError(t('password_too_short'))
        return
      }

      setIsLoading(true)

      try {
        const result = await register(email, password, name)

        if (!result.success) {
          setError(result.error ?? '')
          setIsLoading(false)
          return
        }

        // Play entry animation; playEntry handles router navigation and
        // resolves when the overlay has fully faded out. Don't clear
        // isLoading on success — see login page for reasoning.
        await playEntry('/')
      } catch {
        setError(t('connection_error'))
        setIsLoading(false)
      }
    },
    [email, password, passwordConfirm, name, register, playEntry, t]
  )

  const handleGoToLogin = useCallback(() => {
    setPendingHref('/login')
    router.push('/login')
  }, [router, setPendingHref])

  return (
    <>
      <form onSubmit={handleSubmit} className="auth-main">
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {error}
          </div>
        )}

        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name_placeholder')}
          autoComplete="name"
          autoFocus
          required
        />

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email_placeholder')}
          autoComplete="email"
          required
        />

        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('password_new_placeholder')}
          autoComplete="new-password"
          required
        />

        <Input
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder={t('password_confirm_placeholder')}
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
              <span className="sr-only">{t('creating_account')}</span>
            </>
          ) : (
            t('register_button')
          )}
        </button>
      </form>

      <div className="auth-page-footer">
        <button
          type="button"
          onClick={handleGoToLogin}
          className="btn btn-secondary btn-lg w-full"
        >
          {t('login_button')}
        </button>
        <p className="auth-version">
          {t('version_label', { version: APP_VERSION })}
        </p>
      </div>
    </>
  )
}
