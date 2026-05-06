'use client'

import Image from '@/lib/Image'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, X } from 'lucide-react'
import { Modal, Spinner } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'
import { BUSINESS_TYPE_ICONS } from '@/components/businesses/shared'
import { MAX_UPLOAD_SIZE } from '@/lib/storage-client'

interface Props { isOpen: boolean; onClose: () => void }

export function EditLogoModal({ isOpen, onClose }: Props) {
  const t = useTranslations('manage')
  const tCreate = useTranslations('createBusiness')
  const tCommon = useTranslations('common')
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

  // Revoke object URLs when replaced or on unmount to avoid leaking blobs
  useEffect(() => {
    const url = pendingPreview
    return () => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
  }, [pendingPreview])

  const handleExitComplete = () => {
    setPendingFile(null)
    setPendingPreview(null)
    setShouldRemove(false)
    setUploadError(null)
    reset()
  }

  const currentIcon = business?.icon ?? null
  const displayPreview = pendingPreview ?? (shouldRemove ? null : (currentIcon?.startsWith('data:image') ? currentIcon : null))
  const TypeIcon = business?.type ? BUSINESS_TYPE_ICONS[business.type] : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError(tCreate('logo_invalid_type'))
      return
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setUploadError(tCreate('logo_too_large'))
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={handleExitComplete}>
      <Modal.Step title={t('edit_logo_title')} hideBackButton>
        <Modal.Item>
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-bg-base flex items-center justify-center overflow-hidden">
                {displayPreview ? (
                  <Image
                    src={displayPreview}
                    alt="Business logo"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : TypeIcon ? (
                  <TypeIcon className="w-14 h-14 text-brand" />
                ) : (
                  <span className="text-5xl">{business?.icon ?? ''}</span>
                )}
              </div>
              {displayPreview && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center shadow-md hover:bg-error-hover transition-colors"
                  aria-label={tCreate('logo_remove')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </Modal.Item>
        <Modal.Item>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-brand hover:bg-brand-subtle transition-all text-text-secondary hover:text-brand"
          >
            <Upload className="w-5 h-5" />
            <span className="text-sm font-medium">
              {displayPreview ? tCreate('logo_change_button') : tCreate('logo_upload_button')}
            </span>
          </button>
          {uploadError ? (
            <p className="text-xs text-error text-center mt-2">{uploadError}</p>
          ) : (
            <p className="text-xs text-text-tertiary text-center mt-2">{tCreate('logo_size_hint')}</p>
          )}
        </Modal.Item>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          </Modal.Item>
        )}
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || !hasChanges}
            className="btn btn-primary flex-1"
          >
            {isSubmitting ? <Spinner size="sm" /> : t('save')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
