'use client'

import { useIntl } from 'react-intl'
import { useEffect, useMemo, useState } from 'react'
import { AlertOctagon, Check } from 'lucide-react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import { AuthField } from '@/components/auth'
import { useBusiness } from '@/contexts/business-context'
import { useDeleteBusiness } from '@/hooks/useDeleteBusiness'
import { useGoBackTo } from '@/hooks'

interface Props { isOpen: boolean; onClose: () => void }

/**
 * DeleteBusinessModal — most permanent action in the manage tab. Mirrors
 * DeleteAccountModal's friction pattern:
 *   - Oxblood hero with italic "*certain*" emphasis
 *   - "WHAT YOU'LL LOSE" warning list (every member, every product, …)
 *   - TYPE TO CONFIRM block with the business name as the target string
 *     in mono — copy-resistant and the user must read it
 *   - Live READY CHECK list lights up moss when the name matches
 *   - Single oxblood "Delete forever" primary
 */
export function DeleteBusinessModal({ isOpen, onClose }: Props) {
  const intl = useIntl()
  const goBackTo = useGoBackTo()
  const { business } = useBusiness()
  const { deleteBusiness, isSubmitting, error } = useDeleteBusiness()
  const [typed, setTyped] = useState('')

  // Reset typed value after modal closes.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setTyped(''), 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const nameMatches = !!business && typed === business.name
  const canDelete = nameMatches && !isSubmitting

  const handleDelete = async () => {
    if (!canDelete) return
    const ok = await deleteBusiness()
    if (ok) { onClose(); goBackTo('/') }
  }

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'manage.delete_business_hero_title' })
    const emphasis = intl.formatMessage({ id: 'manage.delete_business_hero_title_emphasis' })
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

  const lossItems = [
    intl.formatMessage({ id: 'manage.delete_business_warning_team' }),
    intl.formatMessage({ id: 'manage.delete_business_warning_products' }),
    intl.formatMessage({ id: 'manage.delete_business_warning_orders' }),
    intl.formatMessage({ id: 'manage.delete_business_warning_sales' }),
    intl.formatMessage({ id: 'manage.delete_business_warning_irreversible' }),
  ]

  const checks = [
    {
      key: 'name',
      label: intl.formatMessage({ id: 'manage.delete_business_check_name' }),
      met: nameMatches,
    },
  ]

  const footer = (
    <IonButton
      color="danger"
      expand="block"
      onClick={handleDelete}
      disabled={!canDelete}
    >
      {isSubmitting
        ? <IonSpinner name="crescent" />
        : intl.formatMessage({ id: 'manage.delete_business_button_long' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'manage.delete_business' })}
      footer={footer}
      noSwipeDismiss
    >
      {error && <div className="modal-error">{error}</div>}

      <header className="modal-hero delete-business__hero">
        <div className="modal-hero__eyebrow modal-hero__eyebrow--danger">
          <AlertOctagon size={12} />
          {intl.formatMessage({ id: 'manage.delete_business_eyebrow' })}
        </div>
        <h1 className="modal-hero__title modal-hero__title--danger">{titleNode}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'manage.delete_business_hero_subtitle' })}
        </p>
      </header>

      <div className="delete-business__warning">
        <div className="delete-business__warning-eyebrow">
          <AlertOctagon />
          {intl.formatMessage({ id: 'manage.delete_business_warning_eyebrow' })}
        </div>
        <ul className="delete-business__warning-list">
          {lossItems.map((label, i) => (
            <li key={i} className="delete-business__warning-item">{label}</li>
          ))}
        </ul>
      </div>

      <div className="delete-business__target">
        <span className="delete-business__target-eyebrow">
          {intl.formatMessage({ id: 'manage.delete_business_target_eyebrow' })}
        </span>
        <span className="delete-business__target-value">{business?.name ?? ''}</span>
      </div>

      <div className="delete-business__form">
        <AuthField
          label={intl.formatMessage({ id: 'manage.delete_business_confirm_label' })}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={business?.name ?? ''}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required
        />
      </div>

      <div className="delete-business__checks">
        <div className="delete-business__checks-eyebrow">
          {intl.formatMessage({ id: 'manage.delete_business_checks_eyebrow' })}
        </div>
        <ul className="delete-business__check-list">
          {checks.map((c) => (
            <li
              key={c.key}
              className={'delete-business__check' + (c.met ? ' is-met' : '')}
            >
              <span className="delete-business__check-marker" aria-hidden="true">
                <Check />
              </span>
              {c.label}
            </li>
          ))}
        </ul>
      </div>
    </ModalShell>
  )
}
