'use client'

import { useIntl } from 'react-intl'
import { useEffect, useMemo, useState } from 'react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
import { AuthField } from '@/components/auth'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'

interface Props { isOpen: boolean; onClose: () => void }

export function EditNameModal({ isOpen, onClose }: Props) {
  const intl = useIntl()
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

  const trimmed = name.trim()
  const hasInput = trimmed.length > 0
  const hasChanges = hasInput && trimmed !== business?.name
  const canSave = hasChanges && !isSubmitting

  // Title with italic emphasis on the accent word.
  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'manage.edit_name_hero_title' })
    const emphasis = intl.formatMessage({ id: 'manage.edit_name_hero_title_emphasis' })
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

  const echoTagText = hasChanges
    ? intl.formatMessage({ id: 'manage.edit_name_echo_tag' })
    : intl.formatMessage({ id: 'manage.edit_name_echo_tag_unchanged' })

  const footer = (
    <IonButton
      expand="block"
      onClick={handleSave}
      disabled={!canSave}
      className="flex-1"
    >
      {isSubmitting ? <IonSpinner name="crescent" /> : intl.formatMessage({ id: 'manage.save' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'manage.edit_name_title' })}
      footer={footer}
      noSwipeDismiss
    >
      {error && <div className="modal-error">{error}</div>}

      <header className="modal-hero edit-name__hero">
        <div className="modal-hero__eyebrow">
          {intl.formatMessage({ id: 'manage.edit_name_eyebrow' })}
        </div>
        <h1 className="modal-hero__title">{titleNode}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'manage.edit_name_hero_subtitle' })}
        </p>
      </header>

      <div className="edit-name__form">
        <AuthField
          label={intl.formatMessage({ id: 'manage.edit_name_field_label' })}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          required
        />

        {/* Echo card — quiet Fraunces italic preview of the typed name. */}
        <div
          className="edit-name__echo"
          data-active={hasInput ? 'true' : 'false'}
          aria-hidden={!hasInput}
        >
          <div className="edit-name__echo-label">
            <span>{intl.formatMessage({ id: 'manage.edit_name_echo_label' })}</span>
            <span
              className={
                'edit-name__echo-tag' +
                (hasChanges ? '' : ' edit-name__echo-tag--quiet')
              }
            >
              {echoTagText}
            </span>
          </div>
          <span className="edit-name__echo-value">{trimmed || ' '}</span>
        </div>
      </div>
    </ModalShell>
  )
}
