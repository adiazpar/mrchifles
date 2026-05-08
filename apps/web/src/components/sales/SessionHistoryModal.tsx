'use client'

import { useIntl } from 'react-intl';
import { useEffect, useMemo, useState } from 'react'
import { IonButton } from '@ionic/react'
import { ModalShell } from '@/components/ui/modal-shell'
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
      <IonButton fill="outline" onClick={() => void loadMore()}>
        {t.formatMessage({ id: 'sales.session.history_modal.load_more' })}
      </IonButton>
    ) : undefined

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      onBack={step > 0 ? handleBack : undefined}
      footer={loadMoreFooter}
    >
      {/* Step 0: List of closed sessions */}
      {step === 0 && (
        <>
          {sessions.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              {t.formatMessage({ id: 'sales.session.history_modal.empty' })}
            </p>
          ) : (
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
                    setStep(1)
                  }}
                />
              ))}
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
  );
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

  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full text-left rounded-lg border border-border p-3 transition-colors hover:bg-bg-base"
    >
      <div className="flex justify-between text-xs text-text-tertiary mb-2">
        <span>
          {t.formatMessage({
            id: 'sales.session.history_modal.opened_label'
          })}: {formatDate(new Date(s.openedAt))} {formatTime(new Date(s.openedAt))}
        </span>
        {s.closedAt && (
          <span>{t.formatMessage({
            id: 'sales.session.history_modal.closed_label'
          })}: {formatTime(new Date(s.closedAt))}</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat label={t.formatMessage({
          id: 'sales.session.history_modal.transactions_label'
        })} value={(s.salesCount ?? 0).toString()} />
        <Stat label={t.formatMessage({
          id: 'sales.session.history_modal.revenue_label'
        })} value={formatCurrency(s.salesTotal ?? 0)} />
        <Stat
          label={t.formatMessage({
            id: 'sales.session.history_modal.variance_label'
          })}
          value={formatCurrency(s.variance ?? 0)}
          colorClass={(s.variance ?? 0) === 0 ? 'text-success' : 'text-error'}
        />
      </div>
    </button>
  );
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
