import { useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { ImagePlus, Trash2 } from 'lucide-react'
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

function PlusGlyph({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M12 5v14" />
    </svg>
  )
}
function MinusGlyph({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
    </svg>
  )
}
function ChevronDownGlyph({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

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

  const hasChanges = JSON.stringify({
    items: orderItems.map(i => ({ id: i.product.id, qty: i.quantity })),
    total: orderTotal,
    provider: orderProvider,
    arrival: orderEstimatedArrival,
    hasReceipt: !!orderReceiptFile,
  }) !== initialEditSnapshot

  const isDisabled = isSaving || orderItems.length === 0 || !orderTotal || parseFloat(orderTotal) <= 0 || !hasChanges

  const handleSave = async () => {
    const success = await onSaveEditOrder()
    if (success) {
      navRef.current?.push(() => <EditOrderSuccessStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {!openedFromSwipe && (
            <IonButtons slot="start">
              <IonBackButton defaultHref="" />
            </IonButtons>
          )}
          <IonTitle>{t.formatMessage({ id: 'orders.edit_order_title' })}</IonTitle>
          {openedFromSwipe && (
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={onClose} aria-label={t.formatMessage({ id: 'common.close' })}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">{error}</div>
        )}

        <p className="text-xs text-text-tertiary mb-3">
          {t.formatMessage({ id: 'orders.products_selected' }, { count: orderItems.length })}
        </p>

        {/* Product selection */}
        <div className="space-y-2 mb-4">
          {(order.expand?.['order_items(order)'] || []).map(origItem => {
            const product = productsById.get(origItem.productId ?? '')
            if (!product) return null
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
                <button
                  type="button"
                  onClick={() => onToggleProduct(product)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="product-list-image">
                    {(() => {
                      const iconUrl = getProductIconUrl(product)
                      if (iconUrl && isPresetIcon(iconUrl)) {
                        const p = getPresetIcon(iconUrl)
                        return p ? <p.icon size={24} className="text-text-primary" /> : null
                      }
                      if (iconUrl) {
                        return (
                          <Image src={iconUrl} alt={product.name} width={48} height={48} className="product-list-image-img" unoptimized />
                        )
                      }
                      return <ImagePlus className="w-5 h-5 text-text-tertiary" />
                    })()}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-sm font-medium truncate block">{product.name}</span>
                    <span className={`text-xs ${isOutOfStock ? 'text-error' : 'text-text-tertiary'}`}>
                      {t.formatMessage({ id: 'orders.item_unit_count' }, { count: stockValue })}
                    </span>
                  </div>
                </button>
                {isSelected && orderItem && (
                  <div className="flex-shrink-0 flex rounded-lg overflow-hidden bg-bg-muted" style={{ height: 48 }}>
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
                      className="w-10 text-center text-sm font-semibold bg-bg-muted text-text-primary focus:outline-none"
                    />
                    <div className="flex flex-col" style={{ borderLeft: '1px solid var(--color-border)' }}>
                      <button type="button" onClick={() => onUpdateQuantity(product.id, orderItem.quantity + 1)} className="flex-1 flex items-center justify-center px-2 bg-bg-muted transition-colors active:bg-bg-surface" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <PlusGlyph className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => onUpdateQuantity(product.id, orderItem.quantity - 1)} disabled={orderItem.quantity <= 1} className="flex-1 flex items-center justify-center px-2 bg-bg-muted transition-colors active:bg-bg-surface disabled:opacity-40 disabled:cursor-not-allowed">
                        <MinusGlyph className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <hr className="border-border mb-4" />

        {/* Total & Provider */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="editOrderTotal" className="label">
              {t.formatMessage({ id: 'orders.total_paid_label' })} <span className="text-error">*</span>
            </label>
            <div className="input-number-wrapper">
              <PriceInput id="editOrderTotal" value={orderTotal} onValueChange={onOrderTotalChange} placeholder="0" />
              <div className="input-number-spinners">
                <button type="button" className="input-number-spinner" onClick={() => { const c = parseFloat(orderTotal) || 0; onOrderTotalChange((c + 1).toFixed(2)) }} tabIndex={-1} aria-label={t.formatMessage({ id: 'orders.increase_total_aria' })}><PlusGlyph /></button>
                <button type="button" className="input-number-spinner" onClick={() => { const c = parseFloat(orderTotal) || 0; onOrderTotalChange(Math.max(0, c - 1).toFixed(2)) }} tabIndex={-1} aria-label={t.formatMessage({ id: 'orders.decrease_total_aria' })}><MinusGlyph /></button>
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="editOrderProvider" className="label">{t.formatMessage({ id: 'orders.provider_label' })}</label>
            <div className="relative">
              <select id="editOrderProvider" value={orderProvider} onChange={e => onOrderProviderChange(e.target.value)} className={`input w-full pr-10 ${!orderProvider ? 'text-text-tertiary' : ''}`} style={{ backgroundImage: 'none', WebkitAppearance: 'none', appearance: 'none' }}>
                <option value="">{t.formatMessage({ id: 'orders.provider_none' })}</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDownGlyph className="text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Estimated Arrival */}
        <div className="mb-4">
          <label className="label">{t.formatMessage({ id: 'orders.estimated_arrival_label' })}</label>
          <div className="relative">
            <div className="input w-full flex items-center pointer-events-none">
              <span className={orderEstimatedArrival ? 'text-text-primary' : 'text-text-tertiary'}>
                {orderEstimatedArrival ? formatDate(orderEstimatedArrival) : t.formatMessage({ id: 'orders.select_date_placeholder' })}
              </span>
            </div>
            <input type="date" value={orderEstimatedArrival} onChange={e => onOrderEstimatedArrivalChange(e.target.value)} className="input absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
        </div>

        {/* Receipt */}
        <div>
          <label className="label">{t.formatMessage({ id: 'orders.receipt_label' })}</label>
          <input
            ref={editReceiptInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            onChange={async e => {
              setEditReceiptError('')
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
              if (!isHeic && !ACCEPTED_RECEIPT_TYPES.includes(file.type)) { setEditReceiptError(t.formatMessage({ id: 'orders.receipt_invalid_type' })); return }
              if (file.size > MAX_RECEIPT_BYTES) { setEditReceiptError(t.formatMessage({ id: 'orders.receipt_too_large' })); return }
              onOrderReceiptFileChange(file)
              if (isHeic) {
                try { const fd = new FormData(); fd.append('file', file); const data = await apiPostForm<{ data?: { image?: string } }>('/api/convert-heic', fd); if (data.data?.image) { onOrderReceiptPreviewChange(data.data.image) } else { onOrderReceiptPreviewChange(null) } } catch { onOrderReceiptPreviewChange(null) }
              } else if (file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = () => onOrderReceiptPreviewChange(reader.result as string); reader.readAsDataURL(file) } else { onOrderReceiptPreviewChange(null) }
            }}
            className="hidden"
          />
          {orderReceiptFile ? (
            <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
              {orderReceiptPreview ? (
                <img src={orderReceiptPreview} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-bg-surface flex items-center justify-center flex-shrink-0"><ImagePlus className="w-5 h-5 text-text-tertiary" /></div>
              )}
              <span className="text-sm text-text-secondary truncate flex-1 min-w-0">{orderReceiptFile.name}</span>
              <button type="button" onClick={() => { onOrderReceiptFileChange(null); onOrderReceiptPreviewChange(null); if (editReceiptInputRef.current) editReceiptInputRef.current.value = '' }} className="p-1 text-error hover:text-error transition-colors flex-shrink-0" aria-label={t.formatMessage({ id: 'common.remove' })}>
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => editReceiptInputRef.current?.click()} className="image-upload-zone">
              <ImagePlus className="w-6 h-6 text-text-tertiary" />
              <span className="text-sm text-text-tertiary mt-2">{t.formatMessage({ id: 'orders.receipt_attach_placeholder' })}</span>
            </button>
          )}
          <p className="text-xs text-text-tertiary mt-2">{t.formatMessage({ id: 'orders.receipt_hint' })}</p>
          {editReceiptError && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mt-2">{editReceiptError}</div>
          )}
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          {/* Toolbar X dismisses (or back button navigates back when not
              openedFromSwipe), so the footer is primary-only. */}
          <div className="modal-footer">
            <IonButton onClick={handleSave} disabled={isDisabled}>
              {isSaving ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.save' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
