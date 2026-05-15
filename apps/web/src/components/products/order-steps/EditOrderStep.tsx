'use client'

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
import { Package, ChevronRight } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNav, useOrderDetailCallbacks } from './OrderNavContext'

/**
 * Edit-flow review surface. Mirrors the ProductReview ledger pattern:
 * one prominent items card at the top, then a column of dotted-leader
 * rows (Total, Ordered to, Est. arrival, Receipt) that each push the
 * matching edit step.
 *
 *   - Items card → 'edit-items'
 *   - Total row → 'edit-total' (shared OrderTotalStep mode='edit')
 *   - Provider / Arrival / Receipt rows → 'edit-details' (shared
 *     OrderDetailsStep mode='edit'). All three rows route to the same
 *     step; users can land in details from whichever piece they want
 *     to revise.
 */
export function EditOrderStep() {
  const t = useIntl()
  const nav = useOrderNav()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const {
    order,
    providers,
    orderItems,
    orderTotal,
    orderEstimatedArrival,
    orderProvider,
    orderReceiptFile,
    isSaving,
    error,
    onSaveEditOrder,
    initialEditSnapshot,
    onClose,
    openedFromSwipe,
  } = useOrderDetailCallbacks()

  const orderRef =
    order.orderNumber != null
      ? `#${String(order.orderNumber).padStart(4, '0')}`
      : `#${order.id.slice(0, 6).toUpperCase()}`

  const totalNum = orderTotal ? parseFloat(orderTotal) : 0
  const itemCount = orderItems.reduce(
    (acc, i) => acc + (typeof i.quantity === 'number' ? i.quantity : 0),
    0,
  )
  const providerName = providers.find((p) => p.id === orderProvider)?.name

  const hasChanges =
    JSON.stringify({
      items: orderItems.map((i) => ({ id: i.product.id, qty: i.quantity })),
      total: orderTotal,
      provider: orderProvider,
      arrival: orderEstimatedArrival,
      hasReceipt: !!orderReceiptFile,
    }) !== initialEditSnapshot

  const isDisabled =
    isSaving ||
    orderItems.length === 0 ||
    !orderTotal ||
    parseFloat(orderTotal) <= 0 ||
    !hasChanges

  const handleSave = async () => {
    const success = await onSaveEditOrder()
    if (success) {
      nav.push('edit-success')
    }
  }

  const editItems = () => nav.push('edit-items')
  const editTotal = () => nav.push('edit-total')
  const editDetails = () => nav.push('edit-details')

  return (
    <>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          {!openedFromSwipe && (
            <IonButtons slot="start">
              <IonButton
                fill="clear"
                onClick={() => nav.pop()}
                aria-label={t.formatMessage({ id: 'common.back' })}
              >
                <IonIcon icon={chevronBack} />
              </IonButton>
            </IonButtons>
          )}
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
        <div className="wizard-step pm-review">
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
            <div className="order-modal__error" role="alert">
              {error}
            </div>
          )}

          {/* Items hero card — single tap target opening EditItemsStep. */}
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

          {/* Field ledger — Total + audit details. Same dotted-leader
              rhythm as the ProductReview ledger. */}
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
              onClick={handleSave}
              disabled={isDisabled}
              data-haptic
            >
              {isSaving ? (
                <span
                  className="order-modal__pill-spinner"
                  aria-label={t.formatMessage({ id: 'common.loading' })}
                />
              ) : (
                t.formatMessage({ id: 'common.save' })
              )}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
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
