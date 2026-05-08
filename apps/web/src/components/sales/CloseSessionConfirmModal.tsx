'use client'

import { useIntl } from 'react-intl';
import { useEffect, useMemo, useState } from 'react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell, PriceInput } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useSales } from '@/contexts/sales-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError } from '@/lib/api-client'
import { haptic } from '@/lib/haptics'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { computeExpectedCash, computeVariance } from '@kasero/shared/sales-helpers'
import { useBusiness } from '@/contexts/business-context'

interface CloseSessionConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onCloseComplete?: () => void
}

type Step = 0 | 1 | 2

export function CloseSessionConfirmModal({
  isOpen,
  onClose,
  onCloseComplete,
}: CloseSessionConfirmModalProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const { business } = useBusiness()
  const { formatCurrency } = useBusinessFormat()
  const sales = useSales()
  const { currentSession, closeSession } = useSalesSessions()
  const translateApiMessage = useApiMessage()

  const [step, setStep] = useState<Step>(0)
  const [countedCashStr, setCountedCashStr] = useState<string>('0')
  const [submitting, setSubmitting] = useState(false)
  const [closed, setClosed] = useState(false)
  const [error, setError] = useState('')

  // Reset state after the modal exit animation completes.
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setStep(0)
        setCountedCashStr('0')
        setSubmitting(false)
        setClosed(false)
        setError('')
      }, 250)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const currency = business?.currency ?? 'USD'

  // Session-scoped stats from cached sales filtered by sessionId.
  // NOT useSales().stats — that's today's UTC totals, not session totals.
  const sessionStats = useMemo(() => {
    if (!currentSession) return null
    const sessionSales = sales.sales.filter((s) => s.sessionId === currentSession.id)
    const transactions = sessionSales.length
    const totalRevenue = sessionSales.reduce((acc, s) => acc + s.total, 0)
    const avgTicket = transactions > 0 ? totalRevenue / transactions : null
    const cashSales = sessionSales
      .filter((s) => s.paymentMethod === 'cash')
      .reduce((acc, s) => acc + s.total, 0)
    const expected = computeExpectedCash(currentSession.startingCash, cashSales, currency)
    const counted = parseFloat(countedCashStr) || 0
    const variance = computeVariance(counted, expected, currency)
    return { transactions, totalRevenue, avgTicket, cashSales, expected, counted, variance }
  }, [currentSession, sales.sales, countedCashStr, currency])

  const handleNext = async () => {
    haptic()
    // Refetch sales to ensure freshness for the variance reveal.
    await sales.refetch()
    setStep(1)
  }

  const handleConfirm = async () => {
    haptic()
    setError('')
    setSubmitting(true)
    setStep(2)
    try {
      const counted = parseFloat(countedCashStr) || 0
      await closeSession({ countedCash: counted })
      setClosed(true)
      onCloseComplete?.()
    } catch (err) {
      if (err instanceof ApiError && err.messageCode === ApiMessageCode.SESSION_NOT_OPEN) {
        setError(t.formatMessage({
          id: 'sales.session.close_modal.error_not_open'
        }))
      } else if (err instanceof ApiError && err.envelope) {
        setError(translateApiMessage(err.envelope))
      } else {
        setError(tCommon.formatMessage({
          id: 'common.error'
        }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const title = t.formatMessage({ id: 'sales.session.close_modal.title' })

  // Step 0 footer — count drawer
  const step0Footer = (
    <>
      <IonButton fill="outline" onClick={onClose} disabled={submitting}>
        {tCommon.formatMessage({ id: 'common.cancel' })}
      </IonButton>
      <IonButton onClick={handleNext} disabled={submitting}>
        {t.formatMessage({ id: 'sales.session.close_modal.next' })}
      </IonButton>
    </>
  )

  // Step 1 footer — variance review
  const step1Footer = (
    <>
      <IonButton fill="outline" onClick={() => setStep(0)} disabled={submitting}>
        {tCommon.formatMessage({ id: 'common.back' })}
      </IonButton>
      <IonButton color="danger" onClick={handleConfirm} disabled={submitting}>
        {t.formatMessage({ id: 'sales.session.close_modal.confirm' })}
      </IonButton>
    </>
  )

  // Step 2 footer — success or error
  const step2Footer = closed ? (
    <IonButton onClick={onClose}>
      {tCommon.formatMessage({ id: 'common.done' })}
    </IonButton>
  ) : error ? (
    <IonButton fill="outline" onClick={() => setStep(1)}>
      {t.formatMessage({ id: 'sales.session.close_modal.error_back' })}
    </IonButton>
  ) : null

  const footer = step === 0 ? step0Footer : step === 1 ? step1Footer : step2Footer

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onBack={step === 1 ? () => setStep(0) : undefined}
      footer={footer}
    >
      {/* Step 0 — count drawer */}
      {step === 0 && (
        <>
          <label className="label" htmlFor="close-session-counted-cash">
            {t.formatMessage({ id: 'sales.session.close_modal.counted_label' })}
          </label>
          <PriceInput
            id="close-session-counted-cash"
            value={countedCashStr}
            onValueChange={setCountedCashStr}
            placeholder="0"
          />
          <p className="text-xs text-text-tertiary mt-2">
            {t.formatMessage({ id: 'sales.session.close_modal.count_helper' })}
          </p>
        </>
      )}

      {/* Step 1 — review (variance reveal) */}
      {step === 1 && sessionStats && (
        <>
          <div className="text-xs uppercase tracking-wide text-text-tertiary mb-2">
            {t.formatMessage({ id: 'sales.session.close_modal.summary_heading' })}
          </div>
          <div className="space-y-2 text-sm mb-4">
            <Row label={t.formatMessage({ id: 'sales.session.close_modal.transactions_label' })} value={sessionStats.transactions.toString()} />
            <Row
              label={t.formatMessage({ id: 'sales.session.close_modal.revenue_label' })}
              value={formatCurrency(sessionStats.totalRevenue)}
              valueClass="font-semibold"
            />
            <Row
              label={t.formatMessage({ id: 'sales.session.close_modal.avg_ticket_label' })}
              value={sessionStats.avgTicket !== null ? formatCurrency(sessionStats.avgTicket) : '—'}
            />
          </div>
          <div className="border-t border-dashed border-border mb-4" />
          <div className="text-xs uppercase tracking-wide text-text-tertiary mb-2">
            {t.formatMessage({ id: 'sales.session.close_modal.recon_heading' })}
          </div>
          <div className="space-y-2 text-sm">
            <Row label={t.formatMessage({ id: 'sales.session.close_modal.starting_cash' })} value={formatCurrency(currentSession?.startingCash ?? 0)} />
            <Row label={t.formatMessage({ id: 'sales.session.close_modal.cash_sales' })} value={formatCurrency(sessionStats.cashSales)} />
            <Row label={t.formatMessage({ id: 'sales.session.close_modal.expected' })} value={formatCurrency(sessionStats.expected)} valueClass="font-semibold" />
            <Row label={t.formatMessage({ id: 'sales.session.close_modal.counted' })} value={formatCurrency(sessionStats.counted)} />
            <Row
              label={t.formatMessage({ id: 'sales.session.close_modal.variance' })}
              value={formatCurrency(sessionStats.variance)}
              valueClass={`font-semibold ${sessionStats.variance === 0 ? 'text-success' : 'text-error'}`}
            />
          </div>
        </>
      )}

      {/* Step 2 — success/error/loading */}
      {step === 2 && (
        <div className="flex flex-col items-center text-center py-4">
          <div style={{ width: 160, height: 160 }}>
            {closed && (
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={300}
                style={{ width: 160, height: 160 }}
              />
            )}
          </div>
          {closed ? (
            <p className="text-lg font-semibold text-text-primary mt-4">
              {t.formatMessage({ id: 'sales.session.close_modal.success_heading' })}
            </p>
          ) : error ? (
            <p className="text-sm text-error mt-4">{error}</p>
          ) : (
            <IonSpinner name="crescent" />
          )}
        </div>
      )}
    </ModalShell>
  )
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex justify-between">
      <span className="text-text-tertiary">{label}</span>
      <span className={`tabular-nums ${valueClass ?? ''}`}>{value}</span>
    </div>
  )
}
