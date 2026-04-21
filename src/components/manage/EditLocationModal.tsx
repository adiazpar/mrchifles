'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, Spinner } from '@/components/ui'
import { LocalePicker } from '@/components/businesses/shared'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'

interface Props { isOpen: boolean; onClose: () => void }

export function EditLocationModal({ isOpen, onClose }: Props) {
  const t = useTranslations('manage')
  const tCommon = useTranslations('common')
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [locale, setLocale] = useState(business?.locale ?? 'en-US')

  useEffect(() => {
    if (isOpen) setLocale(business?.locale ?? 'en-US')
  }, [isOpen, business?.locale])

  const handleExitComplete = () => { reset() }

  const handleSave = async () => {
    if (locale === business?.locale) { onClose(); return }
    const ok = await update({ locale })
    if (ok) onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={handleExitComplete}>
      <Modal.Step title={t('edit_location_title')} hideBackButton>
        <Modal.Item>
          <LocalePicker value={locale} onChange={setLocale} />
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
            disabled={isSubmitting || locale === business?.locale}
            className="btn btn-primary flex-1"
          >
            {isSubmitting ? <Spinner size="sm" /> : t('save')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
