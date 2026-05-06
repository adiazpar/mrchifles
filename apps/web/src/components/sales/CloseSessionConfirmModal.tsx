'use client'

import { useIntl } from 'react-intl';
import { useMemo, useState } from 'react'
import { Modal, PriceInput, Spinner, useModal } from '@/components/ui'
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

  const [countedCashStr, setCountedCashStr] = useState<string>('0')
  const [submitting, setSubmitting] = useState(false)
  const [closed, setClosed] = useState(false)
  const [error, setError] = useState('')

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

  const handleNext = async (goToStep: (n: number) => void) => {
    haptic()
    // Refetch sales to ensure freshness for the variance reveal.
    await sales.refetch()
    goToStep(1)
  }

  const handleConfirm = async (goToStep: (n: number) => void) => {
    haptic()
    setError('')
    setSubmitting(true)
    goToStep(2)
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={() => {
        setCountedCashStr('0')
        setSubmitting(false)
        setClosed(false)
        setError('')
      }}
      title={t.formatMessage({
        id: 'sales.session.close_modal.title'
      })}
    >
      {/* Step 0 — count drawer */}
      <Modal.Step title={t.formatMessage({
        id: 'sales.session.close_modal.title'
      })}>
        <Modal.Item>
          <label className="label" htmlFor="close-session-counted-cash">
            {t.formatMessage({
              id: 'sales.session.close_modal.counted_label'
            })}
          </label>
          <PriceInput
            id="close-session-counted-cash"
            value={countedCashStr}
            onValueChange={setCountedCashStr}
            placeholder="0"
          />
          <p className="text-xs text-text-tertiary mt-2">{t.formatMessage({
            id: 'sales.session.close_modal.count_helper'
          })}</p>
        </Modal.Item>
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
            disabled={submitting}
          >
            {tCommon.formatMessage({
              id: 'common.cancel'
            })}
          </button>
          <NextButton onNext={handleNext} disabled={submitting} />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 1 — review (variance reveal) */}
      <Modal.Step title={t.formatMessage({
        id: 'sales.session.close_modal.title'
      })} backStep={0}>
        {sessionStats && (
          <>
            <Modal.Item>
              <div className="text-xs uppercase tracking-wide text-text-tertiary mb-2">
                {t.formatMessage({
                  id: 'sales.session.close_modal.summary_heading'
                })}
              </div>
              <div className="space-y-2 text-sm">
                <Row label={t.formatMessage({
                  id: 'sales.session.close_modal.transactions_label'
                })} value={sessionStats.transactions.toString()} />
                <Row
                  label={t.formatMessage({
                    id: 'sales.session.close_modal.revenue_label'
                  })}
                  value={formatCurrency(sessionStats.totalRevenue)}
                  valueClass="font-semibold"
                />
                <Row
                  label={t.formatMessage({
                    id: 'sales.session.close_modal.avg_ticket_label'
                  })}
                  value={sessionStats.avgTicket !== null ? formatCurrency(sessionStats.avgTicket) : '—'}
                />
              </div>
            </Modal.Item>
            <Modal.Item>
              <div className="border-t border-dashed border-border" />
            </Modal.Item>
            <Modal.Item>
              <div className="text-xs uppercase tracking-wide text-text-tertiary mb-2">
                {t.formatMessage({
                  id: 'sales.session.close_modal.recon_heading'
                })}
              </div>
              <div className="space-y-2 text-sm">
                <Row label={t.formatMessage({
                  id: 'sales.session.close_modal.starting_cash'
                })} value={formatCurrency(currentSession?.startingCash ?? 0)} />
                <Row label={t.formatMessage({
                  id: 'sales.session.close_modal.cash_sales'
                })} value={formatCurrency(sessionStats.cashSales)} />
                <Row label={t.formatMessage({
                  id: 'sales.session.close_modal.expected'
                })} value={formatCurrency(sessionStats.expected)} valueClass="font-semibold" />
                <Row label={t.formatMessage({
                  id: 'sales.session.close_modal.counted'
                })} value={formatCurrency(sessionStats.counted)} />
                <Row
                  label={t.formatMessage({
                    id: 'sales.session.close_modal.variance'
                  })}
                  value={formatCurrency(sessionStats.variance)}
                  valueClass={`font-semibold ${sessionStats.variance === 0 ? 'text-success' : 'text-error'}`}
                />
              </div>
            </Modal.Item>
          </>
        )}
        <Modal.Footer>
          <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={submitting}>
            {tCommon.formatMessage({
              id: 'common.back'
            })}
          </Modal.GoToStepButton>
          <ConfirmCloseButton onConfirm={handleConfirm} submitting={submitting} />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 2 — success */}
      <Modal.Step title={t.formatMessage({
        id: 'sales.session.close_modal.title'
      })} hideBackButton className="modal-step--centered">
        <Modal.Item>
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
                {t.formatMessage({
                  id: 'sales.session.close_modal.success_heading'
                })}
              </p>
            ) : error ? (
              <p className="text-sm text-error mt-4">{error}</p>
            ) : (
              <Spinner />
            )}
          </div>
        </Modal.Item>
        <Modal.Footer>
          {closed ? (
            <button type="button" onClick={onClose} className="btn btn-primary flex-1">
              {tCommon.formatMessage({
                id: 'common.done'
              })}
            </button>
          ) : error ? (
            <Modal.GoToStepButton step={1} className="btn btn-secondary flex-1">
              {t.formatMessage({
                id: 'sales.session.close_modal.error_back'
              })}
            </Modal.GoToStepButton>
          ) : null}
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
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

function NextButton({
  onNext,
  disabled,
}: {
  onNext: (goToStep: (n: number) => void) => Promise<void>
  disabled: boolean
}) {
  const t = useIntl()
  const { goToStep } = useModal()
  return (
    <button
      type="button"
      onClick={() => onNext(goToStep)}
      className="btn btn-primary flex-1"
      disabled={disabled}
    >
      {t.formatMessage({
        id: 'sales.session.close_modal.next'
      })}
    </button>
  );
}

function ConfirmCloseButton({
  onConfirm,
  submitting,
}: {
  onConfirm: (goToStep: (n: number) => void) => Promise<void>
  submitting: boolean
}) {
  const t = useIntl()
  const { goToStep } = useModal()
  return (
    <button
      type="button"
      onClick={() => onConfirm(goToStep)}
      className="btn btn-danger flex-1"
      disabled={submitting}
    >
      {t.formatMessage({
        id: 'sales.session.close_modal.confirm'
      })}
    </button>
  );
}
