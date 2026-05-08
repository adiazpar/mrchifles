'use client'

import { useIntl } from 'react-intl';
import { useRouter } from '@/lib/next-navigation-shim'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { useLeaveBusiness } from '@/hooks/useLeaveBusiness'

interface Props { isOpen: boolean; onClose: () => void }

export function LeaveBusinessModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const tCommon = useIntl()
  const router = useRouter()
  const { business } = useBusiness()
  const { leave, isSubmitting, error, reset } = useLeaveBusiness()

  const handleLeave = async () => {
    const ok = await leave()
    if (ok) { onClose(); router.push('/') }
  }

  const footer = (
    <>
      <IonButton fill="outline" onClick={onClose} className="flex-1">
        {tCommon.formatMessage({ id: 'common.cancel' })}
      </IonButton>
      <IonButton
        color="danger"
        onClick={handleLeave}
        disabled={isSubmitting}
        className="flex-1"
      >
        {isSubmitting ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'manage.leave_business_button' })}
      </IonButton>
    </>
  )

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => { reset(); onClose() }}
      title={t.formatMessage({ id: 'manage.leave_business' })}
      footer={footer}
    >
      <div className="px-4 pt-4 pb-4 flex flex-col gap-3">
        <p className="text-sm text-text-secondary">
          {t.formatMessage(
            { id: 'manage.leave_business_warning' },
            { businessName: business?.name ?? '' }
          )}
        </p>
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
        )}
      </div>
    </ModalShell>
  )
}
