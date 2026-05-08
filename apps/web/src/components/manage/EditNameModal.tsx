'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { ModalShell } from '@/components/ui/modal-shell'
import { IonButton, IonSpinner } from '@ionic/react'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'

interface Props { isOpen: boolean; onClose: () => void }

export function EditNameModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [name, setName] = useState(business?.name ?? '')

  useEffect(() => {
    if (isOpen) setName(business?.name ?? '')
  }, [isOpen, business?.name])

  // Reset hook state after the dismissal animation completes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => { reset() }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, reset])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === business?.name) { onClose(); return }
    const ok = await update({ name: trimmed })
    if (ok) onClose()
  }

  const footer = (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={isSubmitting || !name.trim()}
      className="flex-1"
    >
      {isSubmitting ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'manage.save' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.formatMessage({ id: 'manage.edit_name_title' })}
      footer={footer}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        className="input"
        autoComplete="off"
      />
      {error && (
        <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mt-3">{error}</div>
      )}
    </ModalShell>
  )
}
