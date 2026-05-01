'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { apiRequest } from '@/lib/api-client'

interface ActiveSessionSalesModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
}

interface SaleProjection {
  id: string
  saleNumber: number
  total: number
  paymentMethod: 'cash' | 'card' | 'other'
  createdAt: string
}

export function ActiveSessionSalesModal({
  isOpen,
  onClose,
  businessId,
}: ActiveSessionSalesModalProps) {
  const t = useTranslations('sales.session.active_sales_modal')
  const tCommon = useTranslations('common')
  const { currentSession } = useSalesSessions()
  const { formatCurrency, formatTime } = useBusinessFormat()

  const [items, setItems] = useState<SaleProjection[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !currentSession) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentSession?.id])

  async function load() {
    if (!currentSession) return
    setLoading(true)
    try {
      const data = await apiRequest<{ sales: SaleProjection[] }>(
        `/api/businesses/${businessId}/sales-sessions/${currentSession.id}/sales?limit=50`,
      )
      setItems(data.sales)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
      <Modal.Step title={t('title')}>
        {items.length === 0 && !loading ? (
          <Modal.Item>
            <p className="text-sm text-text-tertiary text-center py-4">{t('empty')}</p>
          </Modal.Item>
        ) : (
          <Modal.Item>
            <div className="space-y-2">
              {items.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{t('sale_label', { number: s.saleNumber })}</span>
                    <span className="text-xs text-text-tertiary">
                      {formatTime(new Date(s.createdAt))} · {s.paymentMethod}
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(s.total)}
                  </span>
                </div>
              ))}
            </div>
          </Modal.Item>
        )}
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
