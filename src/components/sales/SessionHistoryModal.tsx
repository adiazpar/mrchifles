'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'

interface SessionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SessionHistoryModal({
  isOpen,
  onClose,
}: SessionHistoryModalProps) {
  const t = useTranslations('sales.session.history_modal')
  const tCommon = useTranslations('common')
  const { sessions, loadMore, ensureLoaded } = useSalesSessions()
  const { formatCurrency, formatDate, formatTime } = useBusinessFormat()

  useEffect(() => {
    if (isOpen) void ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
      <Modal.Step title={t('title')}>
        {sessions.length === 0 ? (
          <Modal.Item>
            <p className="text-sm text-text-tertiary text-center py-4">{t('empty')}</p>
          </Modal.Item>
        ) : (
          <Modal.Item>
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3">
                  <div className="flex justify-between text-xs text-text-tertiary mb-2">
                    <span>{t('opened_label')}: {formatDate(new Date(s.openedAt))} {formatTime(new Date(s.openedAt))}</span>
                    {s.closedAt && (
                      <span>{t('closed_label')}: {formatTime(new Date(s.closedAt))}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <Stat label={t('transactions_label')} value={(s.salesCount ?? 0).toString()} />
                    <Stat label={t('revenue_label')} value={formatCurrency(s.salesTotal ?? 0)} />
                    <Stat
                      label={t('variance_label')}
                      value={formatCurrency(s.variance ?? 0)}
                      colorClass={(s.variance ?? 0) === 0 ? 'text-success' : 'text-error'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Modal.Item>
        )}
        <Modal.Footer>
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={() => void loadMore()}
              className="btn btn-secondary flex-1"
            >
              {t('load_more')}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

function Stat({
  label,
  value,
  colorClass,
}: {
  label: string
  value: string
  colorClass?: string
}) {
  return (
    <div>
      <div className="text-xs text-text-tertiary">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${colorClass ?? ''}`}>{value}</div>
    </div>
  )
}
