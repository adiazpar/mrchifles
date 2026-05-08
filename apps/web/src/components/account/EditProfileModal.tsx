'use client'

import { useIntl } from 'react-intl';
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import { IonButton, IonInput, IonItem, IonList, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useAuth } from '@/contexts/auth-context'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError, apiPatch } from '@/lib/api-client'
import { fileToBase64, MAX_UPLOAD_SIZE } from '@/lib/storage-client'
import { getUserInitials } from '@kasero/shared/auth'

export interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
}

export function EditProfileModal({ isOpen, onClose, onExitComplete }: EditProfileModalProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const { user, refreshUser } = useAuth()
  const translateApiMessage = useApiMessage()

  const [name, setName] = useState(user?.name ?? '')
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step state: 'form' → 'success'
  const [step, setStep] = useState<'form' | 'success'>('form')

  // Sync local state when the user loads or after refreshUser()
  useEffect(() => {
    if (user) {
      setName(user.name)
      setAvatar(user.avatar ?? null)
    }
  }, [user])

  // Reset to form step after the dismissal animation plays so the form
  // doesn't flash back into view while the modal is still sliding away.
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setStep('form')
        setError('')
        setIsSaving(false)
        onExitComplete?.()
      }, 250)
      return () => clearTimeout(t)
    }
  }, [isOpen, onExitComplete])

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
        setError(t.formatMessage({
          id: 'account.profile_avatar_invalid_type'
        }))
        return
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        setError(t.formatMessage({
          id: 'account.profile_avatar_too_large'
        }))
        return
      }
      try {
        const dataUrl = await fileToBase64(file)
        setAvatar(dataUrl)
        setError('')
      } catch (err) {
        console.error('Avatar read error:', err)
        setError(tCommon.formatMessage({
          id: 'common.error'
        }))
      }
    },
    [t, tCommon],
  )

  const handleRemoveAvatar = () => {
    setAvatar(null)
    setError('')
  }

  const handleSave = useCallback(async () => {
    if (!isValid || !hasChanges || isSaving) return
    setIsSaving(true)
    setError('')
    try {
      await apiPatch('/api/auth/profile', { name: name.trim(), avatar })
      await refreshUser()
      setStep('success')
      setTimeout(onClose, 1500)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.envelope
            ? translateApiMessage(err.envelope)
            : tCommon.formatMessage({
            id: 'common.error'
          }),
        )
        return
      }
      console.error('Profile save error:', err)
      setError(tCommon.formatMessage({
        id: 'common.error'
      }))
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
    onClose,
  ])

  const saveButton = (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={!isValid || !hasChanges || isSaving}
      className="flex-1"
    >
      {isSaving ? <IonSpinner name="crescent" /> : tCommon.formatMessage({ id: 'common.save' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'form' ? t.formatMessage({ id: 'account.profile_modal_title' }) : ''}
      footer={step === 'form' ? saveButton : undefined}
    >
      {step === 'form' && (
        <>
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
                  style={{ backgroundColor: 'var(--color-brand-subtle)', color: 'var(--color-text-brand)' }}
                >
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    (<img src={avatar} alt="" className="w-24 h-24 object-cover" />)
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
                    aria-label={t.formatMessage({
                      id: 'account.profile_avatar_remove'
                    })}
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
                {avatar ? t.formatMessage({
                  id: 'account.profile_avatar_change'
                }) : t.formatMessage({
                  id: 'account.profile_avatar_upload'
                })}
              </span>
            </button>
            <p className="text-xs text-text-tertiary text-center mt-2">{t.formatMessage({
              id: 'account.profile_avatar_hint'
            })}</p>
          </div>

          {/* Name + Email */}
          <IonList lines="full" inset>
            <IonItem>
              <IonInput
                label={t.formatMessage({ id: 'account.profile_name_label' })}
                labelPlacement="floating"
                value={name}
                onIonInput={(e) => setName(e.detail.value ?? '')}
                autocomplete="name"
                required
              />
            </IonItem>
            <IonItem>
              <IonInput
                label={t.formatMessage({ id: 'account.profile_email_label' })}
                labelPlacement="floating"
                value={user?.email ?? ''}
                disabled
                readonly
              />
            </IonItem>
          </IonList>
        </>
      )}

      {step === 'success' && (
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
            {t.formatMessage({ id: 'account.profile_saved_heading' })}
          </p>
          <p className="text-sm text-text-tertiary mt-1">
            {t.formatMessage({ id: 'account.profile_saved_description' })}
          </p>
        </div>
      )}
    </ModalShell>
  )
}
