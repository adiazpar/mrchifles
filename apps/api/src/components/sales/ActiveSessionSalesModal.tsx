'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, useModal } from '@/components/ui'
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
  const t = useTranslations('sales.session.active_sales_modal')
  const tCommon = useTranslations('common')
  const { currentSession } = useSalesSessions()

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={() => setSelectedSaleId(null)}
      title={t('title')}
    >
      <Modal.Step title={t('title')}>
        <SessionSalesListWithNav
          businessId={businessId}
          sessionId={currentSession?.id ?? null}
          setSelectedSaleId={setSelectedSaleId}
          targetStep={1}
        />
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Sale receipt detail. Always-rendered per modal-system
          rules; gates content on selectedSaleId. */}
      <Modal.Step title={t('detail_title', { number: 0 })}>
        <SaleDetailContent businessId={businessId} saleId={selectedSaleId} />
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

interface SessionSalesListWithNavProps {
  businessId: string
  sessionId: string | null
  setSelectedSaleId: (id: string) => void
  targetStep: number
}

/**
 * Thin wrapper around SessionSalesList that closes over `useModal()`
 * so it can navigate on row tap. Lives here (not in the shared
 * SessionSalesList) because SessionSalesList is intentionally
 * navigation-agnostic — different modals point at different step
 * indices.
 */
function SessionSalesListWithNav({
  businessId,
  sessionId,
  setSelectedSaleId,
  targetStep,
}: SessionSalesListWithNavProps) {
  const { goToStep } = useModal()
  return (
    <SessionSalesList
      businessId={businessId}
      sessionId={sessionId}
      onSaleTap={(id) => {
        setSelectedSaleId(id)
        goToStep(targetStep)
      }}
    />
  )
}
