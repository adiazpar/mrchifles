'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal, useModal } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { SessionSalesList } from './session-views/SessionSalesList'
import { SaleDetailContent } from './session-views/SaleDetailContent'

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
  const { business } = useBusiness()
  const { sessions, loadMore, ensureLoaded } = useSalesSessions()
  const { formatCurrency, formatDate, formatTime } = useBusinessFormat()
  const businessId = business?.id ?? ''

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  )

  useEffect(() => {
    if (isOpen) void ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={() => {
        setSelectedSessionId(null)
        setSelectedSaleId(null)
      }}
      title={t('title')}
    >
      {/* Step 0: List of closed sessions. Tapping a card drills into
          step 1 (sales for that session). */}
      <Modal.Step title={t('title')}>
        {sessions.length === 0 ? (
          <Modal.Item>
            <p className="text-sm text-text-tertiary text-center py-4">{t('empty')}</p>
          </Modal.Item>
        ) : (
          <Modal.Item>
            <div className="space-y-3">
              {sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  formatCurrency={formatCurrency}
                  onTap={() => {
                    haptic()
                    setSelectedSessionId(s.id)
                    setSelectedSaleId(null)
                  }}
                />
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

      {/* Step 1: Sales for the selected session. Always-rendered per
          modal-system rules; gates content on selectedSessionId. */}
      <Modal.Step
        title={
          selectedSession
            ? t('sales_step_title', {
                date: formatDate(new Date(selectedSession.openedAt)),
              })
            : t('sales_step_title', { date: '' })
        }
      >
        <SessionSalesListWithNav
          businessId={businessId}
          sessionId={selectedSessionId}
          setSelectedSaleId={setSelectedSaleId}
          targetStep={2}
        />
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Sale receipt detail. */}
      <Modal.Step title={t('detail_step_title')}>
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

interface SessionRowProps {
  session: {
    id: string
    openedAt: string
    closedAt: string | null
    salesCount: number | null
    salesTotal: number | null
    variance: number | null
  }
  formatDate: (date: Date) => string
  formatTime: (date: Date) => string
  formatCurrency: (value: number) => string
  onTap: () => void
}

function SessionRow({
  session: s,
  formatDate,
  formatTime,
  formatCurrency,
  onTap,
}: SessionRowProps) {
  const t = useTranslations('sales.session.history_modal')
  const { goToStep } = useModal()

  return (
    <button
      type="button"
      onClick={() => {
        onTap()
        goToStep(1)
      }}
      className="w-full text-left rounded-lg border border-border p-3 transition-colors hover:bg-bg-base"
    >
      <div className="flex justify-between text-xs text-text-tertiary mb-2">
        <span>
          {t('opened_label')}: {formatDate(new Date(s.openedAt))} {formatTime(new Date(s.openedAt))}
        </span>
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
    </button>
  )
}

interface SessionSalesListWithNavProps {
  businessId: string
  sessionId: string | null
  setSelectedSaleId: (id: string) => void
  targetStep: number
}

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
