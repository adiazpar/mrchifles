'use client'

import { useIntl } from 'react-intl'
import { useEffect, useMemo, useState } from 'react'
import { ModalShell } from '@/components/ui/modal-shell'
import { useBusiness } from '@/contexts/business-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { SessionSalesList } from './session-views/SessionSalesList'
import { SaleDetailContent } from './session-views/SaleDetailContent'

interface SessionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 0 | 1 | 2

export function SessionHistoryModal({
  isOpen,
  onClose,
}: SessionHistoryModalProps) {
  const t = useIntl()
  const { business } = useBusiness()
  const { sessions, loadMore, ensureLoaded } = useSalesSessions()
  const { formatCurrency, formatDate, formatTime } = useBusinessFormat()
  const businessId = business?.id ?? ''

  const [step, setStep] = useState<Step>(0)
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

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setStep(0)
      setSelectedSessionId(null)
      setSelectedSaleId(null)
    }, 250)
  }

  const handleBack = () => {
    if (step === 2) setStep(1)
    else if (step === 1) setStep(0)
  }

  let title: string
  if (step === 0) {
    title = t.formatMessage({ id: 'sales.session.history_modal.title' })
  } else if (step === 1) {
    title = selectedSession
      ? t.formatMessage(
          { id: 'sales.session.history_modal.sales_step_title' },
          { date: formatDate(new Date(selectedSession.openedAt)) },
        )
      : t.formatMessage(
          { id: 'sales.session.history_modal.sales_step_title' },
          { date: '' },
        )
  } else {
    title = t.formatMessage({ id: 'sales.session.history_modal.detail_step_title' })
  }

  const loadMoreFooter =
    step === 0 && sessions.length > 0 ? (
      <button
        type="button"
        className="session-history-load-more"
        onClick={() => {
          void loadMore()
        }}
      >
        {t.formatMessage({ id: 'sales.session.history_modal.load_more' })}
      </button>
    ) : undefined

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      onBack={step > 0 ? handleBack : undefined}
      footer={loadMoreFooter}
      noSwipeDismiss
    >
      {/* Step 0: Ledger of closed sessions */}
      {step === 0 && (
        <>
          {sessions.length === 0 ? (
            <div className="session-history-empty">
              <span className="session-history-empty__rule" />
              <p className="session-history-empty__title">
                {t.formatMessage({ id: 'sales.session.history_modal.empty_title' })}
              </p>
              <p className="session-history-empty__desc">
                {t.formatMessage({ id: 'sales.session.history_modal.empty' })}
              </p>
            </div>
          ) : (
            <div className="session-history-ledger">
              <div className="session-history-ledger__header">
                <span className="session-history-ledger__eyebrow">
                  {t.formatMessage({ id: 'sales.session.history_modal.ledger_eyebrow' })}
                </span>
                <span className="session-history-ledger__count">
                  {t.formatMessage(
                    { id: 'sales.session.history_modal.ledger_count' },
                    { count: sessions.length },
                  )}
                </span>
              </div>
              <div className="session-history-ledger__rows">
                {sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    formatCurrency={formatCurrency}
                    onTap={() => {
                      setSelectedSessionId(s.id)
                      setSelectedSaleId(null)
                      setStep(1)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 1: Sales for the selected session */}
      {step === 1 && (
        <SessionSalesList
          businessId={businessId}
          sessionId={selectedSessionId}
          onSaleTap={(id) => {
            setSelectedSaleId(id)
            setStep(2)
          }}
        />
      )}

      {/* Step 2: Sale receipt detail */}
      {step === 2 && (
        <SaleDetailContent businessId={businessId} saleId={selectedSaleId} />
      )}
    </ModalShell>
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
  const t = useIntl()

  const opened = new Date(s.openedAt)
  const closed = s.closedAt ? new Date(s.closedAt) : null
  const variance = s.variance ?? 0
  const isZero = variance === 0
  const varianceClass = isZero
    ? 'recent-session-row__variance recent-session-row__variance--zero'
    : 'recent-session-row__variance recent-session-row__variance--off'

  return (
    <button
      type="button"
      onClick={onTap}
      className="recent-session-row"
    >
      <div className="recent-session-row__lead">
        <span className="session-history-row__time-eyebrow">
          {formatTime(opened)}
          {closed ? ` — ${formatTime(closed)}` : ''}
        </span>
        <span className="recent-session-row__date">
          {formatDate(opened)}
        </span>
        <span className="recent-session-row__count">
          {t.formatMessage(
            { id: 'sales.session.history_modal.row_count' },
            { count: s.salesCount ?? 0 },
          )}
        </span>
      </div>
      <div className="recent-session-row__trail">
        <span className="recent-session-row__total">
          {formatCurrency(s.salesTotal ?? 0)}
        </span>
        <span className={varianceClass}>
          {isZero
            ? t.formatMessage({ id: 'sales.session.history_modal.variance_balanced' })
            : formatCurrency(variance)}
        </span>
      </div>
    </button>
  )
}
