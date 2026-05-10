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
import { Package, ChevronRight } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNavRef, useNewOrderCallbacks } from './OrderNavContext'
import { NewOrderSuccessStep } from './NewOrderSuccessStep'
import { SelectProductsStep } from './SelectProductsStep'
import { OrderTotalStep } from './OrderTotalStep'
import { OrderDetailsStep } from './OrderDetailsStep'

/**
 * New-order confirm surface. Same shape as EditOrderStep ("Revise the
 * order") so both review surfaces read as the same family:
 *   - Items hero card → SelectProductsStep mode='edit'
 *   - Total row → OrderTotalStep mode='edit'
 *   - Ordered to / Est. arrival / Receipt rows → OrderDetailsStep mode='edit'
 * Each row is a `pm-review-row` (label · ········ value · chev) so the
 * chevron always sits in the same place, regardless of value content.
 */
export function ConfirmOrderStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const {
    providers,
    orderItems,
    orderTotal,
    orderEstimatedArrival,
    orderReceiptFile,
    orderProvider,
    isSaving,
    error,
    onSaveOrder,
  } = useNewOrderCallbacks()

  const handleConfirm = async () => {
    const success = await onSaveOrder()
    if (success) {
      navRef.current?.push(() => <NewOrderSuccessStep />)
    }
  }

  // Tap-to-edit jumps: each pushes the matching step in `mode='edit'`
  // so its CTA pops back to this Confirm screen instead of pushing
  // forward in the wizard chain.
  const editItems = () =>
    navRef.current?.push(() => <SelectProductsStep mode="edit" />)
  const editTotal = () =>
    navRef.current?.push(() => <OrderTotalStep mode="edit" />)
  const editDetails = () =>
    navRef.current?.push(() => <OrderDetailsStep mode="edit" />)

  const providerName = providers.find((p) => p.id === orderProvider)?.name
  const totalNum = orderTotal ? parseFloat(orderTotal) : 0
  const itemCount = orderItems.reduce(
    (acc, i) => acc + (typeof i.quantity === 'number' ? i.quantity : 0),
    0,
  )

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
        <div className="wizard-step pm-review">
          <header className="wizard-hero">
            <div className="order-modal__eyebrow">
              <span>{t.formatMessage({ id: 'orders.eyebrow_review' })}</span>
            </div>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.confirm_hero_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'orders.confirm_hero_subtitle' })}
            </p>
          </header>

          {error && (
            <div className="order-modal__error" role="alert">
              {error}
            </div>
          )}

          {/* Items hero card — single tap target opening SelectProductsStep
              in edit mode. */}
          <button
            type="button"
            className="pm-review__hero-card pm-review__hero-card--items"
            onClick={editItems}
            aria-label={t.formatMessage({ id: 'orders.confirm_edit_items_aria' })}
          >
            <div className="pm-review__items-body">
              <span className="pm-review__items-eyebrow">
                {t.formatMessage(
                  { id: 'orders.confirm_items_caption' },
                  { count: itemCount },
                )}
              </span>
              <div className="pm-review__items-list">
                {orderItems.map((item) => {
                  const iconUrl = getProductIconUrl(item.product)
                  const presetIcon =
                    iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null
                  return (
                    <div key={item.product.id} className="pm-review__item-line">
                      <span
                        className={`pm-review__item-icon${
                          iconUrl && !presetIcon ? ' pm-review__item-icon--photo' : ''
                        }`}
                      >
                        {presetIcon ? (
                          <presetIcon.icon size={16} className="text-text-primary" />
                        ) : iconUrl ? (
                          <Image src={iconUrl} alt="" width={28} height={28} unoptimized />
                        ) : (
                          <Package size={14} strokeWidth={1.6} />
                        )}
                      </span>
                      <span className="pm-review__item-name">{item.product.name}</span>
                      <span className="pm-review__item-qty">
                        {t.formatMessage(
                          { id: 'orders.qty_short' },
                          { count: typeof item.quantity === 'number' ? item.quantity : 0 },
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            <ChevronRight
              size={18}
              strokeWidth={1.8}
              className="pm-review__chev"
              aria-hidden="true"
            />
          </button>

          {/* Field ledger — Total + audit details in dotted-leader rows
              with consistent chevron placement on the right. */}
          <div className="pm-review__ledger">
            <ReviewRow
              label={t.formatMessage({ id: 'orders.total_label' })}
              value={formatCurrency(totalNum)}
              valueIsSet={totalNum > 0}
              onClick={editTotal}
              ariaLabel={t.formatMessage({ id: 'orders.confirm_edit_total_aria' })}
            />
            <ReviewRow
              label={t.formatMessage({ id: 'orders.ordered_to_label' })}
              value={
                providerName ?? t.formatMessage({ id: 'orders.provider_none' })
              }
              valueIsSet={!!providerName}
              onClick={editDetails}
              ariaLabel={t.formatMessage({ id: 'orders.confirm_edit_details_aria' })}
            />
            <ReviewRow
              label={t.formatMessage({ id: 'orders.est_arrival_label' })}
              value={
                orderEstimatedArrival
                  ? formatDate(orderEstimatedArrival)
                  : t.formatMessage({ id: 'productAddEdit.review_value_unset' })
              }
              valueIsSet={!!orderEstimatedArrival}
              onClick={editDetails}
              ariaLabel={t.formatMessage({ id: 'orders.confirm_edit_details_aria' })}
            />
            {orderReceiptFile && (
              <ReviewRow
                label={t.formatMessage({ id: 'orders.receipt_attached_label' })}
                value={t.formatMessage({ id: 'orders.receipt_attached_value' })}
                valueIsSet
                onClick={editDetails}
                ariaLabel={t.formatMessage({ id: 'orders.confirm_edit_details_aria' })}
              />
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
              onClick={handleConfirm}
              disabled={isSaving}
            >
              {isSaving ? (
                <span
                  className="order-modal__pill-spinner"
                  aria-label={t.formatMessage({ id: 'common.loading' })}
                />
              ) : (
                t.formatMessage({ id: 'orders.place_order_button' })
              )}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}

interface ReviewRowProps {
  label: string
  value: string
  valueIsSet: boolean
  onClick: () => void
  ariaLabel?: string
}

function ReviewRow({ label, value, valueIsSet, onClick, ariaLabel }: ReviewRowProps) {
  const valueClass = [
    'pm-review-row__value',
    !valueIsSet ? 'pm-review-row__value--unset' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      className="pm-review-row"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="pm-review-row__label">{label}</span>
      <span className="pm-review-row__leader" aria-hidden="true" />
      <span className={valueClass}>{value}</span>
      <ChevronRight className="pm-review-row__chev" size={14} />
    </button>
  )
}
