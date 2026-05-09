import { useMemo } from 'react'
import { useIntl } from 'react-intl'
import { useParams } from 'react-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import {
  Pencil,
  Trash2,
  Package,
  Calendar,
  CalendarClock,
  UserPlus,
  UserCheck,
  Truck,
  Paperclip,
  CheckCircle2,
} from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { usePageTransition } from '@/contexts/page-transition-context'
import { getOrderDisplayStatus } from '@/lib/products'
import { useOrderNavRef, useOrderDetailCallbacks } from './OrderNavContext'
import { EditOrderStep } from './EditOrderStep'
import { ReceiveOrderStep } from './ReceiveOrderStep'
import { DeleteOrderConfirmStep } from './DeleteOrderConfirmStep'

export function OrderOverviewStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const params = useParams<{ businessId: string }>()
  const { navigate } = usePageTransition()
  const {
    order,
    products,
    onClose,
    onInitializeEditForm,
    onInitializeReceiveQuantities,
    getReceiptUrl,
    canDelete,
    canManage,
  } = useOrderDetailCallbacks()

  const productsById = useMemo(() => new Map(products.map(p => [p.id, p])), [products])

  const items = order.expand?.['order_items(order)'] || []
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const displayStatus = getOrderDisplayStatus(order)

  const orderRef = order.orderNumber != null
    ? `#${String(order.orderNumber).padStart(4, '0')}`
    : `#${order.id.slice(0, 6).toUpperCase()}`

  const statusLabel = {
    pending: t.formatMessage({ id: 'orders.status_pending' }),
    received: t.formatMessage({ id: 'orders.status_received' }),
    overdue: t.formatMessage({ id: 'orders.status_overdue' }),
  }[displayStatus]

  function handleClose() {
    onClose()
  }

  // Variance items — only when received and at least one item differs.
  const varianceItems = displayStatus === 'received'
    ? items.filter(item => item.receivedQuantity != null && item.receivedQuantity !== item.quantity)
    : []

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={handleClose} aria-label={t.formatMessage({ id: 'common.close' })}>
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
              <span className="order-modal__eyebrow-id">{orderRef}</span>
            </div>
            <span className={`order-receipt__hero-status order-receipt__hero-status--${displayStatus}`}>
              {statusLabel}
            </span>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.overview_hero_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
          </header>

          {/* Items rule */}
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

          {/* Line items */}
          <div className="order-receipt__lines">
            {items.map(item => {
              const product = item.productId ? productsById.get(item.productId) : null
              const iconUrl = product ? getProductIconUrl(product) : null
              const presetIcon = iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null
              const subtotal = item.subtotal ?? (item.unitCost != null ? item.unitCost * item.quantity : null)
              const hasMath = item.unitCost != null
              return (
                <div key={item.id} className="order-receipt-line">
                  <span className="order-receipt-line__icon">
                    {presetIcon ? (
                      <presetIcon.icon size={18} className="text-text-primary" />
                    ) : iconUrl ? (
                      <Image src={iconUrl} alt="" width={32} height={32} unoptimized />
                    ) : (
                      <Package size={16} strokeWidth={1.6} />
                    )}
                  </span>
                  <span className="order-receipt-line__name">{item.productName}</span>
                  <span className="order-receipt-line__subtotal">
                    {subtotal != null
                      ? formatCurrency(subtotal)
                      : t.formatMessage({ id: 'orders.qty_short' }, { count: item.quantity })}
                  </span>
                  {hasMath && (
                    <span className="order-receipt-line__math">
                      <span className="order-receipt-line__math-qty">
                        {t.formatMessage({ id: 'orders.qty_short' }, { count: item.quantity })}
                      </span>
                      <span className="order-receipt-line__math-op">×</span>
                      <span className="order-receipt-line__math-unit">
                        {item.unitCost != null ? formatCurrency(item.unitCost) : '—'}
                      </span>
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Variance section — when received with deltas */}
          {varianceItems.length > 0 && (
            <div>
              <div className="order-select__section-eyebrow" style={{ marginTop: 0 }}>
                <span style={{ color: 'var(--color-warning)' }}>
                  {t.formatMessage({ id: 'orders.variance_section_title' })}
                </span>
                <span className="order-select__section-count" style={{ color: 'var(--color-warning)' }}>
                  {varianceItems.length}
                </span>
              </div>
              <div className="order-receive__manifest">
                {varianceItems.map(item => {
                  const product = item.productId ? productsById.get(item.productId) : null
                  const iconUrl = product ? getProductIconUrl(product) : null
                  const presetIcon = iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null
                  const ordered = item.quantity
                  const received = item.receivedQuantity ?? 0
                  const delta = received - ordered
                  const variantClass =
                    delta === 0
                      ? 'order-receive-line__variance--match'
                      : delta > 0
                        ? 'order-receive-line__variance--over'
                        : 'order-receive-line__variance--short'
                  return (
                    <div key={`variance-${item.id}`} className="order-receive-line">
                      <span className="order-receive-line__icon">
                        {presetIcon ? (
                          <presetIcon.icon size={18} className="text-text-primary" />
                        ) : iconUrl ? (
                          <Image src={iconUrl} alt="" width={32} height={32} unoptimized />
                        ) : (
                          <Package size={16} strokeWidth={1.6} />
                        )}
                      </span>
                      <span className="order-receive-line__name">{item.productName}</span>
                      <span className="order-receive-line__qty">
                        {t.formatMessage(
                          { id: 'orders.variance_compact' },
                          { ordered, received },
                        )}
                      </span>
                      <span className={`order-receive-line__variance ${variantClass}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Totals block */}
          <div className="order-receipt__totals">
            <div className="order-receipt__totals-row order-receipt__totals-row--total">
              <span className="order-receipt__totals-label">
                {t.formatMessage({ id: 'orders.total_label' })}
              </span>
              <span className="order-receipt__totals-value">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          {/* Audit trail */}
          <div className="order-receipt__audit">
            <div className="order-receipt__audit-row">
              <span className="order-receipt__audit-icon" aria-hidden="true">
                <Calendar size={14} strokeWidth={1.7} />
              </span>
              <span className="order-receipt__audit-label">
                {t.formatMessage({ id: 'orders.ordered_on_label' })}
              </span>
              <span className="order-receipt__audit-leader" aria-hidden="true" />
              <span className="order-receipt__audit-value">
                {formatDate(new Date(order.date))}
              </span>
            </div>
            {order.expand?.createdByUser && (
              <div className="order-receipt__audit-row">
                <span className="order-receipt__audit-icon" aria-hidden="true">
                  <UserPlus size={14} strokeWidth={1.7} />
                </span>
                <span className="order-receipt__audit-label">
                  {t.formatMessage({ id: 'orders.ordered_by_label' })}
                </span>
                <span className="order-receipt__audit-leader" aria-hidden="true" />
                <span className="order-receipt__audit-value">
                  {order.expand.createdByUser.name || order.expand.createdByUser.email}
                </span>
              </div>
            )}
            <div className="order-receipt__audit-row">
              <span className="order-receipt__audit-icon" aria-hidden="true">
                <Truck size={14} strokeWidth={1.7} />
              </span>
              <span className="order-receipt__audit-label">
                {t.formatMessage({ id: 'orders.ordered_to_label' })}
              </span>
              <span className="order-receipt__audit-leader" aria-hidden="true" />
              {order.providerId && order.expand?.provider?.name ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!params?.businessId || !order.providerId) return
                    const href = `/${params.businessId}/providers/${order.providerId}`
                    onClose()
                    setTimeout(() => navigate(href), 200)
                  }}
                  className="order-receipt__audit-value order-receipt__audit-value--link"
                >
                  {order.expand.provider.name}
                </button>
              ) : (
                <span className="order-receipt__audit-value">
                  {order.expand?.provider?.name || t.formatMessage({ id: 'orders.provider_none' })}
                </span>
              )}
            </div>
            {order.estimatedArrival && order.status !== 'received' && (
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
            {order.receivedDate && (
              <div className="order-receipt__audit-row">
                <span className="order-receipt__audit-icon" aria-hidden="true">
                  <CheckCircle2 size={14} strokeWidth={1.7} />
                </span>
                <span className="order-receipt__audit-label">
                  {t.formatMessage({ id: 'orders.received_date_label' })}
                </span>
                <span className="order-receipt__audit-leader" aria-hidden="true" />
                <span className="order-receipt__audit-value">
                  {formatDate(new Date(order.receivedDate))}
                </span>
              </div>
            )}
            {order.expand?.receivedByUser && (
              <div className="order-receipt__audit-row">
                <span className="order-receipt__audit-icon" aria-hidden="true">
                  <UserCheck size={14} strokeWidth={1.7} />
                </span>
                <span className="order-receipt__audit-label">
                  {t.formatMessage({ id: 'orders.received_by_label' })}
                </span>
                <span className="order-receipt__audit-leader" aria-hidden="true" />
                <span className="order-receipt__audit-value">
                  {order.expand.receivedByUser.name || order.expand.receivedByUser.email}
                </span>
              </div>
            )}
            {order.receipt && (
              <div className="order-receipt__audit-row">
                <span className="order-receipt__audit-icon" aria-hidden="true">
                  <Paperclip size={14} strokeWidth={1.7} />
                </span>
                <span className="order-receipt__audit-label">
                  {t.formatMessage({ id: 'orders.receipt_attached_label' })}
                </span>
                <span className="order-receipt__audit-leader" aria-hidden="true" />
                <a
                  href={getReceiptUrl(order) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="order-receipt__audit-value order-receipt__audit-value--link"
                >
                  {t.formatMessage({ id: 'orders.view_attachment' })}
                </a>
              </div>
            )}
          </div>
        </div>
      </IonContent>

      {/* Footer: pending vs received */}
      <IonFooter>
        <IonToolbar>
          {order.status === 'pending' ? (
            <div className="modal-footer">
              <div className="order-overview__actions">
                {canDelete && (
                  <button
                    type="button"
                    className="order-overview__icon-action order-overview__icon-action--delete"
                    onClick={() => navRef.current?.push(() => <DeleteOrderConfirmStep />)}
                    aria-label={t.formatMessage({ id: 'orders.delete_order_title' })}
                  >
                    <Trash2 size={18} strokeWidth={1.8} />
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    className="order-overview__icon-action order-overview__icon-action--edit"
                    onClick={() => {
                      onInitializeEditForm(order)
                      navRef.current?.push(() => <EditOrderStep />)
                    }}
                    aria-label={t.formatMessage({ id: 'orders.edit_order_aria' })}
                  >
                    <Pencil size={18} strokeWidth={1.8} />
                  </button>
                )}
                <button
                  type="button"
                  className="order-overview__primary"
                  onClick={() => {
                    onInitializeReceiveQuantities(order)
                    navRef.current?.push(() => <ReceiveOrderStep />)
                  }}
                >
                  {t.formatMessage({ id: 'orders.receive_button' })}
                </button>
              </div>
            </div>
          ) : (
            <div className="modal-footer">
              <button
                type="button"
                className="order-modal__primary-pill"
                onClick={handleClose}
              >
                {t.formatMessage({ id: 'common.close' })}
              </button>
            </div>
          )}
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
