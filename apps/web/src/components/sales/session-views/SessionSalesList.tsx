'use client'

import { useIntl } from 'react-intl'
import { useEffect, useState } from 'react'
import { IonSpinner } from '@ionic/react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { apiRequest } from '@/lib/api-client'

export interface SaleProjection {
  id: string
  saleNumber: number
  total: number
  paymentMethod: 'cash' | 'card' | 'other'
  createdAt: string
}

interface SessionSalesListProps {
  businessId: string
  /** Session id to fetch sales for. Null/empty → renders nothing
   *  (defensive — caller should gate on the active step). */
  sessionId: string | null
  /** Tap handler for an individual sale row. The caller is responsible
   *  for both setting their selectedSaleId state AND navigating the
   *  modal step. */
  onSaleTap: (saleId: string) => void
}

/**
 * Content-only step component for the per-session sales list. Fetches
 * /api/businesses/[businessId]/sales-sessions/[sessionId]/sales when
 * the sessionId changes.
 *
 * Shared between ActiveSessionSalesModal (current session) and
 * SessionHistoryModal (historic session drill-down).
 */
export function SessionSalesList({
  businessId,
  sessionId,
  onSaleTap,
}: SessionSalesListProps) {
  const t = useIntl()
  const { formatCurrency, formatTime } = useBusinessFormat()

  const [items, setItems] = useState<SaleProjection[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setItems([])
      return
    }
    let cancelled = false
    setLoading(true)
    apiRequest<{ sales: SaleProjection[] }>(
      `/api/businesses/${businessId}/sales-sessions/${sessionId}/sales?limit=50`,
    )
      .then(({ sales }) => {
        if (!cancelled) setItems(sales)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId, sessionId])

  if (loading) {
    return (
      <div className="modal-step-item">
        <div className="session-sales-loading">
          <IonSpinner name="crescent" style={{ '--color': 'var(--color-brand)' } as React.CSSProperties} />
          <span className="session-sales-loading__caption">
            {t.formatMessage({ id: 'sales.session.list_loading' })}
          </span>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="session-sales-empty">
        <span className="session-sales-empty__rule" />
        <p className="session-sales-empty__title">
          {t.formatMessage({ id: 'sales.session.list_empty_title' })}
        </p>
        <p className="session-sales-empty__desc">
          {t.formatMessage({ id: 'sales.session.active_sales_modal.empty' })}
        </p>
      </div>
    )
  }

  return (
    <div className="modal-step-item">
      <div className="session-sales-eyebrow">
        <span>
          {t.formatMessage({ id: 'sales.session.list_eyebrow' })}
        </span>
        <span className="session-sales-eyebrow__count">
          {t.formatMessage(
            { id: 'sales.session.list_count' },
            { count: items.length },
          )}
        </span>
      </div>
      <div className="session-sales-list">
        {items.map((s) => {
          const methodKey = `sales.cart.modal_method_${s.paymentMethod}` as const
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSaleTap(s.id)
              }}
              className="session-sales-row"
            >
              <div className="session-sales-row__lead">
                <span className="session-sales-row__stamp">
                  {t.formatMessage(
                    { id: 'sales.session.sale_stamp' },
                    { number: s.saleNumber },
                  )}
                </span>
                <span className="session-sales-row__meta">
                  <span className="session-sales-row__time">
                    {formatTime(new Date(s.createdAt))}
                  </span>
                  <span
                    className={`session-sales-row__dot session-sales-row__dot--${s.paymentMethod}`}
                    aria-hidden="true"
                  />
                  <span className="session-sales-row__method">
                    {t.formatMessage({ id: methodKey })}
                  </span>
                </span>
              </div>
              <span className="session-sales-row__total">
                {formatCurrency(s.total)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
