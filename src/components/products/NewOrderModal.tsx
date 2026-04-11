'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Search, X, Check, ImageIcon, ArrowUp, ArrowDown, ChevronDown, CalendarClock, MinusCircle, PlusCircle } from 'lucide-react'
import { Spinner, Modal, useMorphingModal, PriceInput } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { getProductIconUrl } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { Product, Provider } from '@/types'
import type { OrderFormItem } from '@/lib/products'

// ============================================
// PROPS INTERFACE
// ============================================

export interface NewOrderModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void

  // Products and providers
  _products?: Product[] // Kept for potential future use
  providers: Provider[]
  filteredProducts: Product[]

  // Form state
  orderItems: OrderFormItem[]
  onToggleProduct: (product: Product) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  setOrderItems: React.Dispatch<React.SetStateAction<OrderFormItem[]>>

  orderTotal: string
  onOrderTotalChange: (total: string) => void
  orderNotes: string
  onOrderNotesChange: (notes: string) => void
  orderEstimatedArrival: string
  onOrderEstimatedArrivalChange: (date: string) => void
  orderReceiptFile: File | null
  onOrderReceiptFileChange: (file: File | null) => void
  orderReceiptPreview: string | null
  onOrderReceiptPreviewChange: (preview: string | null) => void
  orderProvider: string
  onOrderProviderChange: (providerId: string) => void
  productSearchQuery: string
  onProductSearchQueryChange: (query: string) => void

  // Operation states
  isSaving: boolean
  error: string

  // Success state
  orderSaved: boolean

  // Handlers
  onSaveOrder: () => Promise<boolean>
  onResetForm: () => void
}

// ============================================
// BUTTON COMPONENTS
// ============================================

interface ConfirmOrderButtonProps {
  onSave: () => Promise<boolean>
  isSaving: boolean
  disabled: boolean
}

function ConfirmOrderButton({ onSave, isSaving, disabled }: ConfirmOrderButtonProps) {
  const t = useTranslations('common')
  const { goNext } = useMorphingModal()

  const handleClick = () => {
    goNext()
    onSave()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={disabled}
    >
      {isSaving ? <Spinner /> : t('confirm')}
    </button>
  )
}

// ============================================
// COMPONENT
// ============================================

