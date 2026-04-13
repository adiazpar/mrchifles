'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ImageIcon, ChevronDown, CalendarClock, Minus, Plus, Loader2 } from 'lucide-react'
import { Spinner, Modal, useMorphingModal, PriceInput } from '@/components/ui'
import { ImageAttachIcon, BarcodeScanIcon, TrashIcon } from '@/components/icons'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { useTranslations } from 'next-intl'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { Product, Provider } from '@/types'
import type { OrderFormItem } from '@/lib/products'

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

// ============================================
// PROPS INTERFACE
// ============================================

export interface NewOrderModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void

  // Products and providers
  products: Product[]
  providers: Provider[]
  filteredProducts: Product[]

  // Form state
  orderItems: OrderFormItem[]
  onToggleProduct: (product: Product) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  setOrderItems: React.Dispatch<React.SetStateAction<OrderFormItem[]>>

  orderTotal: string
  onOrderTotalChange: (total: string) => void
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
  products,
  providers,
  filteredProducts,
  orderItems,
  onToggleProduct,
  onUpdateQuantity,
  setOrderItems,
  orderTotal,
  onOrderTotalChange,
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
  const [scanError, setScanError] = useState('')
  const [receiptError, setReceiptError] = useState('')

  const handleScanResult = useCallback(({ value }: { value: string }) => {
    setScanError('')
    const match = products.find(p => p.barcode === value)
    if (match) {
      // Only add if not already selected
      if (!orderItems.some(i => i.product.id === match.id)) {
        onToggleProduct(match)
      }
    } else {
      setScanError(t('scan_no_match'))
    }
  }, [products, orderItems, onToggleProduct, t])

  const { open: openScanner, busy: scanBusy, hiddenInput: scanHiddenInput } = useBarcodeScan({
    onResult: handleScanResult,
    onError: (message) => setScanError(message),
  })

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
        {/* Search bar + scan button */}
        <Modal.Item>
          <div className="flex gap-2 items-stretch">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t('product_search_placeholder')}
                value={productSearchQuery}
                onChange={e => onProductSearchQueryChange(e.target.value)}
                className="input w-full h-full"
                style={{ paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingRight: '2.25rem', fontSize: 'var(--text-sm)', minHeight: 'unset' }}
              />
              {productSearchQuery && (
                <button
                  type="button"
                  onClick={() => onProductSearchQueryChange('')}
                  className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
                  aria-label={t('search_clear')}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setScanError(''); openScanner() }}
              disabled={scanBusy}
              className="btn btn-secondary btn-icon flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('scan_button_aria')}
            >
              {scanBusy ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : (
                <BarcodeScanIcon size={18} />
              )}
            </button>
          </div>
          {scanHiddenInput}
          {scanError && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mt-2">{scanError}</div>
          )}
        </Modal.Item>

        <Modal.Item>
          <p className="text-xs text-text-tertiary">
            {t('products_selected', { count: orderItems.length })}
          </p>
        </Modal.Item>

        {/* Products list - compact horizontal cards */}
        <Modal.Item>
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-text-tertiary">{t('no_products_found')}</p>
            </div>
          ) : (
          <div className="space-y-2">
            {filteredProducts.map(product => {
              const orderItem = orderItems.find(i => i.product.id === product.id)
              const isSelected = !!orderItem
              const stockValue = product.stock ?? 0
              const isOutOfStock = stockValue === 0
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
                  style={{
                    border: `1px solid ${isSelected ? 'var(--color-brand)' : 'var(--color-border)'}`,
                    backgroundColor: isSelected ? 'var(--color-brand-subtle)' : 'var(--color-bg-surface)',
                  }}
                >
                  {/* Tap target for selecting/deselecting */}
                  <button
                    type="button"
                    onClick={() => onToggleProduct(product)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {/* Product image */}
                    <div className="product-list-image">
                      {(() => {
                        const iconUrl = getProductIconUrl(product)
                        if (iconUrl && isPresetIcon(iconUrl)) {
                          const p = getPresetIcon(iconUrl)
                          return p ? <p.icon size={24} className="text-text-primary" /> : null
                        }
                        if (iconUrl) {
                          return (
                            <Image
                              src={iconUrl}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="product-list-image-img"
                              unoptimized
                            />
                          )
                        }
                        return <ImageAttachIcon className="w-5 h-5 text-text-tertiary" />
                      })()}
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
                  </button>
                  {/* Quantity control - single rectangle matching icon height */}
                  {isSelected && orderItem && (
                    <div
                      className="flex-shrink-0 flex rounded-lg overflow-hidden bg-bg-muted"
                      style={{ height: 48 }}
                    >
                      {/* Quantity input - left half */}
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={orderItem.quantity}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') {
                            setOrderItems(prev => prev.map(i =>
                              i.product.id === product.id
                                ? { ...i, quantity: '' as unknown as number }
                                : i
                            ))
                          } else {
                            const num = parseInt(val, 10)
                            if (!isNaN(num)) {
                              onUpdateQuantity(product.id, Math.max(1, num))
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10)
                          if (isNaN(val) || val < 1) {
                            onUpdateQuantity(product.id, 1)
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-10 text-center text-sm font-semibold bg-bg-muted text-text-primary focus:outline-none"
                      />
                      {/* +/- buttons - right half, stacked */}
                      <div className="flex flex-col" style={{ borderLeft: '1px solid var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, orderItem.quantity + 1)}
                          className="flex-1 flex items-center justify-center px-2 bg-bg-muted transition-colors active:bg-bg-surface"
                          style={{ borderBottom: '1px solid var(--color-border)' }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, orderItem.quantity - 1)}
                          disabled={orderItem.quantity <= 1}
                          className="flex-1 flex items-center justify-center px-2 bg-bg-muted transition-colors active:bg-bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          )}
        </Modal.Item>

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
            disabled={orderItems.length === 0}
          >
            {tCommon('continue')}
          </Modal.NextButton>
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
                    <Plus />
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
                    <Minus />
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
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            onChange={async e => {
              setReceiptError('')
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return

              const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
                || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')

              if (!isHeic && !ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
                setReceiptError(t('receipt_invalid_type'))
                return
              }
              if (file.size > MAX_RECEIPT_BYTES) {
                setReceiptError(t('receipt_too_large'))
                return
              }

              onOrderReceiptFileChange(file)

              if (isHeic) {
                // Convert HEIC to displayable format via server
                try {
                  const fd = new FormData()
                  fd.append('file', file)
                  const res = await fetch('/api/convert-heic', { method: 'POST', body: fd })
                  const data = await res.json()
                  if (data.success && data.data?.image) {
                    onOrderReceiptPreviewChange(data.data.image)
                  } else {
                    onOrderReceiptPreviewChange(null)
                  }
                } catch {
                  onOrderReceiptPreviewChange(null)
                }
              } else if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onload = () => onOrderReceiptPreviewChange(reader.result as string)
                reader.readAsDataURL(file)
              } else {
                onOrderReceiptPreviewChange(null)
              }
            }}
            className="hidden"
          />
          {orderReceiptFile ? (
            <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
              {/* Thumbnail */}
              {orderReceiptPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orderReceiptPreview}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-bg-surface flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-5 h-5 text-text-tertiary" />
                </div>
              )}
              {/* Filename */}
              <span className="text-sm text-text-secondary truncate flex-1 min-w-0">
                {orderReceiptFile.name}
              </span>
              {/* Remove */}
              <button
                type="button"
                onClick={() => {
                  onOrderReceiptFileChange(null)
                  onOrderReceiptPreviewChange(null)
                  if (receiptInputRef.current) receiptInputRef.current.value = ''
                }}
                className="p-1 text-error hover:text-error transition-colors flex-shrink-0"
                aria-label={tCommon('remove')}
              >
                <TrashIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => receiptInputRef.current?.click()}
              className="image-upload-zone"
            >
              <ImageAttachIcon className="w-6 h-6 text-text-tertiary" />
              <span className="text-sm text-text-tertiary mt-2">{t('receipt_attach_placeholder')}</span>
            </button>
          )}
          <p className="text-xs text-text-tertiary mt-2">{t('receipt_hint')}</p>
          {receiptError && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mt-2">{receiptError}</div>
          )}
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
