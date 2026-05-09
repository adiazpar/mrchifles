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
} from '@ionic/react'
import { CalendarClock, ChevronDown, ImageIcon, ImagePlus, Minus, Plus, Trash2 } from 'lucide-react'
import { PriceInput } from '@/components/ui'
import { apiPostForm } from '@/lib/api-client'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNavRef, useNewOrderCallbacks } from './OrderNavContext'
import { ConfirmOrderStep } from './ConfirmOrderStep'

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
const ACCEPTED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

export function OrderDetailsStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatDate } = useBusinessFormat()
  const {
    providers,
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
    error,
  } = useNewOrderCallbacks()

  const receiptInputRef = useRef<HTMLInputElement>(null)
  const [receiptError, setReceiptError] = useState('')

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="wizard-content">
        <div className="wizard-step">
          <header className="wizard-hero">
            <div className="order-modal__eyebrow">
              <span>{t.formatMessage({ id: 'orders.eyebrow_order' })}</span>
              <span className="order-modal__eyebrow-dot">·</span>
              <span className="order-modal__eyebrow-emphasis">
                {t.formatMessage({ id: 'orders.eyebrow_details' })}
              </span>
            </div>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.details_hero_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'orders.details_hero_subtitle' })}
            </p>
          </header>

          {error && (
            <div className="order-modal__error" role="alert">{error}</div>
          )}

          {/* Total & Provider */}
          <div className="order-details__grid">
            <div className="order-details__field">
              <label htmlFor="orderTotal" className="order-details__label order-details__label--required">
                {t.formatMessage({ id: 'orders.total_paid_label' })}
              </label>
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
                    aria-label={t.formatMessage({ id: 'orders.increase_total_aria' })}
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
                    aria-label={t.formatMessage({ id: 'orders.decrease_total_aria' })}
                  >
                    <Minus />
                  </button>
                </div>
              </div>
            </div>
            <div className="order-details__field">
              <label htmlFor="orderProvider" className="order-details__label">
                {t.formatMessage({ id: 'orders.provider_label' })}
              </label>
              <div className="order-details__select-wrap">
                <select
                  id="orderProvider"
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
                  setReceiptError(t.formatMessage({ id: 'orders.receipt_invalid_type' }))
                  return
                }
                if (file.size > MAX_RECEIPT_BYTES) {
                  setReceiptError(t.formatMessage({ id: 'orders.receipt_too_large' }))
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
                    if (receiptInputRef.current) receiptInputRef.current.value = ''
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
                onClick={() => receiptInputRef.current?.click()}
                className="order-details__receipt-tile"
              >
                <ImagePlus size={22} strokeWidth={1.5} />
                <span className="order-details__receipt-tile-label">
                  {t.formatMessage({ id: 'orders.receipt_attach_placeholder' })}
                </span>
              </button>
            )}
            <p className="order-details__receipt-hint">{t.formatMessage({ id: 'orders.receipt_hint' })}</p>
            {receiptError && (
              <div className="order-modal__error" role="alert">{receiptError}</div>
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
              onClick={() => navRef.current?.push(() => <ConfirmOrderStep />)}
              disabled={!orderTotal || parseFloat(orderTotal) <= 0}
            >
              {t.formatMessage({ id: 'orders.review_button' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
