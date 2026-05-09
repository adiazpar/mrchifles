'use client'

import { useIntl } from 'react-intl'
import Image from '@/lib/Image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'
import { BUSINESS_TYPE_ICONS } from '@/components/businesses/shared'
import { MAX_UPLOAD_SIZE } from '@/lib/storage-client'

interface Props { isOpen: boolean; onClose: () => void }

export function EditLogoModal({ isOpen, onClose }: Props) {
  const intl = useIntl()
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [shouldRemove, setShouldRemove] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setPendingFile(null)
      setPendingPreview(null)
      setShouldRemove(false)
      setUploadError(null)
    }
  }, [isOpen])

  // Revoke object URLs when replaced or on unmount.
  useEffect(() => {
    const url = pendingPreview
    return () => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
  }, [pendingPreview])

  // Reset all local state after the dismissal animation completes.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setPendingFile(null)
        setPendingPreview(null)
        setShouldRemove(false)
        setUploadError(null)
        reset()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, reset])

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'manage.edit_logo_hero_title' })
    const emphasis = intl.formatMessage({ id: 'manage.edit_logo_hero_title_emphasis' })
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

  const currentIcon = business?.icon ?? null
  const displayPreview =
    pendingPreview ?? (shouldRemove ? null : (currentIcon?.startsWith('data:image') ? currentIcon : null))
  const TypeIcon = business?.type ? BUSINESS_TYPE_ICONS[business.type] : null
  const fallbackEmoji = !TypeIcon && business?.icon && !business.icon.startsWith('data:image')
    ? business.icon
    : null

  // Status pill above the medallion — Active / Trade fallback / Pending replacement / Pending removal.
  const statusKey: 'active' | 'fallback' | 'pending' | 'remove' = pendingFile
    ? 'pending'
    : shouldRemove
      ? 'remove'
      : displayPreview
        ? 'active'
        : 'fallback'

  const statusText = intl.formatMessage({ id: `manage.edit_logo_status_${statusKey}` })
  const statusModifier =
    statusKey === 'pending' ? ' edit-logo__status--pending'
      : statusKey === 'remove' ? ' edit-logo__status--remove'
        : ''

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError(intl.formatMessage({ id: 'createBusiness.logo_invalid_type' }))
      return
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setUploadError(intl.formatMessage({ id: 'createBusiness.logo_too_large' }))
      return
    }
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
    setShouldRemove(false)
  }

  const handleRemove = () => {
    setPendingFile(null)
    setPendingPreview(null)
    setShouldRemove(true)
  }

  const hasChanges = pendingFile !== null || shouldRemove

  const handleSave = async () => {
    if (!hasChanges) { onClose(); return }
    const ok = await update({
      logoFile: pendingFile,
      removeLogo: shouldRemove,
    })
    if (ok) onClose()
  }

  const footer = (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={isSubmitting || !hasChanges}
      className="flex-1"
    >
      {isSubmitting ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'manage.save' })}
    </IonButton>
  )

  const uploadValue = displayPreview
    ? intl.formatMessage({ id: 'manage.edit_logo_upload_replace' })
    : intl.formatMessage({ id: 'manage.edit_logo_upload_choose' })

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'manage.edit_logo_title' })}
      footer={footer}
      noSwipeDismiss
    >
      {error && <div className="modal-error">{error}</div>}

      <header className="modal-hero edit-logo__hero">
        <div className="modal-hero__eyebrow">
          {intl.formatMessage({ id: 'manage.edit_logo_eyebrow' })}
        </div>
        <h1 className="modal-hero__title">{titleNode}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'manage.edit_logo_hero_subtitle' })}
        </p>
      </header>

      <div className="edit-logo__stage">
        <span className={'edit-logo__status' + statusModifier}>{statusText}</span>

        <div className="edit-logo__medallion">
          <div className="edit-logo__medallion-inner">
            {displayPreview ? (
              <Image
                src={displayPreview}
                alt=""
                width={144}
                height={144}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : TypeIcon ? (
              <span className="edit-logo__fallback">
                <TypeIcon />
              </span>
            ) : fallbackEmoji ? (
              <span className="edit-logo__fallback-emoji">{fallbackEmoji}</span>
            ) : null}
          </div>

          {displayPreview && (
            <button
              type="button"
              onClick={handleRemove}
              className="edit-logo__remove"
              aria-label={intl.formatMessage({ id: 'createBusiness.logo_remove' })}
            >
              <X />
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="edit-logo__upload"
      >
        <span className="edit-logo__upload-icon" aria-hidden="true">
          <Upload />
        </span>
        <span className="edit-logo__upload-body">
          <span className="edit-logo__upload-label">
            {intl.formatMessage({ id: 'manage.edit_logo_upload_label' })}
          </span>
          <span className="edit-logo__upload-value">{uploadValue}</span>
        </span>
      </button>

      <div
        className={
          'manage-edit__note' +
          (uploadError ? ' manage-edit__note--error' : '')
        }
      >
        {uploadError ?? intl.formatMessage({ id: 'manage.edit_logo_size_hint' })}
      </div>
    </ModalShell>
  )
}
