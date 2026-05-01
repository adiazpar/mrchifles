'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import type { SalesStats } from '@/types/sale'

interface CloseSessionConfirmModalProps {
  isOpen: boolean
  stats: SalesStats | null
  onClose: () => void
  onConfirm: () => void
}

export function CloseSessionConfirmModal({
  isOpen,
  stats,
  onClose,
  onConfirm,
}: CloseSessionConfirmModalProps) {
  const t = useTranslations('sales.session.close_modal')
  const tCommon = useTranslations('common')
  const tStats = useTranslations('sales.stats')
  const { formatCurrency } = useBusinessFormat()

  const placeholder = tStats('no_comparison')

  const transactionsLabel = stats ? stats.todayCount.toString() : placeholder
  const revenueLabel = stats ? formatCurrency(stats.todayRevenue) : placeholder
  const avgTicketLabel =
    stats && stats.todayAvgTicket !== null
      ? formatCurrency(stats.todayAvgTicket)
      : placeholder

  const handleConfirm = () => {
    haptic()
    onConfirm()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
      <Modal.Step title={t('title')}>
        <Modal.Item>
          <div className="border-t border-dashed border-border" />
        </Modal.Item>

        <Modal.Item>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t('transactions_label')}</span>
              <span className="font-semibold tabular-nums">{transactionsLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t('revenue_label')}</span>
              <span className="font-semibold tabular-nums">{revenueLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t('avg_ticket_label')}</span>
              <span className="tabular-nums">{avgTicketLabel}</span>
            </div>
          </div>
        </Modal.Item>

        <Modal.Item>
          <div className="border-t border-dashed border-border" />
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn btn-danger flex-1"
          >
            {t('confirm')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
