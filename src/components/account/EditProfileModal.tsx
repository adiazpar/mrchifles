'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, X } from 'lucide-react'
import { Modal, Input, Spinner, useModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useAuth } from '@/contexts/auth-context'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError, apiPatch } from '@/lib/api-client'
import { fileToBase64, MAX_UPLOAD_SIZE } from '@/lib/storage-client'
import { getUserInitials } from '@/lib/auth'

export interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
}

export function EditProfileModal({ isOpen, onClose, onExitComplete }: EditProfileModalProps) {
  const t = useTranslations('account')
  const tCommon = useTranslations('common')
  const { user, refreshUser } = useAuth()
  const translateApiMessage = useApiMessage()

  // Form state lives in the modal component (not in a sub-component) so
  // Modal.Step / Modal.Footer stay direct children of <Modal>, per the
  // modal system's "direct children only" rule.
  const [name, setName] = useState(user?.name ?? '')
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync local state when the user loads or after refreshUser()
  useEffect(() => {
    if (user) {
      setName(user.name)
      setAvatar(user.avatar ?? null)
    }
  }, [user])

  const hasChanges =
    user !== null &&
    (name.trim() !== user.name || (avatar ?? null) !== (user.avatar ?? null))
  const isValid = name.trim().length >= 2

  const handleFilePick = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      event.target.value = ''

      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
        setError(t('profile_avatar_invalid_type'))
        return
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        setError(t('profile_avatar_too_large'))
        return
      }
      try {
        const dataUrl = await fileToBase64(file)
        setAvatar(dataUrl)
        setError('')
      } catch (err) {
        console.error('Avatar read error:', err)
        setError(tCommon('error'))
      }
    },
    [t, tCommon],
  )

  const handleRemoveAvatar = () => {
    setAvatar(null)
    setError('')
  }

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!isValid || !hasChanges || isSaving) return false
    setIsSaving(true)
    setError('')
    try {
      await apiPatch('/api/auth/profile', { name: name.trim(), avatar })
      await refreshUser()
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.envelope
            ? translateApiMessage(err.envelope)
            : tCommon('error'),
        )
        return false
      }
      console.error('Profile save error:', err)
      setError(tCommon('error'))
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    isValid,
    hasChanges,
    isSaving,
    name,
    avatar,
    refreshUser,
    translateApiMessage,
    tCommon,
  ])

  const handleExitComplete = useCallback(() => {
    setError('')
    setIsSaving(false)
    onExitComplete?.()
  }, [onExitComplete])

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={handleExitComplete}>
      <Modal.Step title={t('profile_modal_title')}>
        <Modal.Item>
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Avatar preview + actions */}
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: 'var(--brand-100)', color: 'var(--brand-700)' }}
                >
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="w-24 h-24 object-cover" />
                  ) : (
                    <span className="text-3xl font-semibold">
                      {getUserInitials(name || user?.name || '')}
                    </span>
                  )}
                </div>
                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow-md hover:bg-error-hover transition-colors"
                    aria-label={t('profile_avatar_remove')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFilePick}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-brand hover:bg-brand-subtle transition-all text-text-secondary hover:text-brand"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm font-medium">
                {avatar ? t('profile_avatar_change') : t('profile_avatar_upload')}
              </span>
            </button>
            <p className="text-xs text-text-tertiary text-center mt-2">{t('profile_avatar_hint')}</p>
          </div>

          {/* Name */}
          <Input
            label={t('profile_name_label')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('profile_name_placeholder')}
            autoComplete="name"
            required
          />

          {/* Email (read-only) */}
          <div className="mt-4">
            <Input
              label={t('profile_email_label')}
              value={user?.email ?? ''}
              disabled
              readOnly
            />
          </div>
        </Modal.Item>
        <Modal.Footer>
          <SaveProfileButton
            isValid={isValid}
            hasChanges={hasChanges}
            isSaving={isSaving}
            onSave={handleSave}
          />
        </Modal.Footer>
      </Modal.Step>

      <Modal.Step title={t('profile_saved_heading')} hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={300}
                style={{ width: 160, height: 160 }}
              />
            </div>
            <p className="text-lg font-semibold text-text-primary mt-4">
              {t('profile_saved_heading')}
            </p>
            <p className="text-sm text-text-tertiary mt-1">
              {t('profile_saved_description')}
            </p>
          </div>
        </Modal.Item>
        <Modal.Footer>
          <button type="button" className="btn btn-primary flex-1" onClick={onClose}>
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

// ============================================================================
// SAVE BUTTON (uses useModal for step navigation)
// ============================================================================

interface SaveProfileButtonProps {
  isValid: boolean
  hasChanges: boolean
  isSaving: boolean
  onSave: () => Promise<boolean>
}

function SaveProfileButton({ isValid, hasChanges, isSaving, onSave }: SaveProfileButtonProps) {
  const tCommon = useTranslations('common')
  const { goToStep } = useModal()

  const handleClick = async () => {
    const ok = await onSave()
    if (ok) {
      goToStep(1)
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary flex-1"
      onClick={handleClick}
      disabled={!isValid || !hasChanges || isSaving}
    >
      {isSaving ? <Spinner /> : tCommon('save')}
    </button>
  )
}
