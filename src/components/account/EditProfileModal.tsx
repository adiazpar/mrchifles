'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Trash2 } from 'lucide-react'
import { Modal, Input, Spinner, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useAuth } from '@/contexts/auth-context'
import { useApiMessage } from '@/hooks/useApiMessage'
import { hasMessageEnvelope } from '@/lib/api-messages'
import { fileToBase64, validateIconSize } from '@/lib/storage'
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
      try {
        const dataUrl = await fileToBase64(file)
        const { valid } = validateIconSize(dataUrl)
        if (!valid) {
          setError(t('profile_avatar_too_large'))
          return
        }
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
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(
          hasMessageEnvelope(data)
            ? translateApiMessage(data)
            : tCommon('error'),
        )
        return false
      }
      await refreshUser()
      return true
    } catch (err) {
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
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-24 h-24 rounded-full bg-brand-subtle flex items-center justify-center overflow-hidden">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="w-24 h-24 object-cover" />
              ) : (
                <span className="text-2xl font-bold text-brand">
                  {getUserInitials(name || user?.name || '')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                <Upload className="w-4 h-4" />
                {avatar ? t('profile_avatar_change') : t('profile_avatar_upload')}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="btn btn-ghost btn-sm text-error"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('profile_avatar_remove')}
                </button>
              )}
            </div>
            <p className="text-xs text-text-tertiary">{t('profile_avatar_hint')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFilePick}
            />
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
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {t('profile_email_label')}
            </label>
            <div className="px-3 py-2 bg-bg-muted rounded-lg text-text-primary text-base">
              {user?.email}
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {t('profile_email_hint')}
            </p>
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
// SAVE BUTTON (uses useMorphingModal for step navigation)
// ============================================================================

interface SaveProfileButtonProps {
  isValid: boolean
  hasChanges: boolean
  isSaving: boolean
  onSave: () => Promise<boolean>
}

function SaveProfileButton({ isValid, hasChanges, isSaving, onSave }: SaveProfileButtonProps) {
  const tCommon = useTranslations('common')
  const { goToStep } = useMorphingModal()

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
