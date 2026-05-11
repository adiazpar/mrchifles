'use client'

import { useIntl } from 'react-intl';
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { PaymentMethod } from '@kasero/shared/types/sale'

export interface ConfirmedSaleRecap {
  saleNumber: number
  total: number
  method: PaymentMethod
  // Cash-only fields. Null for card / other.
  tendered: number | null
  change: number | null
}

interface SuccessStepContentProps {
  confirmedSale: ConfirmedSaleRecap | null
}

/**
 * Content for the cart-payment success step. Lottie is gated on
 * confirmedSale != null so it only mounts after the API has actually
 * landed (matches OpenSessionModal's `opened` gate).
 *
 * Step 2 footer (the Done button) lives in ViewCartModal so it can
 * share the terracotta `.charge-pill` chrome with step 1.
 */
export function SuccessStepContent({ confirmedSale }: SuccessStepContentProps) {
  const t = useIntl()
  const { formatCurrency } = useBusinessFormat()

  const showCashRows = confirmedSale?.method === 'cash'
  // Build the full message id as a template literal so the type narrows
  // to the union of declared ids instead of `string`. Mirrors the shape
  // returned by PAYMENT_METHODS[i].labelKey so call sites can pass it
  // straight to formatMessage.
  const methodLabelKey = confirmedSale
    ? (`sales.cart.modal_method_${confirmedSale.method}` as const)
    : null

  // Pad sale number to 4 digits with leading zeros so the stamp reads
  // like a printed receipt run number (SALE 0042 · COMPLETE).
  const stampNumber = confirmedSale
    ? String(confirmedSale.saleNumber).padStart(4, '0')
    : null

  return (
    <div className="cart-success">
      <div className="cart-success__lottie">
        {confirmedSale && (
          <LottiePlayer
            src="/animations/success.json"
            loop={false}
            autoplay={true}
            delay={300}
            style={{ width: 140, height: 140 }}
          />
        )}
      </div>

        {confirmedSale && stampNumber && (
          <span className="cart-success__stamp">
            <span>{t.formatMessage({ id: 'sales.cart.modal_success_stamp_lead' })}</span>
            <span className="cart-success__stamp-id">{stampNumber}</span>
            <span className="cart-success__stamp-dot" aria-hidden="true">·</span>
            <span className="cart-success__stamp-state">
              {t.formatMessage({ id: 'sales.cart.modal_success_stamp_state' })}
            </span>
          </span>
        )}

        {confirmedSale && (
          <h2 className="cart-success__heading">
            {t.formatMessage(
              { id: 'sales.cart.modal_success_heading_alt' },
              { em: (chunks) => <em>{chunks}</em> },
            )}
          </h2>
        )}

        {confirmedSale && (
          <p className="cart-success__caption">
            {t.formatMessage(
              { id: 'sales.cart.modal_success_caption' },
              { number: confirmedSale.saleNumber },
            )}
          </p>
        )}

        {confirmedSale && methodLabelKey && (
          <div className="cart-success__ledger">
            <div className="cart-success__ledger-row">
              <span className="cart-success__ledger-label">
                {t.formatMessage({ id: 'sales.cart.modal_success_method_label' })}
              </span>
              <span className="cart-success__ledger-value">
                {t.formatMessage({ id: methodLabelKey })}
              </span>
            </div>
            {showCashRows && confirmedSale.tendered != null && (
              <div className="cart-success__ledger-row">
                <span className="cart-success__ledger-label">
                  {t.formatMessage({ id: 'sales.cart.modal_success_tendered_label' })}
                </span>
                <span className="cart-success__ledger-value">
                  {formatCurrency(confirmedSale.tendered)}
                </span>
              </div>
            )}
            {showCashRows && confirmedSale.change != null && (
              <div className="cart-success__ledger-row cart-success__ledger-row--change">
                <span className="cart-success__ledger-label">
                  {t.formatMessage({ id: 'sales.cart.modal_success_change_label' })}
                </span>
                <span className="cart-success__ledger-value">
                  {formatCurrency(confirmedSale.change)}
                </span>
              </div>
            )}
          <div className="cart-success__ledger-row cart-success__ledger-row--emphasis">
            <span className="cart-success__ledger-label">
              {t.formatMessage({ id: 'sales.cart.modal_success_total_label' })}
            </span>
            <span className="cart-success__ledger-value">
              {formatCurrency(confirmedSale.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
