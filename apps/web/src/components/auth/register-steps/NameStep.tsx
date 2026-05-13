import { useCallback } from 'react'
import { useIntl } from 'react-intl'
import { IonButton } from '@ionic/react'
import { useRouter } from '@/lib/next-navigation-shim'
import { AuthLayout } from '../AuthLayout'
import { AuthField } from '../AuthField'
import { APP_VERSION } from '@/lib/version'
import { useRegisterNav } from './RegisterNavContext'

export function NameStep() {
  const intl = useIntl()
  const router = useRouter()
  const { name, setName, goTo } = useRegisterNav()

  const trimmed = name.trim()
  const canAdvance = trimmed.length >= 2

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!canAdvance) return
      setName(trimmed)
      goTo('email')
    },
    [canAdvance, trimmed, setName, goTo],
  )

  const handleGoToLogin = useCallback(() => router.push('/login'), [router])

  const footer = (
    <>
      <div className="auth-divider">
        {intl.formatMessage({ id: 'common.or' })}
      </div>
      <p className="auth-link-row">
        {intl.formatMessage({ id: 'auth.have_account_prefix' })}
        <button type="button" onClick={handleGoToLogin}>
          {intl.formatMessage({ id: 'auth.have_account_link' })}
        </button>
      </p>
      <p className="auth-version">
        {intl.formatMessage({ id: 'auth.version_label' }, { version: APP_VERSION })}
      </p>
    </>
  )

  return (
    <AuthLayout footer={footer}>
      <form data-testid="register-name-form" onSubmit={handleSubmit} className="flex flex-col gap-2.5 w-full">
        <header className="auth-hero auth-step-item auth-step-item--head">
          <h1 className="auth-hero__title">
            {intl.formatMessage({ id: 'auth.register_wizard.step_name_title' })}
          </h1>
          <p className="auth-hero__subtitle">
            {intl.formatMessage({ id: 'auth.register_wizard.step_name_helper' })}
          </p>
        </header>

        <div className="auth-step-item auth-step-item--field">
          <AuthField
            label={intl.formatMessage({ id: 'auth.name_label' })}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoFocus
            required
            minLength={2}
          />
        </div>

        <div className="auth-step-item auth-step-item--footer">
          <IonButton
            expand="block"
            type="submit"
            disabled={!canAdvance}
            className="mt-3"
          >
            {intl.formatMessage({ id: 'auth.register_wizard.continue' })}
          </IonButton>
        </div>
      </form>
    </AuthLayout>
  )
}
