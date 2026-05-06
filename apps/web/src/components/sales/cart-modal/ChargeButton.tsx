'use client'

import { useIntl, type IntlShape } from 'react-intl';
import { Spinner, useModal } from '@/components/ui'
import { useApiMessage } from '@/hooks/useApiMessage'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useSales } from '@/contexts/sales-context'
import { ApiError } from '@/lib/api-client'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { roundToCurrencyDecimals } from '@kasero/shared/sales-helpers'
import { haptic } from '@/lib/haptics'
import type { UseCartResult } from '@/hooks/useCart'
import type { PaymentMethod } from '@kasero/shared/types/sale'
import type { ConfirmedSaleRecap } from './SuccessStep'

interface ChargeButtonProps {
  cart: UseCartResult
  currency: string
  methodId: PaymentMethod
  tenderedStr: string
  submitting: boolean
  setSubmitting: (v: boolean) => void
  setConfirmedSale: (recap: ConfirmedSaleRecap | null) => void
  setError: (message: string) => void
  setErrorMessageCode: (code: string | undefined) => void
  canConfirm: boolean
}

/**
 * Footer button for the payment step. Charges the sale via
 * SalesContext.commitSale, locks the modal during the round-trip, then
 * navigates to step 2 (success) on success, or surfaces a localized
 * error inline on failure (sequential pattern, no fake success).
 */
export function ChargeButton({
  cart,
  currency,
  methodId,
  tenderedStr,
  submitting,
  setSubmitting,
  setConfirmedSale,
  setError,
  setErrorMessageCode,
  canConfirm,
}: ChargeButtonProps) {
  const t = useIntl()
  const { formatCurrency } = useBusinessFormat()
  const translateApiMessage = useApiMessage()
  const { goToStep, lock, unlock } = useModal()
  const sales = useSales()

  const tendered = parseFloat(tenderedStr) || 0

  const handleClick = async () => {
    haptic()
    setSubmitting(true)
    setError('')
    setErrorMessageCode(undefined)
    lock()
    try {
      const sale = await sales.commitSale({
        items: cart.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        paymentMethod: methodId,
      })
      const isCash = methodId === 'cash'
      setConfirmedSale({
        saleNumber: sale.saleNumber,
        total: sale.total,
        method: methodId,
        tendered: isCash ? tendered : null,
        change: isCash ? roundToCurrencyDecimals(tendered - sale.total, currency) : null,
      })
      goToStep(2)
    } catch (err) {
      const { message, code } = translateError(err, translateApiMessage, t)
      setError(message)
      setErrorMessageCode(code)
    } finally {
      setSubmitting(false)
      unlock()
    }
  }

  return (
    <button
      type="button"
      className="btn btn-primary flex-1"
      disabled={!canConfirm}
      onClick={handleClick}
    >
      {submitting ? (
        <Spinner />
      ) : (
        <span>{t.formatMessage({
          id: 'sales.cart.modal_charge_button'
        }, { value: formatCurrency(cart.total) })}</span>
      )}
    </button>
  );
}

function translateError(
  err: unknown,
  translate: ReturnType<typeof useApiMessage>,
  t: IntlShape,
): { message: string; code: string | undefined } {
  if (err instanceof ApiError) {
    const code = err.messageCode ?? undefined
    switch (err.messageCode) {
      case ApiMessageCode.SESSION_NOT_OPEN:
        return { message: t.formatMessage({ id: 'sales.cart.modal_error_session_closed' }), code }
      case ApiMessageCode.SALE_INSUFFICIENT_STOCK:
        return { message: t.formatMessage({ id: 'sales.cart.modal_error_stock_changed' }), code }
      case ApiMessageCode.SALE_PRODUCT_NOT_FOUND:
      case ApiMessageCode.SALE_PRODUCT_INACTIVE:
        return { message: t.formatMessage({ id: 'sales.cart.modal_error_product_unavailable' }), code }
      case ApiMessageCode.SALE_INVALID_DATE:
        // Defensive — server clock skew. Spec routes this to the generic
        // copy rather than the envelope translation since the apiMessages
        // text is server-instrumentation-shaped, not POS-facing.
        return { message: t.formatMessage({ id: 'sales.cart.modal_error_generic' }), code }
      // Rate-limit (429) and offline-mutation envelopes have apiMessages.*
      // entries already; fall through to the envelope translator so the
      // user gets the localized "wait a moment" / "you're offline" copy.
      default:
        if (err.envelope) {
          return { message: translate(err.envelope), code }
        }
        return { message: t.formatMessage({ id: 'sales.cart.modal_error_generic' }), code: undefined }
    }
  }
  return { message: t.formatMessage({ id: 'sales.cart.modal_error_generic' }), code: undefined }
}
