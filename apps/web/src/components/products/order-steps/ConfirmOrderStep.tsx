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
import { Package, CalendarClock, Truck, Paperclip, ChevronRight } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNavRef, useNewOrderCallbacks } from './OrderNavContext'
import { NewOrderSuccessStep } from './NewOrderSuccessStep'
import { SelectProductsStep } from './SelectProductsStep'
import { OrderTotalStep } from './OrderTotalStep'
import { OrderDetailsStep } from './OrderDetailsStep'

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

  // Tap-to-edit jumps: each pushes the corresponding step in `edit`
  // mode so its CTA pops back to this Confirm screen instead of
  // pushing further forward in the wizard chain.
  const editItems = () =>
    navRef.current?.push(() => <SelectProductsStep mode="edit" />)
  const editTotal = () =>
    navRef.current?.push(() => <OrderTotalStep mode="edit" />)
  const editDetails = () =>
    navRef.current?.push(() => <OrderDetailsStep mode="edit" />)

  const providerName = providers.find(p => p.id === orderProvider)?.name
  const totalNum = orderTotal ? parseFloat(orderTotal) : 0
  const itemCount = orderItems.reduce((acc, i) => acc + (typeof i.quantity === 'number' ? i.quantity : 0), 0)

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
            <div className="order-modal__error" role="alert">{error}</div>
          )}

          {/* Items section — tappable to jump back to SelectProducts. */}
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
                {orderItems.map(item => {
                  const iconUrl = getProductIconUrl(item.product)
                  const presetIcon = iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null
                  return (
                    <div key={item.product.id} className="order-receipt-line order-receipt-line--compact">
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

          {/* Totals block — tappable to jump back to OrderTotalStep. */}
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

          {/* Audit trail — tappable to jump back to OrderDetailsStep. */}
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
              onClick={handleConfirm}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="order-modal__pill-spinner" aria-label={t.formatMessage({ id: 'common.loading' })} />
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
