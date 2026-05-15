import { useMemo } from 'react'
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
import { Package, Truck, CalendarClock } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNav, useOrderDetailCallbacks } from './OrderNavContext'

export function ReceiveOrderStep() {
  const t = useIntl()
  const nav = useOrderNav()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const {
    order,
    products,
    isReceiving,
    onReceiveOrder,
    onClose,
    openedFromSwipe,
  } = useOrderDetailCallbacks()

  const productsById = useMemo(() => new Map(products.map(p => [p.id, p])), [products])

  const orderRef = order.orderNumber != null
    ? `#${String(order.orderNumber).padStart(4, '0')}`
    : `#${order.id.slice(0, 6).toUpperCase()}`

  const items = order.expand?.['order_items(order)'] || []

  const handleReceive = async () => {
    const success = await onReceiveOrder()
    if (success) {
      nav.push('receive-success')
    }
  }

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
            <IonButton fill="clear" onClick={onClose} aria-label={t.formatMessage({ id: 'common.close' })}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="wizard-content">
        <div className="wizard-step">
          <header className="wizard-hero">
            <div className="order-modal__eyebrow">
              <span className="order-modal__eyebrow-emphasis order-modal__eyebrow-emphasis--moss">
                {t.formatMessage({ id: 'orders.eyebrow_receive' })}
              </span>
              <span className="order-modal__eyebrow-dot">·</span>
              <span className="order-modal__eyebrow-id">{orderRef}</span>
            </div>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.receive_hero_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'orders.receive_hero_subtitle' })}
            </p>
          </header>

          {/* Manifest header */}
          <div className="order-receive__manifest">
            <div className="order-receive__manifest-eyebrow">
              <span className="order-receive__manifest-eyebrow-spacer" aria-hidden="true" />
              <span className="order-receive__manifest-eyebrow-name">
                {t.formatMessage({ id: 'orders.manifest_item_label' })}
              </span>
              <span className="order-receive__manifest-eyebrow-qty">
                {t.formatMessage({ id: 'orders.manifest_ordered_label' })}
              </span>
              <span className="order-receive__manifest-eyebrow-qty">
                {t.formatMessage({ id: 'orders.manifest_status_label' })}
              </span>
            </div>

            {items.map(item => {
              const product = item.productId ? productsById.get(item.productId) : null
              const iconUrl = product ? getProductIconUrl(product) : null
              const presetIcon = iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null
              return (
                <div key={item.id} className="order-receive-line">
                  <span
                    className={`order-receive-line__icon${
                      iconUrl && !presetIcon ? ' order-receive-line__icon--photo' : ''
                    }`}
                  >
                    {presetIcon ? (
                      <presetIcon.icon size={18} className="text-text-primary" />
                    ) : iconUrl ? (
                      <Image src={iconUrl} alt="" width={32} height={32} unoptimized />
                    ) : (
                      <Package size={16} strokeWidth={1.6} />
                    )}
                  </span>
                  <span className="order-receive-line__name">{item.productName}</span>
                  <span className="order-receive-line__qty order-receive-line__qty--ordered">
                    {item.quantity}
                  </span>
                  <span className="order-receive-line__variance order-receive-line__variance--match">
                    {t.formatMessage({ id: 'orders.manifest_pending_chip' })}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Order details summary */}
          <div className="order-receipt__totals">
            <div className="order-receipt__totals-row">
              <span className="order-receipt__totals-label">
                {t.formatMessage({ id: 'orders.provider_label' })}
              </span>
              <span className="order-receipt__totals-value">
                {order.expand?.provider?.name || t.formatMessage({ id: 'orders.provider_none' })}
              </span>
            </div>
            <div className="order-receipt__totals-row">
              <span className="order-receipt__totals-label">
                {t.formatMessage({ id: 'orders.arrival_date_label' })}
              </span>
              <span className="order-receipt__totals-value">
                {formatDate(new Date())}
              </span>
            </div>
            <div className="order-receipt__totals-row order-receipt__totals-row--total">
              <span className="order-receipt__totals-label">
                {t.formatMessage({ id: 'orders.total_label' })}
              </span>
              <span className="order-receipt__totals-value">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Audit hints — sit beneath the totals */}
          <div className="order-receipt__audit">
            <div className="order-receipt__audit-row">
              <span className="order-receipt__audit-icon" aria-hidden="true">
                <Truck size={14} strokeWidth={1.7} />
              </span>
              <span className="order-receipt__audit-label">
                {t.formatMessage({ id: 'orders.ordered_to_label' })}
              </span>
              <span className="order-receipt__audit-leader" aria-hidden="true" />
              <span className="order-receipt__audit-value">
                {order.expand?.provider?.name || t.formatMessage({ id: 'orders.provider_none' })}
              </span>
            </div>
            {order.estimatedArrival && (
              <div className="order-receipt__audit-row">
                <span className="order-receipt__audit-icon" aria-hidden="true">
                  <CalendarClock size={14} strokeWidth={1.7} />
                </span>
                <span className="order-receipt__audit-label">
                  {t.formatMessage({ id: 'orders.est_arrival_label' })}
                </span>
                <span className="order-receipt__audit-leader" aria-hidden="true" />
                <span className="order-receipt__audit-value">
                  {formatDate(new Date(order.estimatedArrival))}
                </span>
              </div>
            )}
          </div>

          {/* Confirmation note */}
          <p className="order-receive__note">
            {t.formatMessage({ id: 'orders.receive_confirm_description' })}
          </p>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={handleReceive}
              disabled={isReceiving}
              data-haptic
            >
              {isReceiving ? (
                <span className="order-modal__pill-spinner" aria-label={t.formatMessage({ id: 'common.loading' })} />
              ) : (
                t.formatMessage({ id: 'orders.mark_received_button' })
              )}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  )
}
