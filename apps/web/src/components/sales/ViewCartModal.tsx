'use client'

import { useIntl } from 'react-intl';
import { useMemo, useState, useCallback, type MouseEvent } from 'react'
import { IonButton } from '@ionic/react'
import { Minus, Plus } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { useProducts } from '@/contexts/products-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import type { Product } from '@kasero/shared/types'
import type { CartLine, UseCartResult } from '@/hooks/useCart'
import { useBusiness } from '@/contexts/business-context'
import type { PaymentMethod } from '@kasero/shared/types/sale'
import { PaymentStepContent } from './cart-modal/PaymentStep'
import { ChargeButton } from './cart-modal/ChargeButton'
import { SuccessStepContent, type ConfirmedSaleRecap } from './cart-modal/SuccessStep'

interface ViewCartModalProps {
  isOpen: boolean
  onClose: () => void
  cart: UseCartResult
}

type CartStep = 0 | 1 | 2

export function ViewCartModal({ isOpen, onClose, cart }: ViewCartModalProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const { products } = useProducts()
  const { formatCurrency } = useBusinessFormat()

  // Look up the live product for each line to respect current stock when
  // stepping quantity up. Lines store a snapshot of name/price; the products
  // map only supplies stock-cap info.
  const productById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  const isEmpty = cart.lines.length === 0

  const { business } = useBusiness()
  const currency = business?.currency ?? 'USD'

  const [step, setStep] = useState<CartStep>(0)
  const [isLocked, setIsLocked] = useState(false)
  const [methodId, setMethodId] = useState<PaymentMethod>('cash')
  const [tenderedStr, setTenderedStr] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmedSale, setConfirmedSale] = useState<ConfirmedSaleRecap | null>(null)
  const [error, setError] = useState<string>('')
  const [errorMessageCode, setErrorMessageCode] = useState<string | undefined>(undefined)

  const tendered = parseFloat(tenderedStr) || 0
  const isCash = methodId === 'cash'
  const tenderedSufficient = !isCash || tendered >= cart.total
  const canConfirm =
    !submitting &&
    cart.lines.length > 0 &&
    cart.total > 0 &&
    tenderedSufficient

  const resetState = useCallback(() => {
    setStep(0)
    setIsLocked(false)
    setMethodId('cash')
    setTenderedStr('')
    setSubmitting(false)
    setConfirmedSale(null)
    setError('')
    setErrorMessageCode(undefined)
  }, [])

  const handleClose = () => {
    if (isLocked) return
    onClose()
    setTimeout(() => {
      if (confirmedSale != null) {
        cart.clear()
      }
      resetState()
    }, 250)
  }

  const handleBack = () => {
    if (isLocked || step === 0) return
    if (step === 1) setStep(0)
  }

  // Step 0 title
  const cartTitle = t.formatMessage({ id: 'sales.cart.modal_title' })
  // Step 1 title
  const paymentTitle = t.formatMessage({ id: 'sales.cart.modal_payment_step_title' })
  // Step 2 title
  const successTitle = t.formatMessage({ id: 'sales.cart.modal_success_title' })

  const title = step === 0 ? cartTitle : step === 1 ? paymentTitle : successTitle

  // Footer for step 0 (cart view)
  const cartFooter = (
    <>
      <IonButton fill="outline" onClick={handleClose}>
        {tCommon.formatMessage({ id: 'common.cancel' })}
      </IonButton>
      <IonButton disabled={isEmpty} onClick={() => setStep(1)}>
        {tCommon.formatMessage({ id: 'common.confirm' })}
      </IonButton>
    </>
  )

  // Footer for step 1 (payment)
  const paymentFooter = (
    <>
      <IonButton fill="outline" onClick={handleClose} disabled={submitting}>
        {tCommon.formatMessage({ id: 'common.cancel' })}
      </IonButton>
      <ChargeButton
        cart={cart}
        currency={currency}
        methodId={methodId}
        tenderedStr={tenderedStr}
        submitting={submitting}
        setSubmitting={setSubmitting}
        setConfirmedSale={setConfirmedSale}
        setError={setError}
        setErrorMessageCode={setErrorMessageCode}
        canConfirm={canConfirm}
        onGoToSuccess={() => setStep(2)}
        onLock={() => setIsLocked(true)}
        onUnlock={() => setIsLocked(false)}
      />
    </>
  )

  const footer = step === 0 ? cartFooter : step === 1 ? paymentFooter : undefined

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      onBack={step === 1 ? handleBack : undefined}
      footer={footer}
      noSwipeDismiss
    >
      {/* Step 0: Cart view */}
      {step === 0 && (
        <>
          {isEmpty ? (
            <p className="text-sm text-text-secondary text-center py-6">
              {t.formatMessage({ id: 'sales.cart.modal_empty' })}
            </p>
          ) : (
            <>
              <div className="modal-step-item">
                <div className="flex flex-col gap-6">
                  {cart.lines.map((line) => (
                    <CartLineRow
                      key={line.productId}
                      line={line}
                      product={productById.get(line.productId)}
                      cart={cart}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
              {/* Sticky bottom subtotal: only the product list above
                  scrolls inside the step body. The outer's negative
                  margins overrun the modal-body's padding so the
                  bg-bg-surface masks content scrolling behind it
                  edge-to-edge (matching the footer wrapper). The inner
                  div carries the divider so the border sits flush with
                  the standard modal-item horizontal inset, not the
                  edge-to-edge surface. */}
              <div className="modal-step-item sticky bottom-0 -mx-5 -mb-5 px-5 pt-5 pb-5 bg-bg-surface">
                <div className="pt-5 border-t border-border flex items-center justify-between">
                  <span className="text-lg font-bold">
                    {t.formatMessage({ id: 'sales.cart.modal_subtotal_label' })}
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    {formatCurrency(cart.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Step 1: Payment */}
      {step === 1 && (
        <PaymentStepContent
          total={cart.total}
          currency={currency}
          methodId={methodId}
          setMethodId={setMethodId}
          tenderedStr={tenderedStr}
          setTenderedStr={setTenderedStr}
          error={error}
          errorMessageCode={errorMessageCode}
          onGoToCart={() => setStep(0)}
        />
      )}

      {/* Step 2: Success */}
      {step === 2 && (
        <SuccessStepContent confirmedSale={confirmedSale} onDone={handleClose} />
      )}
    </ModalShell>
  );
}

interface CartLineRowProps {
  line: CartLine
  product: Product | undefined
  cart: UseCartResult
  formatCurrency: (value: number) => string
}

function CartLineRow({ line, product, cart, formatCurrency }: CartLineRowProps) {
  const t = useIntl()
  const stockTotal = product?.stock ?? 0
  const atMaxQty = product != null && line.quantity >= stockTotal
  const lineTotal = line.unitPrice * line.quantity

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{line.productName}</div>
        <div className="text-xs text-text-secondary mt-0.5">
          {formatCurrency(line.unitPrice)} {'×'} {line.quantity} ={' '}
          <span className="text-text-primary font-medium tabular-nums">
            {formatCurrency(lineTotal)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <QtyButton
          variant="danger"
          ariaLabel={t.formatMessage({
            id: 'sales.cart.qty_decrease'
          })}
          onClick={(e) => {
            e.stopPropagation()
            cart.updateQty(line.productId, line.quantity - 1)
          }}
        >
          <Minus style={{ width: 14, height: 14 }} />
        </QtyButton>
        <span className="text-sm font-semibold tabular-nums w-6 text-center">
          {line.quantity}
        </span>
        <QtyButton
          variant="primary"
          ariaLabel={t.formatMessage({
            id: 'sales.cart.qty_increase'
          })}
          disabled={atMaxQty}
          onClick={(e) => {
            e.stopPropagation()
            if (atMaxQty) return
            cart.updateQty(line.productId, line.quantity + 1)
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
        </QtyButton>
      </div>
    </div>
  );
}

type QtyButtonVariant = 'primary' | 'danger'

function QtyButton({
  variant,
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  variant: QtyButtonVariant
  ariaLabel: string
  disabled?: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  const activeColor = variant === 'primary' ? 'text-brand' : 'text-error'
  return (
    <button
      type="button"
      className={`cursor-pointer select-none transition-colors border-2 border-transparent bg-transparent ${
        disabled ? '' : activeColor
      }`}
      style={{
        width: 48,
        height: 32,
        minHeight: 'unset',
        padding: 0,
        borderRadius: 'var(--radius-full)',
        gap: 0,
      }}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        haptic()
        onClick(e)
      }}
    >
      {children}
    </button>
  )
}
