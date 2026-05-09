'use client'

import { useIntl } from 'react-intl'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { Check, AlertOctagon } from 'lucide-react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import { AuthField } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError, apiRequest } from '@/lib/api-client'
import { fetchDeduped } from '@/lib/fetch'

export interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
}

interface OwnedBusiness {
  id: string
  name: string
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onExitComplete,
}: DeleteAccountModalProps) {
  const intl = useIntl()
  const router = useRouter()
  const { user, logout } = useAuth()
  const translateApiMessage = useApiMessage()

  const [isCheckLoading, setIsCheckLoading] = useState(true)
  const [ownedBusinesses, setOwnedBusinesses] = useState<OwnedBusiness[]>([])
  const [confirmEmail, setConfirmEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  // Pre-flight check: fetch the user's business memberships when the modal
  // opens, so we can show the blocked state instantly without waiting for
  // the user to click delete.
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    async function checkOwnedBusinesses() {
      setIsCheckLoading(true)
      setError('')
      try {
        const response = await fetchDeduped('/api/businesses/list')
        const data = await response.json()
        if (cancelled) return
        if (response.ok && Array.isArray(data.businesses)) {
          const owned = data.businesses
            .filter((b: { isOwner?: boolean }) => b.isOwner)
            .map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }))
          setOwnedBusinesses(owned)
        } else {
          setOwnedBusinesses([])
        }
      } catch (err) {
        if (cancelled) return
        console.error('Pre-flight check error:', err)
        setOwnedBusinesses([])
      } finally {
        if (!cancelled) {
          setIsCheckLoading(false)
        }
      }
    }

    checkOwnedBusinesses()

    return () => {
      cancelled = true
    }
  }, [isOpen])

  // Reset all state after the modal has finished closing
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setConfirmEmail('')
        setCurrentPassword('')
        setIsDeleting(false)
        setError('')
        onExitComplete?.()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onExitComplete])

  const isBlocked = ownedBusinesses.length > 0
  const emailMatches =
    !!user && confirmEmail.trim().toLowerCase() === user.email.toLowerCase()
  const passwordEntered = currentPassword.length > 0
  const canDelete =
    !isCheckLoading && !isBlocked && emailMatches && passwordEntered && !isDeleting

  const handleDelete = useCallback(async () => {
    if (!canDelete || !user) return
    setIsDeleting(true)
    setError('')
    try {
      await apiRequest('/api/auth/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmEmail: confirmEmail.trim(),
          currentPassword,
        }),
      })
      // Success: clear local auth cache and redirect to register.
      await logout()
      router.push('/register')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.envelope
            ? translateApiMessage(err.envelope)
            : intl.formatMessage({ id: 'common.error' }),
        )
        // 409 means the server-side check found owned businesses we missed
        // (race condition: a transfer landed between pre-flight and submit).
        // Reload the owned list so the UI can show the blocked state.
        const data = err.data as { ownedBusinesses?: OwnedBusiness[] }
        if (err.statusCode === 409 && Array.isArray(data.ownedBusinesses)) {
          setOwnedBusinesses(data.ownedBusinesses)
        }
        return
      }
      console.error('Delete account error:', err)
      setError(intl.formatMessage({ id: 'common.error' }))
    } finally {
      setIsDeleting(false)
    }
  }, [canDelete, user, confirmEmail, currentPassword, logout, router, translateApiMessage, intl])

  const confirmTitle = useMemo(() => {
    const full = intl.formatMessage({ id: 'account.delete_confirm_hero_title' })
    const emphasis = intl.formatMessage({ id: 'account.delete_confirm_hero_title_emphasis' })
    const idx = full.indexOf(emphasis)
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [intl])

  const blockedTitle = useMemo(() => {
    const full = intl.formatMessage({ id: 'account.delete_blocked_hero_title' })
    const emphasis = intl.formatMessage({ id: 'account.delete_blocked_hero_title_emphasis' })
    const idx = full.indexOf(emphasis)
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [intl])

  const footer = isBlocked ? (
    <IonButton
      fill="outline"
      expand="block"
      onClick={onClose}
      className="flex-1"
    >
      {intl.formatMessage({ id: 'common.close' })}
    </IonButton>
  ) : (
    <IonButton
      color="danger"
      expand="block"
      onClick={handleDelete}
      disabled={!canDelete}
      className="flex-1"
    >
      {isDeleting ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'account.delete_button' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'account.delete_modal_title' })}
      footer={isCheckLoading ? undefined : footer}
      noSwipeDismiss
    >
      {error && <div className="modal-error">{error}</div>}

      {isCheckLoading ? (
        <div className="delete-account__loading">
          <IonSpinner name="crescent" />
          <p className="delete-account__loading-label">
            {intl.formatMessage({ id: 'account.delete_loading_check' })}
          </p>
        </div>
      ) : isBlocked ? (
        <BlockedView ownedBusinesses={ownedBusinesses} title={blockedTitle} />
      ) : (
        <ConfirmView
          email={user?.email ?? ''}
          confirmEmail={confirmEmail}
          onConfirmEmailChange={setConfirmEmail}
          currentPassword={currentPassword}
          onCurrentPasswordChange={setCurrentPassword}
          emailMatches={emailMatches}
          passwordEntered={passwordEntered}
          title={confirmTitle}
        />
      )}
    </ModalShell>
  )
}

