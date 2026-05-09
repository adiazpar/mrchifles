'use client'

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
import { Package, CalendarClock, Truck, Paperclip, ChevronRight } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNavRef, useOrderDetailCallbacks } from './OrderNavContext'
import { EditOrderSuccessStep } from './EditOrderSuccessStep'
import { EditItemsStep } from './EditItemsStep'
import { OrderTotalStep } from './OrderTotalStep'
import { OrderDetailsStep } from './OrderDetailsStep'

/**
 * Edit-flow review surface. Mirrors ConfirmOrderStep visually — same
 * three tappable sections (line items / total / audit details). Tapping
 * any section pushes its matching edit step in `mode='edit'`, which
 * pops back here when the user is done.
 *
 *   - Items section → EditItemsStep (existing line items only; no
 *     "add new product" picker since an order's identity is the set
 *     of items it shipped with).
 *   - Total section → OrderTotalStep mode='edit' (full-screen
 *     PriceKeypadStep). Reused from the new-order wizard via the
 *     unified useOrderCallbacks() hook so both flows share the
 *     keypad chrome.
 *   - Details section → OrderDetailsStep mode='edit' (provider +
 *     arrival + receipt). Same component as new flow; same hook.
 *
 * Footer: Save (primary) commits the patch via onSaveEditOrder.
 */
export function EditOrderStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
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
      navRef.current?.push(() => <EditOrderSuccessStep />)
    }
  }

  // Tap-to-edit jumps — each pushes the matching step in `mode='edit'`
  // so its CTA pops back to this review surface instead of pushing
  // forward in any wizard chain.
  const editItems = () => navRef.current?.push(() => <EditItemsStep />)
  const editTotal = () =>
    navRef.current?.push(() => <OrderTotalStep mode="edit" />)
  const editDetails = () =>
    navRef.current?.push(() => <OrderDetailsStep mode="edit" />)

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
              <IonButton
                fill="clear"
                onClick={onClose}
                aria-label={t.formatMessage({ id: 'common.close' })}
              >
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
            <div className="order-modal__error" role="alert">
              {error}
            </div>
          )}

          {/* Items section — tappable to jump to EditItemsStep. */}
          <button
            type="button"
            className="order-confirm__edit-section"
            onClick={editItems}
            aria-label={t.formatMessage({ id: 'orders.confirm_edit_items_aria' })}
          >
            <div className="order-confirm__edit-body">
              <div className="order-receipt__rule">
                <span className="order-receipt__rule-line" aria-hidden="true" />
                <span className="order-receipt__rule-caption">
                  {t.formatMessage(
                    { id: 'orders.confirm_items_caption' },
                    { count: itemCount },
                  )}
                </span>
                <span className="order-receipt__rule-line" aria-hidden="true" />
              </div>

              <div className="order-receipt__lines">
                {orderItems.map((item) => {
                  const iconUrl = getProductIconUrl(item.product)
                  const presetIcon =
                    iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null
                  return (
                    <div
                      key={item.product.id}
                      className="order-receipt-line order-receipt-line--compact"
                    >
                      <span className="order-receipt-line__icon">
                        {presetIcon ? (
                          <presetIcon.icon size={18} className="text-text-primary" />
                        ) : iconUrl ? (
                          <Image src={iconUrl} alt="" width={32} height={32} unoptimized />
                        ) : (
                          <Package size={16} strokeWidth={1.6} />
                        )}
                      </span>
                      <span className="order-receipt-line__name">{item.product.name}</span>
                      <span className="order-receipt-line__qty">
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
              size={16}
              strokeWidth={1.8}
              className="order-confirm__edit-chev"
            />
          </button>

          {/* Total section — tappable to jump to OrderTotalStep mode='edit'. */}
          <button
            type="button"
            className="order-confirm__edit-section order-receipt__totals"
            onClick={editTotal}
            aria-label={t.formatMessage({ id: 'orders.confirm_edit_total_aria' })}
          >
            <div className="order-confirm__edit-body">
              <div className="order-receipt__totals-row order-receipt__totals-row--total">
                <span className="order-receipt__totals-label">
                  {t.formatMessage({ id: 'orders.total_label' })}
                </span>
                <span className="order-receipt__totals-value">
                  {formatCurrency(totalNum)}
                </span>
              </div>
            </div>
            <ChevronRight
              size={16}
              strokeWidth={1.8}
              className="order-confirm__edit-chev"
            />
          </button>

          {/* Audit section — tappable to jump to OrderDetailsStep mode='edit'. */}
          <button
            type="button"
            className="order-confirm__edit-section order-receipt__audit"
            onClick={editDetails}
            aria-label={t.formatMessage({ id: 'orders.confirm_edit_details_aria' })}
          >
            <div className="order-confirm__edit-body">
              <div className="order-receipt__audit-row">
                <span className="order-receipt__audit-icon" aria-hidden="true">
                  <Truck size={14} strokeWidth={1.7} />
                </span>
                <span className="order-receipt__audit-label">
                  {t.formatMessage({ id: 'orders.ordered_to_label' })}
                </span>
                <span className="order-receipt__audit-leader" aria-hidden="true" />
                <span className="order-receipt__audit-value">
                  {providerName || t.formatMessage({ id: 'orders.provider_none' })}
                </span>
              </div>
              {orderEstimatedArrival && (
                <div className="order-receipt__audit-row">
                  <span className="order-receipt__audit-icon" aria-hidden="true">
                    <CalendarClock size={14} strokeWidth={1.7} />
                  </span>
                  <span className="order-receipt__audit-label">
                    {t.formatMessage({ id: 'orders.est_arrival_label' })}
                  </span>
                  <span className="order-receipt__audit-leader" aria-hidden="true" />
                  <span className="order-receipt__audit-value">
                    {formatDate(orderEstimatedArrival)}
                  </span>
                </div>
              )}
              {orderReceiptFile && (
                <div className="order-receipt__audit-row">
                  <span className="order-receipt__audit-icon" aria-hidden="true">
                    <Paperclip size={14} strokeWidth={1.7} />
                  </span>
                  <span className="order-receipt__audit-label">
                    {t.formatMessage({ id: 'orders.receipt_attached_label' })}
                  </span>
                  <span className="order-receipt__audit-leader" aria-hidden="true" />
                  <span className="order-receipt__audit-value">
                    {t.formatMessage({ id: 'orders.receipt_attached_value' })}
                  </span>
                </div>
              )}
            </div>
            <ChevronRight
              size={16}
              strokeWidth={1.8}
              className="order-confirm__edit-chev"
            />
          </button>
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
    </IonPage>
  )
}
