'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { Modal, Input, Spinner } from '@/components/ui'
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
  const t = useTranslations('account')
  const tCommon = useTranslations('common')
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

  const handleExitComplete = useCallback(() => {
    setConfirmEmail('')
    setCurrentPassword('')
    setIsDeleting(false)
    setError('')
    onExitComplete?.()
  }, [onExitComplete])

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
            : tCommon('error'),
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
      setError(tCommon('error'))
    } finally {
      setIsDeleting(false)
    }
  }, [canDelete, user, confirmEmail, currentPassword, logout, router, translateApiMessage, tCommon])

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={handleExitComplete}>
      <Modal.Step title={t('delete_modal_title')}>
        <Modal.Item>
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">
              {error}
            </div>
          )}

          {isCheckLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Spinner className="spinner-lg" />
              <p className="text-sm text-text-tertiary">
                {t('delete_loading_check')}
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
        </Modal.Item>
        <Modal.Footer>
          {isBlocked ? (
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={onClose}
            >
              {tCommon('close')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-danger flex-1"
              onClick={handleDelete}
              disabled={!canDelete}
            >
              {isDeleting ? <Spinner /> : t('delete_button')}
            </button>
          )}
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

// ============================================================================
// BLOCKED STATE
// ============================================================================

function BlockedState({ ownedBusinesses }: { ownedBusinesses: OwnedBusiness[] }) {
  const t = useTranslations('account')

  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className="w-14 h-14 rounded-full bg-error-subtle flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-error" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">
        {t('delete_blocked_heading')}
      </h2>
      <p className="text-sm text-text-secondary mt-2 max-w-sm">
        {t('delete_blocked_description')}
      </p>

      <div className="w-full mt-6 text-left">
        <p className="text-xs uppercase tracking-wider text-text-tertiary mb-2">
          {t('delete_blocked_owned_label', { count: ownedBusinesses.length })}
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
  const t = useTranslations('account')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center text-center py-2 mb-4">
        <div className="w-14 h-14 rounded-full bg-error-subtle flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-error" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          {t('delete_warning_heading')}
        </h2>
        <p className="text-sm text-text-secondary mt-2">
          {t('delete_warning_description')}
        </p>
      </div>

      <Input
        label={t('delete_confirm_label')}
        value={confirmEmail}
        onChange={(e) => onConfirmEmailChange(e.target.value)}
        placeholder={email || t('delete_confirm_placeholder')}
        autoComplete="off"
        type="email"
        required
      />

      <Input
        label={t('delete_password_label')}
        value={currentPassword}
        onChange={(e) => onCurrentPasswordChange(e.target.value)}
        placeholder={t('delete_password_placeholder')}
        autoComplete="current-password"
        type="password"
        required
      />
    </div>
  )
}
