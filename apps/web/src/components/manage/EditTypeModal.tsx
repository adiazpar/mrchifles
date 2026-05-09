'use client'

import { useIntl } from 'react-intl'
import { useEffect, useMemo, useState } from 'react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
import { BusinessTypeGrid } from '@/components/businesses/shared'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'
import type { BusinessType } from '@/hooks'

interface Props { isOpen: boolean; onClose: () => void }

export function EditTypeModal({ isOpen, onClose }: Props) {
  const intl = useIntl()
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [selected, setSelected] = useState<BusinessType | null>(business?.type ?? null)

  useEffect(() => {
    if (isOpen) setSelected(business?.type ?? null)
  }, [isOpen, business?.type])

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

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'manage.edit_type_hero_title' })
    const emphasis = intl.formatMessage({ id: 'manage.edit_type_hero_title_emphasis' })
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

  const footer = (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={isSubmitting || !selected || selected === business?.type}
      className="flex-1"
    >
      {isSubmitting ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'manage.save' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'manage.edit_type_title' })}
      footer={footer}
      noSwipeDismiss
    >
      {error && <div className="modal-error">{error}</div>}

      <header className="modal-hero edit-type__hero">
        <div className="modal-hero__eyebrow">
          {intl.formatMessage({ id: 'manage.edit_type_eyebrow' })}
        </div>
        <h1 className="modal-hero__title">{titleNode}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'manage.edit_type_hero_subtitle' })}
        </p>
      </header>

      <div className="edit-type__shelf">
        <p className="edit-type__caption">
          {intl.formatMessage({ id: 'manage.edit_type_caption' })}
        </p>
        <BusinessTypeGrid selected={selected} onSelect={setSelected} />
      </div>
    </ModalShell>
  )
}
