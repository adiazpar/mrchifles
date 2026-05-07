'use client'

import { useIntl } from 'react-intl';
import { Modal } from '@/components/ui'
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
  onDone: () => void
}

/**
 * Content-only Modal.Items + Modal.Footer for the cart-payment success
 * step. Lottie is gated on confirmedSale != null so it only mounts after
 * the API has actually landed (matches OpenSessionModal's `opened` gate).
 *
 * Returns multiple Modal.* siblings — must be invoked as direct children
 * of a Modal.Step, never wrapped in a div or other component (compound
 * component scan rule, see modal-system.md).
 */
export function SuccessStepContent({ confirmedSale, onDone }: SuccessStepContentProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const { formatCurrency } = useBusinessFormat()

  const showCashRows = confirmedSale?.method === 'cash'
  // Build the method label key as a template literal so the type narrows
  // to the union of declared keys instead of `string`. Using
  // PAYMENT_METHODS[i].labelKey (typed as string) would force a cast.
  const methodLabelKey = confirmedSale
    ? (`modal_method_${confirmedSale.method}` as const)
    : null

  return (
    <>
      <Modal.Item>
        <div className="flex flex-col items-center text-center py-4">
          <div style={{ width: 160, height: 160 }}>
            {confirmedSale && (
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={300}
                style={{ width: 160, height: 160 }}
              />
            )}
          </div>
          {confirmedSale && (
            <p className="text-lg font-semibold text-text-primary mt-4">
              {t.formatMessage({
                id: 'sales.cart.modal_success_heading'
              }, { number: confirmedSale.saleNumber })}
            </p>
          )}
        </div>
      </Modal.Item>
      {confirmedSale && methodLabelKey && (
        <Modal.Item>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t.formatMessage({
                id: 'sales.cart.modal_success_method_label'
              })}</span>
              <span className="font-medium">{t.formatMessage({
                id: 'sales.cart.' + methodLabelKey
              })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">{t.formatMessage({
                id: 'sales.cart.modal_success_total_label'
              })}</span>
              <span className="font-medium tabular-nums">{formatCurrency(confirmedSale.total)}</span>
            </div>
            {showCashRows && confirmedSale.tendered != null && (
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">{t.formatMessage({
                  id: 'sales.cart.modal_success_tendered_label'
                })}</span>
                <span className="font-medium tabular-nums">{formatCurrency(confirmedSale.tendered)}</span>
              </div>
            )}
            {showCashRows && confirmedSale.change != null && (
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">{t.formatMessage({
                  id: 'sales.cart.modal_success_change_label'
                })}</span>
                <span className="font-medium tabular-nums">{formatCurrency(confirmedSale.change)}</span>
              </div>
            )}
          </div>
        </Modal.Item>
      )}
      <Modal.Footer>
        <button
          type="button"
          onClick={onDone}
          className="btn btn-primary flex-1"
        >
          {tCommon.formatMessage({
            id: 'common.done'
          })}
        </button>
      </Modal.Footer>
    </>
  );
}
