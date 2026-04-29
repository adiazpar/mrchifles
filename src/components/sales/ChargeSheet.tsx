'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useProducts } from '@/contexts/products-context'
import { useSales } from '@/contexts/sales-context'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError } from '@/lib/api-client'
import type { UseCartResult } from '@/hooks/useCart'
import type { PaymentMethod } from '@/types/sale'

interface ChargeSheetProps {
  isOpen: boolean
  cart: UseCartResult
  businessId: string
  onClose: () => void
}

const NOTES_COUNTER_THRESHOLD = 800
const NOTES_MAX = 1000

export function ChargeSheet({ isOpen, cart, onClose }: ChargeSheetProps) {
  const tCh = useTranslations('sales.charge_sheet')
  const tCart = useTranslations('sales.cart')
  const tDetail = useTranslations('sales.detail')
  const tErr = useTranslations('sales.error')
  const { formatCurrency } = useBusinessFormat()
  const { products, refetch: refetchProducts } = useProducts()
  const { commitSale } = useSales()
  const translateApiMessage = useApiMessage()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Re-fetch products on open so we surface any drift before commit.
  useEffect(() => {
    if (isOpen) void refetchProducts()
  }, [isOpen, refetchProducts])

  // Reset form whenever the sheet (re-)opens.
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod(null)
      setDate(new Date().toISOString().slice(0, 16))
      setNotes('')
      setErrorMsg('')
    }
  }, [isOpen])

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const lineStates = cart.lines.map((line) => {
    const product = productMap.get(line.productId)
    const currentPrice = product?.price ?? line.unitPrice
    const isUnavailable = !product || product.active === false
    const drifted = !isUnavailable && currentPrice !== line.unitPrice
    return { line, currentPrice, isUnavailable, drifted }
  })

  const hasUnavailable = lineStates.some((s) => s.isUnavailable)
  const hasDrift = lineStates.some((s) => s.drifted)

  const expectedTotal = lineStates.reduce(
    (acc, s) => acc + (s.isUnavailable ? 0 : s.currentPrice * s.line.quantity),
    0,
  )

  const canConfirm =
    paymentMethod !== null && !hasUnavailable && !submitting && cart.lines.length > 0

  const onConfirm = async () => {
    if (!paymentMethod) return
    setSubmitting(true)
    setErrorMsg('')
    try {
      await commitSale({
        paymentMethod,
        date: new Date(date).toISOString(),
        notes: notes.trim() ? notes.trim() : undefined,
        items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      })
      cart.clear()
      onClose()
    } catch (err) {
      const message =
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : tErr('unknown')
      setErrorMsg(message)
    } finally {
      setSubmitting(false)
    }
  }

  const remaining = NOTES_MAX - notes.length

  return (
    <Modal isOpen={isOpen} title={tCh('title')} onClose={() => !submitting && onClose()}>
      <Modal.Step title={tCh('title')}>
        <div className="px-4 py-3 flex flex-col gap-4 text-sm">
          {(hasDrift || hasUnavailable) && (
            <div className="rounded-md bg-warning-subtle border border-warning text-warning px-3 py-2">
              {tCh('prices_changed_banner')}
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wide text-text-secondary mb-2">
              {tCh('payment_label')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'card', 'other'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  className={paymentMethod === method ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setPaymentMethod(method)}
                >
                  {tCh(`payment_${method}` as 'payment_cash' | 'payment_card' | 'payment_other')}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-secondary">
              {tCh('date_label')}
            </span>
            <input
              type="datetime-local"
              className="rounded-md border border-border bg-bg-elevated px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-text-secondary">
              {tCh('notes_label')}
            </span>
            <textarea
              className="rounded-md border border-border bg-bg-elevated px-3 py-2 min-h-[60px]"
              maxLength={NOTES_MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {notes.length >= NOTES_COUNTER_THRESHOLD && (
              <span className="text-xs text-text-secondary">
                {tCh('notes_counter', { remaining })}
              </span>
            )}
          </label>

          <div className="border-t border-border pt-3 flex flex-col gap-1">
            {lineStates.map(({ line, currentPrice, drifted, isUnavailable }) => (
              <div key={line.productId} className="flex items-center justify-between text-sm">
                <span className={isUnavailable ? 'line-through text-text-secondary' : ''}>
                  {line.productName} &times; {line.quantity}
                </span>
                <span>
                  {drifted && (
                    <span
                      className="line-through text-text-secondary mr-2"
                      aria-label={tCh('line_old_price_aria', { amount: formatCurrency(line.unitPrice * line.quantity) })}
                    >
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </span>
                  )}
                  {isUnavailable
                    ? tCh('line_unavailable')
                    : formatCurrency(currentPrice * line.quantity)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between font-semibold mt-2">
              <span>{tDetail('total_label')}</span>
              <span>{formatCurrency(expectedTotal)}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-md bg-error-subtle border border-error text-error px-3 py-2">
              {errorMsg}
            </div>
          )}
        </div>

        <Modal.Footer>
          <button
            type="button"
            className="btn-secondary"
            disabled={submitting}
            onClick={onClose}
          >
            {tCart('confirm_clear_cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            {submitting
              ? tCh('submitting')
              : tCh('confirm_button', { total: formatCurrency(expectedTotal) })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