export function NewOrderModal({
  isOpen,
  onClose,
  providers,
  filteredProducts,
  orderItems,
  onToggleProduct,
  onUpdateQuantity,
  setOrderItems,
  orderTotal,
  onOrderTotalChange,
  orderNotes,
  onOrderNotesChange,
  orderEstimatedArrival,
  onOrderEstimatedArrivalChange,
  orderReceiptFile,
  onOrderReceiptFileChange,
  orderReceiptPreview,
  onOrderReceiptPreviewChange,
  orderProvider,
  onOrderProviderChange,
  productSearchQuery,
  onProductSearchQueryChange,
  isSaving,
  error,
  orderSaved,
  onSaveOrder,
  onResetForm,
}: NewOrderModalProps) {
  const t = useTranslations('orders')
  const tCommon = useTranslations('common')
  const { formatCurrency, formatDate } = useBusinessFormat()
  const receiptInputRef = useRef<HTMLInputElement>(null)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onResetForm}
      title={t('new_order_title')}
      size="large"
    >
      {/* Step 1: Select Products */}
      <Modal.Step title={t('step_select_products')}>
        {/* Search bar */}
        <Modal.Item>
          <div className="search-bar">
            <Search className="search-bar-icon" />
            <input
              type="text"
              placeholder={t('product_search_placeholder')}
              value={productSearchQuery}
              onChange={e => onProductSearchQueryChange(e.target.value)}
              className="search-bar-input"
            />
          </div>
        </Modal.Item>

        {/* Products list - compact horizontal cards */}
        <Modal.Item>
          <div className="space-y-2">
            {filteredProducts.map(product => {
              const isSelected = orderItems.some(i => i.product.id === product.id)
              const stockValue = product.stock ?? 0
              const isOutOfStock = stockValue === 0
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onToggleProduct(product)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
                  style={{
                    border: `1px solid ${isSelected ? 'var(--color-brand)' : 'var(--color-border)'}`,
                    backgroundColor: isSelected ? 'var(--color-brand-subtle)' : 'var(--color-bg-surface)',
                  }}
                >
                  {/* Product image */}
                  <div className="w-10 h-10 rounded-lg bg-bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getProductIconUrl(product) ? (
                      <Image
                        src={getProductIconUrl(product)!}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-text-tertiary" />
                    )}
                  </div>
                  {/* Product name and stock */}
                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-sm font-medium truncate block">
                      {product.name}
                    </span>
                    <span className={`text-xs ${isOutOfStock ? 'text-error' : 'text-text-tertiary'}`}>
                      {t('item_unit_count', { count: stockValue })}
                    </span>
                  </div>
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </Modal.Item>

        <Modal.Footer>
          <div className="w-full flex flex-col gap-3">
            {/* Summary */}
            <div className={`flex items-center justify-center p-2 rounded-lg ${
              orderItems.length > 0 ? 'bg-brand-subtle' : 'bg-bg-muted'
            }`}>
              <span className={`text-sm font-medium ${
                orderItems.length > 0 ? 'text-brand' : 'text-text-tertiary'
              }`}>
                {t('products_selected', { count: orderItems.length })}
              </span>
            </div>
            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary flex-1"
              >
                {tCommon('cancel')}
              </button>
              <Modal.NextButton
                className="btn btn-primary flex-1"
                disabled={orderItems.length === 0}
              >
                {tCommon('continue')}
              </Modal.NextButton>
            </div>
          </div>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Review Quantities */}
      <Modal.Step title={t('step_review_quantities')}>
        <Modal.Item>
          <div className="space-y-3">
            {orderItems.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
                {/* Product image */}
                <div className="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                  {getProductIconUrl(item.product) ? (
                    <Image
                      src={getProductIconUrl(item.product)!}
                      alt={item.product.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                {/* Product name */}
                <span className="flex-1 text-sm font-medium truncate min-w-0">
                  {item.product.name}
                </span>
                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 ${
                      item.quantity <= 1 ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'
                    }`}
                  >
                    <MinusCircle className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') {
                        setOrderItems(prev => prev.map(i =>
                          i.product.id === item.product.id
                            ? { ...i, quantity: '' as unknown as number }
                            : i
                        ))
                      } else {
                        const num = parseInt(val, 10)
                        if (!isNaN(num)) {
                          onUpdateQuantity(item.product.id, Math.max(1, num))
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (isNaN(val) || val < 1) {
                        onUpdateQuantity(item.product.id, 1)
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-10 text-center font-semibold bg-primary text-text-primary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 active:scale-90"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal.Item>

        <Modal.Footer>
          <div className="w-full flex flex-col gap-3">
            {/* Summary */}
            <div className="flex items-center justify-center p-2 bg-bg-muted rounded-lg">
              <span className="text-sm font-medium text-text-secondary">
                {t('units_total', { count: orderItems.reduce((sum, i) => sum + i.quantity, 0) })}
              </span>
            </div>
            {/* Buttons */}
            <div className="flex gap-3">
              <Modal.BackButton className="btn btn-secondary flex-1">
                {tCommon('back')}
              </Modal.BackButton>
              <Modal.NextButton className="btn btn-primary flex-1">
                {tCommon('continue')}
              </Modal.NextButton>
            </div>
          </div>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Order Details */}
      <Modal.Step title={t('step_order_details')}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Total & Provider - inline */}
        <Modal.Item>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="orderTotal" className="label">{t('total_paid_label')} <span className="text-error">*</span></label>
              <div className="input-number-wrapper">
                <PriceInput
                  id="orderTotal"
                  value={orderTotal}
                  onValueChange={onOrderTotalChange}
                  placeholder="0"
                />
                <div className="input-number-spinners">
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(orderTotal) || 0
                      onOrderTotalChange((current + 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label={t('increase_total_aria')}
                  >
                    <ArrowUp />
                  </button>
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(orderTotal) || 0
                      onOrderTotalChange(Math.max(0, current - 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label={t('decrease_total_aria')}
                  >
                    <ArrowDown />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="orderProvider" className="label">{t('provider_label')}</label>
              <div className="relative">
                <select
                  id="orderProvider"
                  value={orderProvider}
                  onChange={e => onOrderProviderChange(e.target.value)}
                  className={`input w-full pr-10 ${!orderProvider ? 'text-text-tertiary' : ''}`}
                  style={{ backgroundImage: 'none', WebkitAppearance: 'none', appearance: 'none' }}
                >
                  <option value="">{t('provider_none')}</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </Modal.Item>

        {/* Estimated Arrival */}
        <Modal.Item>
          <label className="label">{t('estimated_arrival_label')}</label>
          <div className="relative">
            <div className={`input w-full flex items-center justify-between pointer-events-none ${orderEstimatedArrival ? 'text-text-primary' : 'text-text-tertiary'}`}>
              <span>{orderEstimatedArrival ? formatDate(orderEstimatedArrival) : t('select_date_placeholder')}</span>
              <CalendarClock className="w-5 h-5 text-text-tertiary" />
            </div>
            <input
              type="date"
              value={orderEstimatedArrival}
              onChange={e => onOrderEstimatedArrivalChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </Modal.Item>

        {/* Receipt/Proof of Purchase */}
        <Modal.Item>
          <label className="label">{t('receipt_label')}</label>
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) {
                onOrderReceiptFileChange(file)
                if (file.type.startsWith('image/')) {
                  const reader = new FileReader()
                  reader.onload = () => onOrderReceiptPreviewChange(reader.result as string)
                  reader.readAsDataURL(file)
                } else {
                  onOrderReceiptPreviewChange(null)
                }
              }
            }}
            className="hidden"
          />
          {orderReceiptPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={orderReceiptPreview}
                alt="Receipt"
                className="w-full h-40 object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => {
                  onOrderReceiptFileChange(null)
                  onOrderReceiptPreviewChange(null)
                  if (receiptInputRef.current) receiptInputRef.current.value = ''
                }}
                className="absolute top-2 right-2 p-1 bg-bg-surface rounded-full border border-border"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : orderReceiptFile ? (
            <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
              <span className="text-sm text-text-secondary truncate flex-1 min-w-0">{orderReceiptFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  onOrderReceiptFileChange(null)
                  if (receiptInputRef.current) receiptInputRef.current.value = ''
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => receiptInputRef.current?.click()}
              className="input w-full text-left text-text-tertiary flex items-center justify-between"
            >
              <span>{t('receipt_attach_placeholder')}</span>
              <ImageIcon className="w-5 h-5" />
            </button>
          )}
        </Modal.Item>

        {/* Notes */}
        <Modal.Item>
          <label htmlFor="orderNotes" className="label">{t('notes_label')}</label>
          <textarea
            id="orderNotes"
            value={orderNotes}
            onChange={e => onOrderNotesChange(e.target.value)}
            className="input"
            rows={2}
            placeholder={t('notes_placeholder')}
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1">
            {tCommon('back')}
          </Modal.BackButton>
          <Modal.NextButton
            className="btn btn-primary flex-1"
            disabled={!orderTotal || parseFloat(orderTotal) <= 0}
          >
            {t('review_button')}
          </Modal.NextButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Confirmation */}
      <Modal.Step title={t('step_confirm_order')}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Products list - compact */}
        <Modal.Item>
          <div className="space-y-1">
            {orderItems.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-text-secondary">{item.product.name}</span>
                <span className="text-text-secondary">{item.quantity}x</span>
              </div>
            ))}
          </div>
        </Modal.Item>

        {/* Divider */}
        <Modal.Item>
          <div className="border-t border-dashed border-border" />
        </Modal.Item>

        {/* Details */}
        <Modal.Item>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t('total_label')}</span>
              <span className="font-semibold">{orderTotal ? formatCurrency(parseFloat(orderTotal)) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t('provider_label')}</span>
              <span>{providers.find(p => p.id === orderProvider)?.name || '-'}</span>
            </div>
            {orderEstimatedArrival && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">{t('est_arrival_label')}</span>
                <span>{formatDate(orderEstimatedArrival)}</span>
              </div>
            )}
            {orderReceiptFile && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">{t('receipt_attached_label')}</span>
                <span className="text-success">{t('receipt_attached_value')}</span>
              </div>
            )}
            {orderNotes && (
              <div className="flex justify-between">
                <span className="text-text-tertiary">{t('notes_review_label')}</span>
                <span className="text-right max-w-[60%] truncate">{orderNotes}</span>
              </div>
            )}
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.BackButton className="btn btn-secondary flex-1" disabled={isSaving}>
            {tCommon('back')}
          </Modal.BackButton>
          <ConfirmOrderButton onSave={onSaveOrder} isSaving={isSaving} disabled={isSaving} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 5: Success */}
      <Modal.Step title={t('new_order_success_title')} hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {orderSaved && (
                <LottiePlayer
                  src="/animations/success.json"
                  loop={false}
                  autoplay={true}
                  delay={300}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
              style={{ opacity: orderSaved ? 1 : 0 }}
            >
              {t('new_order_success_heading')}
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: orderSaved ? 1 : 0 }}
            >
              {t('new_order_success_description')}
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
