'use client'

import { useIntl } from 'react-intl';
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { AlertTriangle } from 'lucide-react'
import { IonInput, IonItem, IonList } from '@ionic/react'
import { ModalShell, Spinner } from '@/components/ui'
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
  const t = useIntl()
  const tCommon = useIntl()
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
            : tCommon.formatMessage({ id: 'common.error' }),
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
      setError(tCommon.formatMessage({ id: 'common.error' }))
    } finally {
      setIsDeleting(false)
    }
  }, [canDelete, user, confirmEmail, currentPassword, logout, router, translateApiMessage, tCommon])

  const footer = isBlocked ? (
    <button
      type="button"
      className="btn btn-secondary flex-1"
      onClick={onClose}
    >
      {tCommon.formatMessage({ id: 'common.close' })}
    </button>
  ) : (
    <button
      type="button"
      className="btn btn-danger flex-1"
      onClick={handleDelete}
      disabled={!canDelete}
    >
      {isDeleting ? <Spinner /> : t.formatMessage({ id: 'account.delete_button' })}
    </button>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.formatMessage({ id: 'account.delete_modal_title' })}
      footer={isCheckLoading ? undefined : footer}
    >
      <div className="px-4 pt-4 pb-4">
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">
            {error}
          </div>
        )}

        {isCheckLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Spinner className="spinner-lg" />
            <p className="text-sm text-text-tertiary">
              {t.formatMessage({ id: 'account.delete_loading_check' })}
            </p>
          </div>
        ) : isBlocked ? (
          <BlockedState ownedBusinesses={ownedBusinesses} />
        ) : (
          <ConfirmState
            email={user?.email ?? ''}
            confirmEmail={confirmEmail}
            onConfirmEmailChange={setConfirmEmail}
            currentPassword={currentPassword}
            onCurrentPasswordChange={setCurrentPassword}
          />
        )}
      </div>
    </ModalShell>
  )
}

// ============================================================================
// BLOCKED STATE
// ============================================================================

function BlockedState({ ownedBusinesses }: { ownedBusinesses: OwnedBusiness[] }) {
  const t = useIntl()

  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className="w-14 h-14 rounded-full bg-error-subtle flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-error" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">
        {t.formatMessage({ id: 'account.delete_blocked_heading' })}
      </h2>
      <p className="text-sm text-text-secondary mt-2 max-w-sm">
        {t.formatMessage({ id: 'account.delete_blocked_description' })}
      </p>
      <div className="w-full mt-6 text-left">
        <p className="text-xs uppercase tracking-wider text-text-tertiary mb-2">
          {t.formatMessage(
            { id: 'account.delete_blocked_owned_label' },
            { count: ownedBusinesses.length }
          )}
        </p>
        <ul className="space-y-1">
          {ownedBusinesses.map((b) => (
            <li
              key={b.id}
              className="px-3 py-2 bg-bg-muted rounded-lg text-sm text-text-primary"
            >
              {b.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// CONFIRM STATE
// ============================================================================

interface ConfirmStateProps {
  email: string
  confirmEmail: string
  onConfirmEmailChange: (value: string) => void
  currentPassword: string
  onCurrentPasswordChange: (value: string) => void
}

function ConfirmState({
  email,
  confirmEmail,
  onConfirmEmailChange,
  currentPassword,
  onCurrentPasswordChange,
}: ConfirmStateProps) {
  const t = useIntl()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center text-center py-2 mb-4">
        <div className="w-14 h-14 rounded-full bg-error-subtle flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-error" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          {t.formatMessage({ id: 'account.delete_warning_heading' })}
        </h2>
        <p className="text-sm text-text-secondary mt-2">
          {t.formatMessage({ id: 'account.delete_warning_description' })}
        </p>
      </div>
      <IonList lines="full" inset>
        <IonItem>
          <IonInput
            type="email"
            label={t.formatMessage({ id: 'account.delete_confirm_label' })}
            labelPlacement="floating"
            value={confirmEmail}
            onIonInput={(e) => onConfirmEmailChange(e.detail.value ?? '')}
            autocomplete="off"
            required
          />
        </IonItem>
        <IonItem>
          <IonInput
            type="password"
            label={t.formatMessage({ id: 'account.delete_password_label' })}
            labelPlacement="floating"
            value={currentPassword}
            onIonInput={(e) => onCurrentPasswordChange(e.detail.value ?? '')}
            autocomplete="current-password"
            required
          />
        </IonItem>
      </IonList>
    </div>
  )
}
