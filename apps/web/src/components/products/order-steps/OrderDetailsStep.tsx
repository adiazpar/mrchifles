import { useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close, chevronBack } from 'ionicons/icons'
import { CalendarClock, ChevronDown, ImageIcon, ImagePlus, Trash2 } from 'lucide-react'
import { apiPostForm } from '@/lib/api-client'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNav, useOrderCallbacks } from './OrderNavContext'

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
const ACCEPTED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

interface OrderDetailsStepProps {
  /**
   * Defaults to `forward` (the wizard chain — CTA pushes 'confirm' for
   * the new-order flow). Pass `edit` when this step is opened from a
   * review surface so the CTA pops back to the review.
   */
  mode?: 'forward' | 'edit'
}

export function OrderDetailsStep({ mode = 'forward' }: OrderDetailsStepProps = {}) {
  const t = useIntl()
  const nav = useOrderNav()
  const { formatDate } = useBusinessFormat()
  const {
    providers,
    orderTotal,
    orderEstimatedArrival,
    onOrderEstimatedArrivalChange,
    orderReceiptFile,
    onOrderReceiptFileChange,
    orderReceiptPreview,
    onOrderReceiptPreviewChange,
    orderProvider,
    onOrderProviderChange,
    error,
    onClose,
  } = useOrderCallbacks()

  const receiptInputRef = useRef<HTMLInputElement>(null)
  const [receiptError, setReceiptError] = useState('')

  return (
    <>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={() => nav.pop()}
              aria-label={t.formatMessage({ id: 'common.back' })}
            >
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={onClose}
              aria-label={t.formatMessage({ id: 'common.close' })}
            >
              <IonIcon icon={close} />
            </IonButton>
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

          {/* Provider */}
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
              onClick={() =>
                mode === 'edit' ? nav.pop() : nav.push('confirm')
              }
              disabled={!orderTotal || parseFloat(orderTotal) <= 0}
            >
              {t.formatMessage({
                id: mode === 'edit' ? 'common.done' : 'orders.review_button',
              })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  )
}
