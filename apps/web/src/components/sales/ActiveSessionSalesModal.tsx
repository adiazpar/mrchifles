'use client'

import { useIntl } from 'react-intl'
import { useState } from 'react'
import { ModalShell } from '@/components/ui/modal-shell'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { SessionSalesList } from './session-views/SessionSalesList'
import { SaleDetailContent } from './session-views/SaleDetailContent'

interface ActiveSessionSalesModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
}

export function ActiveSessionSalesModal({
  isOpen,
  onClose,
  businessId,
}: ActiveSessionSalesModalProps) {
  const t = useIntl()
  const { currentSession } = useSalesSessions()

  const [step, setStep] = useState<0 | 1>(0)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  const handleClose = () => {
    onClose()
    // Reset after dismiss so state is clean on next open.
    setTimeout(() => {
      setStep(0)
      setSelectedSaleId(null)
    }, 250)
  }

  // NOTE: the legacy detail title used `Sale #{number}` with a hardcoded
  // 0 placeholder for `number`. Behavior preserved per redesign brief —
  // we use the `sales.session.history_modal.detail_step_title` key
  // ("Sale receipt") for the receipt step instead, which doesn't need
  // the broken number arg. The list-row stamp itself shows the real
  // sale number (rendered inside SessionSalesList).
  const title =
    step === 0
      ? t.formatMessage({ id: 'sales.session.active_sales_modal.title' })
      : t.formatMessage({ id: 'sales.session.history_modal.detail_step_title' })

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      onBack={step > 0 ? () => setStep(0) : undefined}
    >
      {step === 0 && (
        <SessionSalesList
          businessId={businessId}
          sessionId={currentSession?.id ?? null}
          onSaleTap={(id) => {
            setSelectedSaleId(id)
            setStep(1)
          }}
        />
      )}
      {step === 1 && (
        <SaleDetailContent businessId={businessId} saleId={selectedSaleId} />
      )}
    </ModalShell>
  )
}
