'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { Sale } from '@/types/sale'

interface Props {
  sale: Sale | null
  onClose: () => void
}

export function SaleDetailModal({ sale, onClose }: Props) {
  const t = useTranslations('sales.detail')
  const tCh = useTranslations('sales.charge_sheet')
  const { formatCurrency, formatDate, formatTime } = useBusinessFormat()

  if (!sale) return null

  const date = new Date(sale.date)

  return (
    <Modal isOpen={sale !== null} title={t('title', { number: sale.saleNumber })} onClose={onClose}>
      <Modal.Step title={t('title', { number: sale.saleNumber })}>
        <div className="px-4 py-3 flex flex-col gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-text-secondary">
              {formatDate(date)} · {formatTime(date)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">{t('payment_method_label')}</div>
            <div>
              {tCh(`payment_${sale.paymentMethod}` as 'payment_cash' | 'payment_card' | 'payment_other')}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">{t('items_label')}</div>
            <div className="flex flex-col gap-1">
              {sale.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>{it.productName} × {it.quantity}</span>
                  <span>{formatCurrency(it.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border pt-2 flex items-center justify-between font-semibold">
            <span>{t('total_label')}</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          {sale.notes && (
            <div>
              <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">{t('notes_label')}</div>
              <div className="whitespace-pre-wrap">{sale.notes}</div>
            </div>
          )}
        </div>
      </Modal.Step>
    </Modal>
  )
}
