'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Input, Card, Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { usePageTransition } from '@/contexts/page-transition-context'

export default function RegisterPage() {
  const t = useTranslations('auth')
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

      // Validate passwords match
      if (password !== passwordConfirm) {
        setError(t('passwords_dont_match'))
        return
      }

      // Validate password length
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

  return (
    <>
      <Card padding="lg">
        <h2 className="text-xl font-display font-bold mb-1">{t('register_title')}</h2>
        <p className="text-sm text-text-tertiary mb-6">
          {t('register_subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          <Input
            label={t('name_label')}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('name_placeholder')}
            autoComplete="name"
            autoFocus
            required
          />

          <Input
            label={t('email_label')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('email_placeholder')}
            autoComplete="email"
            required
          />

          <div>
            <Input
              label={t('password_label')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password_new_placeholder')}
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-text-tertiary mt-1">
              {t('password_hint')}
            </p>
          </div>

          <Input
            label={t('password_confirm_label')}
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
      </Card>

      <div className="auth-footer">
        <p className="auth-footer-link">
          <span className="text-text-tertiary">{t('have_account_prefix')} </span>
          <Link
            href="/login"
            onClick={() => setPendingHref('/login')}
            className="text-brand hover:underline"
          >
            {t('login_link')}
          </Link>
        </p>
      </div>
    </>
  )
}
