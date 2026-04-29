'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import type { PaymentMethod } from '@/types/sale'

export interface HistoryFilter {
  from: string | null
  to: string | null
  paymentMethod: PaymentMethod | null
}

interface Props {
  isOpen: boolean
  current: HistoryFilter
  onClose: () => void
  onApply: (filter: HistoryFilter) => void
}

export function SalesHistoryFilterSheet({ isOpen, current, onClose, onApply }: Props) {
  const t = useTranslations('sales.history')
  const tCh = useTranslations('sales.charge_sheet')
  const [from, setFrom] = useState<string>(current.from ?? '')
  const [to, setTo] = useState<string>(current.to ?? '')
  const [pm, setPm] = useState<PaymentMethod | 'any'>(current.paymentMethod ?? 'any')

  return (
    <Modal isOpen={isOpen} title={t('filter_title')} onClose={onClose}>
      <Modal.Step title={t('filter_title')}>
        <div className="px-4 py-3 flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-secondary">{t('filter_date_from')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-secondary">{t('filter_date_to')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </label>
          <div>
            <div className="text-xs uppercase tracking-wide text-text-secondary mb-2">
              {t('filter_payment_method')}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['any', 'cash', 'card', 'other'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={pm === m ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setPm(m)}
                >
                  {m === 'any' ? t('filter_payment_any') : tCh(`payment_${m}` as 'payment_cash' | 'payment_card' | 'payment_other')}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Modal.Footer>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onApply({ from: null, to: null, paymentMethod: null })}
          >
            {t('filter_reset')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              onApply({
                from: from || null,
                to: to || null,
                paymentMethod: pm === 'any' ? null : pm,
              })
            }
          >
            {t('filter_apply')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
