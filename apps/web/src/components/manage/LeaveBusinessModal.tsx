'use client'

import { useIntl } from 'react-intl'
import { useMemo } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { LogOut } from 'lucide-react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { useLeaveBusiness } from '@/hooks/useLeaveBusiness'

interface Props { isOpen: boolean; onClose: () => void }

/**
 * LeaveBusinessModal — non-owner stepping away from a business they were
 * invited to. Saffron palette (warning, not destructive). The modal frames
 * the action as a quietly resolute farewell: there is finality, but it's
 * reversible with a fresh invite. The primary button is colored "warning"
 * via Ionic's color prop, which routes through the saffron token.
 */
export function LeaveBusinessModal({ isOpen, onClose }: Props) {
  const intl = useIntl()
  const router = useRouter()
  const { business } = useBusiness()
  const { leave, isSubmitting, error, reset } = useLeaveBusiness()

  const handleLeave = async () => {
    const ok = await leave()
    if (ok) { onClose(); router.push('/') }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'manage.leave_business_hero_title' })
    const emphasis = intl.formatMessage({ id: 'manage.leave_business_hero_title_emphasis' })
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

  const changes = [
    intl.formatMessage({ id: 'manage.leave_business_changes_role' }),
    intl.formatMessage({ id: 'manage.leave_business_changes_team' }),
    intl.formatMessage({ id: 'manage.leave_business_changes_data' }),
    intl.formatMessage({ id: 'manage.leave_business_changes_rejoin' }),
  ]

  // Saffron primary — color="warning" routes through the saffron Ionic
  // color token. Saffron over oxblood here because leaving is reversible
  // (a fresh invite restores access). Oxblood is reserved for actually
  // ending the business.
  const footer = (
    <IonButton
      color="warning"
      expand="block"
      onClick={handleLeave}
      disabled={isSubmitting}
    >
      {isSubmitting
        ? <IonSpinner name="crescent" />
        : intl.formatMessage({ id: 'manage.leave_business_button' })}
    </IonButton>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title={intl.formatMessage({ id: 'manage.leave_business' })}
      footer={footer}
      noSwipeDismiss
    >
      {error && <div className="modal-error">{error}</div>}

      <header className="modal-hero leave-business__hero">
        <div className="modal-hero__eyebrow">
          {intl.formatMessage({ id: 'manage.leave_business_eyebrow' })}
        </div>
        <h1 className="modal-hero__title">{titleNode}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'manage.leave_business_hero_subtitle' })}
        </p>
      </header>

      <div className="leave-business__plate">
        <span className="leave-business__plate-eyebrow">
          {intl.formatMessage({ id: 'manage.leave_business_plate_eyebrow' })}
        </span>
        <span className="leave-business__plate-name">{business?.name ?? ''}</span>
      </div>

      <div className="leave-business__changes">
        <div className="leave-business__changes-eyebrow">
          <LogOut />
          {intl.formatMessage({ id: 'manage.leave_business_changes_eyebrow' })}
        </div>
        <ul className="leave-business__changes-list">
          {changes.map((label, i) => (
            <li key={i} className="leave-business__changes-item">{label}</li>
          ))}
        </ul>
      </div>

      <div className="leave-business__footnote">
        {intl.formatMessage({ id: 'manage.leave_business_footnote' })}
      </div>
    </ModalShell>
  )
}
