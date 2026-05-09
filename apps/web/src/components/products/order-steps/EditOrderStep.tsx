import { useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import {
  CalendarClock,
  ChevronDown,
  ImageIcon,
  ImagePlus,
  Minus,
  Plus,
  Trash2,
  Package,
} from 'lucide-react'
import Image from '@/lib/Image'
import { PriceInput } from '@/components/ui'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { apiPostForm } from '@/lib/api-client'
import { useOrderNavRef, useOrderDetailCallbacks } from './OrderNavContext'
import { EditOrderSuccessStep } from './EditOrderSuccessStep'

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
const ACCEPTED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

export function EditOrderStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatDate } = useBusinessFormat()
  const {
    order,
    products,
    providers,
    orderItems,
    setOrderItems,
    onToggleProduct,
    onUpdateQuantity,
    orderTotal,
    onOrderTotalChange,
    orderEstimatedArrival,
    onOrderEstimatedArrivalChange,
    orderProvider,
    onOrderProviderChange,
    orderReceiptFile,
    onOrderReceiptFileChange,
    orderReceiptPreview,
    onOrderReceiptPreviewChange,
    isSaving,
    error,
    onSaveEditOrder,
    initialEditSnapshot,
    onClose,
    openedFromSwipe,
  } = useOrderDetailCallbacks()

  const productsById = new Map(products.map(p => [p.id, p]))
  const editReceiptInputRef = useRef<HTMLInputElement>(null)
  const [editReceiptError, setEditReceiptError] = useState('')

  const orderRef = order.orderNumber != null
    ? `#${String(order.orderNumber).padStart(4, '0')}`
    : `#${order.id.slice(0, 6).toUpperCase()}`

  const hasChanges = JSON.stringify({
    items: orderItems.map(i => ({ id: i.product.id, qty: i.quantity })),
    total: orderTotal,
    provider: orderProvider,
    arrival: orderEstimatedArrival,
    hasReceipt: !!orderReceiptFile,
  }) !== initialEditSnapshot

  const isDisabled =
    isSaving || orderItems.length === 0 || !orderTotal || parseFloat(orderTotal) <= 0 || !hasChanges

  const handleSave = async () => {
    const success = await onSaveEditOrder()
    if (success) {
      navRef.current?.push(() => <EditOrderSuccessStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          {!openedFromSwipe && (
            <IonButtons slot="start">
              <IonBackButton defaultHref="" />
            </IonButtons>
          )}
          {openedFromSwipe && (
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={onClose} aria-label={t.formatMessage({ id: 'common.close' })}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="wizard-content">
        <div className="wizard-step">
          <header className="wizard-hero">
            <div className="order-modal__eyebrow">
              <span>{t.formatMessage({ id: 'orders.eyebrow_edit' })}</span>
              <span className="order-modal__eyebrow-dot">·</span>
              <span className="order-modal__eyebrow-id">{orderRef}</span>
            </div>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.edit_hero_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'orders.edit_hero_subtitle' })}
            </p>
          </header>

          {error && (
            <div className="order-modal__error" role="alert">{error}</div>
          )}

          {/* Section eyebrow */}
          <div className="order-select__section-eyebrow">
            <span>{t.formatMessage({ id: 'orders.eyebrow_line_items' })}</span>
            <span className="order-select__section-count">
              {t.formatMessage(
                { id: 'orders.products_selected_short' },
                { count: orderItems.length },
              )}
            </span>
          </div>

          {/* Product list — restricted to original line items (cannot add new) */}
          <div className="order-select__list">
            {(order.expand?.['order_items(order)'] || []).map(origItem => {
              const product = productsById.get(origItem.productId ?? '')
              if (!product) return null
              const orderItem = orderItems.find(i => i.product.id === product.id)
              const isSelected = !!orderItem
              const stockValue = product.stock ?? 0
              const isOutOfStock = stockValue === 0
              const iconUrl = getProductIconUrl(product)
              const presetIcon = iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null
              return (
                <div
                  key={product.id}
                  className="order-product-row"
                  data-selected={isSelected || undefined}
                >
                  <button
                    type="button"
                    onClick={() => onToggleProduct(product)}
                    className="order-product-row__pick"
                  >
                    <span className="order-product-row__icon">
                      {presetIcon ? (
                        <presetIcon.icon size={22} className="text-text-primary" />
                      ) : iconUrl ? (
                        <Image src={iconUrl} alt={product.name} width={44} height={44} unoptimized />
                      ) : (
                        <Package size={18} strokeWidth={1.6} className="text-text-tertiary" />
                      )}
                    </span>
                    <span className="order-product-row__body">
                      <span className="order-product-row__name">{product.name}</span>
                      <span
                        className={`order-product-row__stock${
                          isOutOfStock ? ' order-product-row__stock--out' : ''
                        }`}
                      >
                        {t.formatMessage(
                          { id: 'orders.item_unit_count' },
                          { count: stockValue },
                        )}
                      </span>
                    </span>
                  </button>
                  {isSelected && orderItem && (
                    <div className="order-product-row__qty">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, orderItem.quantity - 1)}
                        disabled={orderItem.quantity <= 1}
                        className="order-product-row__qty-button order-product-row__qty-button--minus"
                        aria-label={t.formatMessage({ id: 'orders.decrease_qty_aria' })}
                      >
                        <Minus size={14} strokeWidth={2} />
                      </button>
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
                              i.product.id === product.id ? { ...i, quantity: '' as unknown as number } : i
                            ))
                          } else {
                            const num = parseInt(val, 10)
                            if (!isNaN(num)) onUpdateQuantity(product.id, Math.max(1, num))
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10)
                          if (isNaN(val) || val < 1) onUpdateQuantity(product.id, 1)
                        }}
                        onFocus={(e) => e.target.select()}
                        className="order-product-row__qty-input"
                        aria-label={t.formatMessage({ id: 'orders.qty_aria' })}
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, orderItem.quantity + 1)}
                        className="order-product-row__qty-button order-product-row__qty-button--plus"
                        aria-label={t.formatMessage({ id: 'orders.increase_qty_aria' })}
                      >
                        <Plus size={14} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Section eyebrow */}
          <div className="order-select__section-eyebrow">
            <span>{t.formatMessage({ id: 'orders.eyebrow_order_meta' })}</span>
          </div>

          {/* Total & Provider */}
          <div className="order-details__grid">
            <div className="order-details__field">
              <label htmlFor="editOrderTotal" className="order-details__label order-details__label--required">
                {t.formatMessage({ id: 'orders.total_paid_label' })}
              </label>
              <div className="input-number-wrapper">
                <PriceInput
                  id="editOrderTotal"
                  value={orderTotal}
                  onValueChange={onOrderTotalChange}
                  placeholder="0"
                />
                <div className="input-number-spinners">
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const c = parseFloat(orderTotal) || 0
                      onOrderTotalChange((c + 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label={t.formatMessage({ id: 'orders.increase_total_aria' })}
                  >
                    <Plus />
                  </button>
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const c = parseFloat(orderTotal) || 0
                      onOrderTotalChange(Math.max(0, c - 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label={t.formatMessage({ id: 'orders.decrease_total_aria' })}
                  >
                    <Minus />
                  </button>
                </div>
              </div>
            </div>
            <div className="order-details__field">
              <label htmlFor="editOrderProvider" className="order-details__label">
                {t.formatMessage({ id: 'orders.provider_label' })}
              </label>
              <div className="order-details__select-wrap">
                <select
                  id="editOrderProvider"
                  value={orderProvider}
                  onChange={e => onOrderProviderChange(e.target.value)}
                  className={`input w-full pr-10 ${!orderProvider ? 'text-text-tertiary' : ''}`}
                  style={{ backgroundImage: 'none', WebkitAppearance: 'none', appearance: 'none' }}
                >
                  <option value="">{t.formatMessage({ id: 'orders.provider_none' })}</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span className="order-details__select-chevron">
                  <ChevronDown size={18} strokeWidth={1.8} />
                </span>
              </div>
            </div>
          </div>

          {/* Estimated Arrival */}
          <div className="order-details__field">
            <label className="order-details__label">
              {t.formatMessage({ id: 'orders.estimated_arrival_label' })}
            </label>
            <div className="order-details__date-wrap">
              <div
                className={`order-details__date-display${
                  orderEstimatedArrival ? '' : ' order-details__date-display--placeholder'
                }`}
              >
                {orderEstimatedArrival
                  ? formatDate(orderEstimatedArrival)
                  : t.formatMessage({ id: 'orders.select_date_placeholder' })}
              </div>
              <span className="order-details__date-display-icon">
                <CalendarClock size={18} strokeWidth={1.8} />
              </span>
              <input
                type="date"
                value={orderEstimatedArrival}
                onChange={e => onOrderEstimatedArrivalChange(e.target.value)}
                className="order-details__date-input"
                aria-label={t.formatMessage({ id: 'orders.estimated_arrival_label' })}
              />
            </div>
          </div>

          {/* Receipt */}
          <div className="order-details__field">
            <label className="order-details__label">
              {t.formatMessage({ id: 'orders.receipt_label' })}
            </label>
            <input
              ref={editReceiptInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
              onChange={async e => {
                setEditReceiptError('')
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
                  || file.name.toLowerCase().endsWith('.heic')
                  || file.name.toLowerCase().endsWith('.heif')
                if (!isHeic && !ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
                  setEditReceiptError(t.formatMessage({ id: 'orders.receipt_invalid_type' }))
                  return
                }
                if (file.size > MAX_RECEIPT_BYTES) {
                  setEditReceiptError(t.formatMessage({ id: 'orders.receipt_too_large' }))
                  return
                }
                onOrderReceiptFileChange(file)
                if (isHeic) {
                  try {
                    const fd = new FormData()
                    fd.append('file', file)
                    const data = await apiPostForm<{ data?: { image?: string } }>('/api/convert-heic', fd)
                    if (data.data?.image) {
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
              <div className="order-details__receipt-attached">
                {orderReceiptPreview ? (
                  <img
                    src={orderReceiptPreview}
                    alt=""
                    className="order-details__receipt-thumb"
                  />
                ) : (
                  <div className="order-details__receipt-thumb order-details__receipt-thumb--placeholder">
                    <ImageIcon size={18} strokeWidth={1.6} />
                  </div>
                )}
                <span className="order-details__receipt-name">{orderReceiptFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    onOrderReceiptFileChange(null)
                    onOrderReceiptPreviewChange(null)
                    if (editReceiptInputRef.current) editReceiptInputRef.current.value = ''
                  }}
                  className="order-details__receipt-remove"
                  aria-label={t.formatMessage({ id: 'common.remove' })}
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => editReceiptInputRef.current?.click()}
                className="order-details__receipt-tile"
              >
                <ImagePlus size={22} strokeWidth={1.5} />
                <span className="order-details__receipt-tile-label">
                  {t.formatMessage({ id: 'orders.receipt_attach_placeholder' })}
                </span>
              </button>
            )}
            <p className="order-details__receipt-hint">
              {t.formatMessage({ id: 'orders.receipt_hint' })}
            </p>
            {editReceiptError && (
              <div className="order-modal__error" role="alert">{editReceiptError}</div>
            )}
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={handleSave}
              disabled={isDisabled}
            >
              {isSaving ? (
                <span className="order-modal__pill-spinner" aria-label={t.formatMessage({ id: 'common.loading' })} />
              ) : (
                t.formatMessage({ id: 'common.save' })
              )}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
