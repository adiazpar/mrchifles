'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { ModalShell } from '@/components/ui/modal-shell'
import { Spinner } from '@/components/ui'
import { BusinessTypeGrid } from '@/components/businesses/shared'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'
import type { BusinessType } from '@/hooks'

interface Props { isOpen: boolean; onClose: () => void }

export function EditTypeModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [selected, setSelected] = useState<BusinessType | null>(business?.type ?? null)

  useEffect(() => {
    if (isOpen) setSelected(business?.type ?? null)
  }, [isOpen, business?.type])

  // Reset hook state (and selection) after the dismissal animation completes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => { setSelected(null); reset() }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, reset])

  const handleSave = async () => {
    if (!selected || selected === business?.type) { onClose(); return }
    const ok = await update({ type: selected })
    if (ok) onClose()
  }

  const footer = (
    <button
      type="button"
      onClick={handleSave}
      disabled={isSubmitting || !selected || selected === business?.type}
      className="btn btn-primary flex-1"
    >
      {isSubmitting ? <Spinner size="sm" /> : t.formatMessage({ id: 'manage.save' })}
    </button>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.formatMessage({ id: 'manage.edit_type_title' })}
      footer={footer}
    >
      <BusinessTypeGrid selected={selected} onSelect={setSelected} />
      {error && (
        <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mt-3">{error}</div>
      )}
    </ModalShell>
  )
}
