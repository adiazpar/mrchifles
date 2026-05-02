'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Minus, Package, Plus } from 'lucide-react'
import { Modal } from '@/components/ui'
import { useProducts } from '@/contexts/products-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { getProductIconUrl } from '@/lib/utils'
import { getPresetIcon, isPresetIcon } from '@/lib/preset-icons'
import type { Product } from '@/types'
import type { CartLine, UseCartResult } from '@/hooks/useCart'
import { useBusiness } from '@/contexts/business-context'
import type { PaymentMethod } from '@/types/sale'
import { PaymentStepContent } from './cart-modal/PaymentStep'
import { ChargeButton } from './cart-modal/ChargeButton'
import { SuccessStepContent, type ConfirmedSaleRecap } from './cart-modal/SuccessStep'

interface ViewCartModalProps {
  isOpen: boolean
  onClose: () => void
  cart: UseCartResult
}

export function ViewCartModal({ isOpen, onClose, cart }: ViewCartModalProps) {
  const t = useTranslations('sales.cart')
  const tCommon = useTranslations('common')
  const { products } = useProducts()
  const { formatCurrency } = useBusinessFormat()

  // Look up the live product for each line so we can render the same icon
  // and respect current stock when stepping quantity up. Lines store a
  // snapshot of name/price; the products map gives us the rest.
  const productById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  const isEmpty = cart.lines.length === 0

  const { business } = useBusiness()
  const currency = business?.currency ?? 'USD'

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={() => {
        if (confirmedSale != null) {
          cart.clear()
        }
        setMethodId('cash')
        setTenderedStr('')
        setSubmitting(false)
        setConfirmedSale(null)
        setError('')
        setErrorMessageCode(undefined)
      }}
      title={t('modal_title')}
    >
      <Modal.Step title={t('modal_title')}>
        {isEmpty ? (
          <Modal.Item>
            <p className="text-sm text-text-secondary text-center py-6">
              {t('modal_empty')}
            </p>
          </Modal.Item>
        ) : (
          <>
            <Modal.Item>
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
            </Modal.Item>
            {/* Sticky bottom subtotal: only the product list above
                scrolls inside the step body. The outer's negative
                margins overrun the modal-body's padding so the
                bg-bg-surface masks content scrolling behind it
                edge-to-edge (matching the footer wrapper). The inner
                div carries the divider so the border sits flush with
                the standard modal-item horizontal inset, not the
                edge-to-edge surface. */}
            <Modal.Item className="sticky bottom-0 -mx-5 -mb-5 px-5 pt-5 pb-5 bg-bg-surface">
              <div className="pt-5 border-t border-border flex items-center justify-between">
                <span className="text-lg font-bold">
                  {t('modal_subtotal_label')}
                </span>
                <span className="text-lg font-bold tabular-nums">
                  {formatCurrency(cart.total)}
                </span>
              </div>
            </Modal.Item>
          </>
        )}
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            {tCommon('cancel')}
          </button>
          <Modal.NextButton
            className="btn btn-primary flex-1"
            disabled={isEmpty}
          >
            {tCommon('confirm')}
          </Modal.NextButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Payment. */}
      <Modal.Step title={t('modal_payment_step_title')}>
        <PaymentStepContent
          total={cart.total}
          currency={currency}
          methodId={methodId}
          setMethodId={setMethodId}
          tenderedStr={tenderedStr}
          setTenderedStr={setTenderedStr}
          error={error}
          errorMessageCode={errorMessageCode}
        />
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
            disabled={submitting}
          >
            {tCommon('cancel')}
          </button>
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
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Success. */}
      <Modal.Step
        title={t('modal_success_title')}
        hideBackButton
        className="modal-step--centered"
      >
        <SuccessStepContent confirmedSale={confirmedSale} onDone={onClose} />
      </Modal.Step>
    </Modal>
  )
}

interface CartLineRowProps {
  line: CartLine
  product: Product | undefined
  cart: UseCartResult
  formatCurrency: (value: number) => string
}

function CartLineRow({ line, product, cart, formatCurrency }: CartLineRowProps) {
  const t = useTranslations('sales.cart')
  const stockTotal = product?.stock ?? 0
  const atMaxQty = product != null && line.quantity >= stockTotal
  const iconUrl = product ? getProductIconUrl(product) : null
  const lineTotal = line.unitPrice * line.quantity

  return (
    <div className="flex items-center gap-3">
      <div className="product-list-image">
        {product ? renderProductIcon(product, iconUrl) : (
          <Package className="w-5 h-5 text-text-tertiary" />
        )}
      </div>
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
          ariaLabel={t('qty_decrease')}
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
          ariaLabel={t('qty_increase')}
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
  )
}

function renderProductIcon(product: Product, iconUrl: string | null) {
  if (iconUrl && isPresetIcon(iconUrl)) {
    const preset = getPresetIcon(iconUrl)
    return preset ? (
      <preset.icon size={24} className="text-text-primary" />
    ) : null
  }
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt={product.name}
        width={40}
        height={40}
        className="product-list-image-img"
        unoptimized
      />
    )
  }
  return <Package className="w-5 h-5 text-text-tertiary" />
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
      className={`btn border-2 border-transparent bg-transparent ${
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
