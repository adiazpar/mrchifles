'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { Modal, Spinner } from '@/components/ui'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
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
 * Content-only Modal.Items for the per-session sales list. Fetches
 * /api/businesses/[businessId]/sales-sessions/[sessionId]/sales when
 * the sessionId changes. Returns Modal.Item siblings via a fragment —
 * must be invoked as direct children of a Modal.Step.
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
      <Modal.Item>
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      </Modal.Item>
    )
  }

  if (items.length === 0) {
    return (
      <Modal.Item>
        <p className="text-sm text-text-tertiary text-center py-4">{t.formatMessage({
          id: 'sales.session.active_sales_modal.empty'
        })}</p>
      </Modal.Item>
    );
  }

  return (
    <Modal.Item>
      <div className="space-y-2">
        {items.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              haptic()
              onSaleTap(s.id)
            }}
            className="w-full flex items-center justify-between py-2 border-b border-border last:border-b-0 transition-colors hover:bg-bg-base"
          >
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-medium">
                {t.formatMessage({
                  id: 'sales.session.active_sales_modal.sale_label'
                }, { number: s.saleNumber })}
              </span>
              <span className="text-xs text-text-tertiary">
                {formatTime(new Date(s.createdAt))} · {s.paymentMethod}
              </span>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(s.total)}
            </span>
          </button>
        ))}
      </div>
    </Modal.Item>
  );
}
