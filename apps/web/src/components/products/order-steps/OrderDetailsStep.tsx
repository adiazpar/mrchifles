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
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>{t.formatMessage({ id: 'orders.step_order_details' })}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">{error}</div>
        )}

        {/* Total & Provider */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="orderTotal" className="label">
              {t.formatMessage({ id: 'orders.total_paid_label' })} <span className="text-error">*</span>
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
          <div>
            <label htmlFor="orderProvider" className="label">{t.formatMessage({ id: 'orders.provider_label' })}</label>
            <div className="relative">
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
              <ChevronDown className="w-5 h-5 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Estimated Arrival */}
        <div className="mb-4">
          <label className="label">{t.formatMessage({ id: 'orders.estimated_arrival_label' })}</label>
          <div className="relative">
            <div className="input w-full flex items-center pointer-events-none" style={{ paddingRight: 'var(--space-10)' }}>
              <span className={orderEstimatedArrival ? 'text-text-primary' : 'text-text-tertiary'}>
                {orderEstimatedArrival ? formatDate(orderEstimatedArrival) : t.formatMessage({ id: 'orders.select_date_placeholder' })}
              </span>
            </div>
            <CalendarClock className="w-5 h-5 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={orderEstimatedArrival}
              onChange={e => onOrderEstimatedArrivalChange(e.target.value)}
              className="input absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Receipt */}
        <div>
          <label className="label">{t.formatMessage({ id: 'orders.receipt_label' })}</label>
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
            <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
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
              <span className="text-sm text-text-secondary truncate flex-1 min-w-0">{orderReceiptFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  onOrderReceiptFileChange(null)
                  onOrderReceiptPreviewChange(null)
                  if (receiptInputRef.current) receiptInputRef.current.value = ''
                }}
                className="p-1 text-error hover:text-error transition-colors flex-shrink-0"
                aria-label={t.formatMessage({ id: 'common.remove' })}
              >
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => receiptInputRef.current?.click()}
              className="image-upload-zone"
            >
              <ImagePlus className="w-6 h-6 text-text-tertiary" />
              <span className="text-sm text-text-tertiary mt-2">{t.formatMessage({ id: 'orders.receipt_attach_placeholder' })}</span>
            </button>
          )}
          <p className="text-xs text-text-tertiary mt-2">{t.formatMessage({ id: 'orders.receipt_hint' })}</p>
          {receiptError && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mt-2">{receiptError}</div>
          )}
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <button
            type="button"
            onClick={() => navRef.current?.push(() => <ConfirmOrderStep />)}
            className="btn btn-primary w-full"
            disabled={!orderTotal || parseFloat(orderTotal) <= 0}
          >
            {t.formatMessage({ id: 'orders.review_button' })}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