// ============================================================================
// CONFIRM VIEW
// ============================================================================

interface ConfirmViewProps {
  email: string
  confirmEmail: string
  onConfirmEmailChange: (value: string) => void
  currentPassword: string
  onCurrentPasswordChange: (value: string) => void
  emailMatches: boolean
  passwordEntered: boolean
  title: React.ReactNode
}

function ConfirmView({
  email,
  confirmEmail,
  onConfirmEmailChange,
  currentPassword,
  onCurrentPasswordChange,
  emailMatches,
  passwordEntered,
  title,
}: ConfirmViewProps) {
  const intl = useIntl()

  const checks = [
    {
      key: 'email',
      label: intl.formatMessage({ id: 'account.delete_check_email' }),
      met: emailMatches,
    },
    {
      key: 'password',
      label: intl.formatMessage({ id: 'account.delete_check_password' }),
      met: passwordEntered,
    },
  ]

  return (
    <>
      <header className="modal-hero delete-account__hero">
        <div className="modal-hero__eyebrow modal-hero__eyebrow--danger">
          <AlertOctagon size={12} />
          {intl.formatMessage({ id: 'account.delete_hero_eyebrow' })}
        </div>
        <h1 className="modal-hero__title modal-hero__title--danger">{title}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'account.delete_hero_subtitle' })}
        </p>
      </header>

      <div className="delete-account__warning">
        <div className="delete-account__warning-eyebrow">
          {intl.formatMessage({ id: 'account.delete_warning_eyebrow' })}
        </div>
        <ul className="delete-account__warning-list">
          <li className="delete-account__warning-item">
            {intl.formatMessage({ id: 'account.delete_warning_item_profile' })}
          </li>
          <li className="delete-account__warning-item">
            {intl.formatMessage({ id: 'account.delete_warning_item_memberships' })}
          </li>
          <li className="delete-account__warning-item">
            {intl.formatMessage({ id: 'account.delete_warning_item_invites' })}
          </li>
          <li className="delete-account__warning-item">
            {intl.formatMessage({ id: 'account.delete_warning_item_irreversible' })}
          </li>
        </ul>
      </div>

      <div className="delete-account__target">
        <span className="delete-account__target-eyebrow">
          {intl.formatMessage({ id: 'account.delete_target_eyebrow' })}
        </span>
        <span className="delete-account__target-value">{email}</span>
      </div>

      <div className="delete-account__form">
        <AuthField
          label={intl.formatMessage({ id: 'account.delete_confirm_label' })}
          type="email"
          value={confirmEmail}
          onChange={(e) => onConfirmEmailChange(e.target.value)}
          placeholder={email}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required
        />
        <AuthField
          label={intl.formatMessage({ id: 'account.delete_password_label' })}
          type="password"
          value={currentPassword}
          onChange={(e) => onCurrentPasswordChange(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <div className="delete-account__checks">
        <div className="delete-account__checks-eyebrow">
          {intl.formatMessage({ id: 'account.delete_checks_eyebrow' })}
        </div>
        <ul className="delete-account__check-list">
          {checks.map((check) => (
            <li
              key={check.key}
              className={`delete-account__check${check.met ? ' is-met' : ''}`}
            >
              <span className="delete-account__check-marker" aria-hidden="true">
                <Check />
              </span>
              {check.label}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

// ============================================================================
// BLOCKED VIEW
// ============================================================================

function BlockedView({
  ownedBusinesses,
  title,
}: {
  ownedBusinesses: OwnedBusiness[]
  title: React.ReactNode
}) {
  const intl = useIntl()

  return (
    <>
      <header className="modal-hero delete-account__hero">
        <div className="modal-hero__eyebrow modal-hero__eyebrow--danger">
          <AlertOctagon size={12} />
          {intl.formatMessage({ id: 'account.delete_blocked_eyebrow' })}
        </div>
        <h1 className="modal-hero__title modal-hero__title--danger">{title}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'account.delete_blocked_description' })}
        </p>
      </header>

      <div className="delete-account__blocked-card">
        <div className="delete-account__blocked-eyebrow">
          <span>{intl.formatMessage({ id: 'account.delete_blocked_owned_eyebrow' })}</span>
          <span className="delete-account__blocked-eyebrow-count">
            {ownedBusinesses.length.toString().padStart(2, '0')}
          </span>
        </div>
        <ul className="delete-account__owned-list">
          {ownedBusinesses.map((b) => (
            <li key={b.id} className="delete-account__owned-item">
              <span className="delete-account__owned-name">{b.name}</span>
              <span className="delete-account__owned-tag">
                {intl.formatMessage({ id: 'account.delete_blocked_owner_tag' })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
