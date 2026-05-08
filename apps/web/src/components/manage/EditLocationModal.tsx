'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { ModalShell } from '@/components/ui/modal-shell'
import { Spinner } from '@/components/ui'
import { LocalePicker } from '@/components/businesses/shared'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'

interface Props { isOpen: boolean; onClose: () => void }

export function EditLocationModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [locale, setLocale] = useState(business?.locale ?? 'en-US')

  useEffect(() => {
    if (isOpen) setLocale(business?.locale ?? 'en-US')
  }, [isOpen, business?.locale])

  // Reset hook state after the dismissal animation completes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => { reset() }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, reset])

  const handleSave = async () => {
    if (locale === business?.locale) { onClose(); return }
    const ok = await update({ locale })
    if (ok) onClose()
  }

  const footer = (
    <button
      type="button"
      onClick={handleSave}
      disabled={isSubmitting || locale === business?.locale}
      className="btn btn-primary flex-1"
    >
      {isSubmitting ? <Spinner size="sm" /> : t.formatMessage({ id: 'manage.save' })}
    </button>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.formatMessage({ id: 'manage.edit_location_title' })}
      footer={footer}
    >
      <LocalePicker value={locale} onChange={setLocale} />
      {error && (
        <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mt-3">{error}</div>
      )}
    </ModalShell>
  )
}
