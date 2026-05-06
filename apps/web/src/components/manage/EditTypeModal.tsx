'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, Spinner } from '@/components/ui'
import { BusinessTypeGrid } from '@/components/businesses/shared'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'
import type { BusinessType } from '@/hooks'

interface Props { isOpen: boolean; onClose: () => void }

export function EditTypeModal({ isOpen, onClose }: Props) {
  const t = useTranslations('manage')
  const tCommon = useTranslations('common')
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [selected, setSelected] = useState<BusinessType | null>(business?.type ?? null)

  useEffect(() => {
    if (isOpen) setSelected(business?.type ?? null)
  }, [isOpen, business?.type])

  const handleExitComplete = () => { setSelected(null); reset() }

  const handleSave = async () => {
    if (!selected || selected === business?.type) { onClose(); return }
    const ok = await update({ type: selected })
    if (ok) onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={handleExitComplete}>
      <Modal.Step title={t('edit_type_title')} hideBackButton>
        <Modal.Item>
          <BusinessTypeGrid selected={selected} onSelect={setSelected} />
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
            disabled={isSubmitting || !selected || selected === business?.type}
            className="btn btn-primary flex-1"
          >
            {isSubmitting ? <Spinner size="sm" /> : t('save')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
