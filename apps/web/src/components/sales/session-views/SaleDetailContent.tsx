'use client'

import { useIntl } from 'react-intl'
import { useEffect, useState } from 'react'
import { IonSpinner } from '@ionic/react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { apiRequest } from '@/lib/api-client'
import type { Sale } from '@kasero/shared/types/sale'

interface SaleDetailContentProps {
  businessId: string
  saleId: string | null
}

/**
 * Receipt-format detail for a single sale. Fetches the full Sale
 * (with line items) from /api/businesses/[businessId]/sales/[id] when
 * saleId changes. Receipt layout:
 *   - Fraunces italic stamp at the top with sale number + date
 *   - Mono ledger of line items (qty × unit = subtotal)
 *   - Dashed printed-style divider
 *   - Totals block — Fraunces italic "Total" label, oversized mono
 *     terracotta total, then mono caption rows for method + time.
 *
 * Used by both ActiveSessionSalesModal (current session sales) and
 * SessionHistoryModal (historic session sales).
 */
export function SaleDetailContent({ businessId, saleId }: SaleDetailContentProps) {
  const t = useIntl()
  const { formatCurrency, formatDate, formatTime } = useBusinessFormat()

  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!saleId) {
      setSale(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    apiRequest<{ sale: Sale }>(`/api/businesses/${businessId}/sales/${saleId}`)
      .then(({ sale: fetched }) => {
        if (!cancelled) setSale(fetched)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sale')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId, saleId])

  if (!saleId || loading) {
    return (
      <div className="modal-step-item">
        <div className="session-sales-loading">
          <IonSpinner name="crescent" style={{ '--color': 'var(--color-brand)' } as React.CSSProperties} />
          <span className="session-sales-loading__caption">
            {t.formatMessage({ id: 'sales.session.receipt_loading' })}
          </span>
        </div>
      </div>
    )
  }

  if (error || !sale) {
    return (
      <div className="modal-step-item">
        <div className="sale-receipt-error">
          <span className="sale-receipt-error__rule" />
          {error || t.formatMessage({ id: 'sales.cart.modal_error_generic' })}
        </div>
      </div>
    )
  }

  const methodKey = `sales.cart.modal_method_${sale.paymentMethod}` as const
  const createdAt = new Date(sale.createdAt)

  return (
    <>
      <div className="modal-step-item">
        <div className="sale-receipt-stamp">
          <span className="sale-receipt-stamp__eyebrow">
            {t.formatMessage({ id: 'sales.session.receipt_eyebrow' })}
          </span>
          <h2 className="sale-receipt-stamp__number">
            {t.formatMessage(
              { id: 'sales.session.sale_stamp' },
              { number: sale.saleNumber },
            )}
          </h2>
          <span className="sale-receipt-stamp__meta">
            {formatDate(createdAt)} · {formatTime(createdAt)}
          </span>
        </div>
      </div>

      <div className="modal-step-item">
        <div className="sale-receipt-items">
          {sale.items.map((item, idx) => (
            <div
              key={`${item.productId ?? 'item'}-${idx}`}
              className="sale-receipt-item"
            >
              <span className="sale-receipt-item__name">
                {item.productName}
              </span>
              <span className="sale-receipt-item__subtotal">
                {formatCurrency(item.subtotal)}
              </span>
              <span className="sale-receipt-item__breakdown">
                <span className="sale-receipt-item__qty">
                  {t.formatMessage(
                    { id: 'sales.session.receipt_item_qty' },
                    { qty: item.quantity },
                  )}
                </span>
                <span className="sale-receipt-item__times">×</span>
                <span className="sale-receipt-item__unit">
                  {formatCurrency(item.unitPrice)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="modal-step-item">
        <hr className="sale-receipt-divider" aria-hidden="true" />
      </div>

      <div className="modal-step-item">
        <div className="sale-receipt-totals">
          <div className="sale-receipt-totals__row sale-receipt-totals__row--total">
            <span className="sale-receipt-totals__label">
              {t.formatMessage({ id: 'sales.session.active_sales_modal.detail_total_label' })}
            </span>
            <span className="sale-receipt-totals__value">
              {formatCurrency(sale.total)}
            </span>
          </div>
          <div className="sale-receipt-totals__row">
            <span className="sale-receipt-totals__label">
              {t.formatMessage({ id: 'sales.session.active_sales_modal.detail_method_label' })}
            </span>
            <span className="sale-receipt-totals__method-value">
              <span
                className={`session-sales-row__dot session-sales-row__dot--${sale.paymentMethod}`}
                aria-hidden="true"
              />
              <span className="sale-receipt-totals__method-text">
                {t.formatMessage({ id: methodKey })}
              </span>
            </span>
          </div>
          <div className="sale-receipt-totals__row">
            <span className="sale-receipt-totals__label">
              {t.formatMessage({ id: 'sales.session.active_sales_modal.detail_time_label' })}
            </span>
            <span className="sale-receipt-totals__value">
              {formatTime(createdAt)}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
