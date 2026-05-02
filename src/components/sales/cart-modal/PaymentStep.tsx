'use client'

import { useTranslations } from 'next-intl'
import { Modal, PriceInput, useModal } from '@/components/ui'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { roundToCurrencyDecimals, nextRoundBills } from '@/lib/sales-helpers'
import { PAYMENT_METHODS } from '@/lib/payment-methods'
import type { PaymentMethod } from '@/types/sale'

interface PaymentStepContentProps {
  total: number
  currency: string
  methodId: PaymentMethod
  setMethodId: (id: PaymentMethod) => void
  tenderedStr: string
  setTenderedStr: (value: string) => void
  error: string
  errorMessageCode?: string
}

const STOCK_RELATED_CODES = new Set([
  'SALE_INSUFFICIENT_STOCK',
  'SALE_PRODUCT_NOT_FOUND',
  'SALE_PRODUCT_INACTIVE',
])

/**
 * Content-only Modal.Items for the payment step. Renders the method
 * picker, the cash form (revealed via gridTemplateRows when cash is
 * selected), the change row, the error banner, and the sticky Total.
 *
 * Returns multiple Modal.Items via a fragment — must be invoked as
 * direct children of a Modal.Step.
 */
export function PaymentStepContent({
  total,
  currency,
  methodId,
  setMethodId,
  tenderedStr,
  setTenderedStr,
  error,
  errorMessageCode,
}: PaymentStepContentProps) {
  const t = useTranslations('sales.cart')
  const { formatCurrency } = useBusinessFormat()
  const { goToStep } = useModal()

  const isCash = methodId === 'cash'
  const tendered = parseFloat(tenderedStr) || 0
  const change = isCash ? roundToCurrencyDecimals(tendered - total, currency) : 0
  const showChangeRow = isCash && tenderedStr !== ''
  const isStockError =
    errorMessageCode != null && STOCK_RELATED_CODES.has(errorMessageCode)

  const quickBills = nextRoundBills(total, currency)

  return (
    <>
      <Modal.Item>
        <div id="payment-method-picker-label" className="text-sm text-text-secondary mb-2">
          {t('modal_pay_with_label')}
        </div>
        <div role="group" aria-labelledby="payment-method-picker-label" className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon
            const active = method.id === methodId
            const activeStyle = active
              ? {
                  borderColor: method.colorToken,
                  background: method.subtleBg ?? 'var(--color-bg-surface)',
                  color: method.colorToken,
                }
              : undefined
            return (
              <button
                key={method.id}
                type="button"
                className="flex flex-col items-center gap-1 rounded-xl border-2 border-transparent bg-bg-surface p-3 transition-colors"
                style={activeStyle}
                onClick={() => {
                  haptic()
                  setMethodId(method.id)
                  // Single invariant: clear tendered on every method change.
                  setTenderedStr('')
                }}
                aria-pressed={active}
              >
                <Icon size={24} />
                <span className="text-sm font-medium">
                  {t(method.labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </Modal.Item>

      {/* Cash form reveal — gridTemplateRows 0fr ↔ 1fr collapse trick. */}
      <Modal.Item>
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: isCash ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="flex flex-col gap-3">
              <div>
                <label className="label" htmlFor="payment-tendered">
                  {t('modal_tendered_label')}
                </label>
                <PriceInput
                  id="payment-tendered"
                  value={tenderedStr}
                  onValueChange={setTenderedStr}
                  placeholder="0"
                />
              </div>

              {/* Quick-fill row: Exact + dynamically computed bills. */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hidden -mx-1 px-1">
                <QuickBillButton
                  label={t('modal_tendered_exact')}
                  onClick={() => {
                    haptic()
                    setTenderedStr(total.toString())
                  }}
                />
                {quickBills.map((amount) => (
                  <QuickBillButton
                    key={amount}
                    label={formatCurrency(amount)}
                    onClick={() => {
                      haptic()
                      setTenderedStr(amount.toString())
                    }}
                  />
                ))}
              </div>

              {showChangeRow && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    {t('modal_change_label')}
                  </span>
                  <span
                    className={`font-medium tabular-nums ${
                      change < 0 ? 'text-error' : ''
                    }`}
                  >
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal.Item>

      {error && (
        <Modal.Item>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-error-subtle p-3 text-sm text-error">
            <span>{error}</span>
            {isStockError && (
              <button
                type="button"
                className="font-medium underline whitespace-nowrap"
                onClick={() => {
                  haptic()
                  goToStep(0)
                }}
              >
                {t('modal_error_back_to_cart')}
              </button>
            )}
          </div>
        </Modal.Item>
      )}

      {/* Sticky Total: same pattern as the step-0 subtotal. */}
      <Modal.Item className="sticky bottom-0 -mx-5 -mb-5 px-5 pt-5 pb-5 bg-bg-surface">
        <div className="pt-5 border-t border-border flex items-center justify-between">
          <span className="text-lg font-bold">{t('modal_total_label')}</span>
          <span className="text-lg font-bold tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </Modal.Item>
    </>
  )
}

interface QuickBillButtonProps {
  label: string
  onClick: () => void
}

function QuickBillButton({ label, onClick }: QuickBillButtonProps) {
  return (
    <button
      type="button"
      className="btn btn-secondary whitespace-nowrap"
      style={{
        minHeight: 'unset',
        height: 36,
        padding: '0 var(--space-3)',
        fontSize: 'var(--text-sm)',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
