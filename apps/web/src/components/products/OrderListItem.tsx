'use client'

import { useIntl } from 'react-intl'
import { memo } from 'react'
import {
  Calendar,
  CircleCheckBig,
  CircleAlert,
  Clock,
  UserPlus,
  UserCheck,
  Truck,
} from 'lucide-react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { getOrderDisplayStatus, type ExpandedOrder } from '@/lib/products'

interface OrderListItemProps {
  order: ExpandedOrder
  onView: (order: ExpandedOrder) => void
  /**
   * Hide the "Ordered to:" metadata row. Useful when the list is already
   * scoped to a single provider (e.g. the provider detail page's History
   * tab) so the row would be redundant noise.
   */
  hideProviderRow?: boolean
}

/**
 * Shared order list row — used on the products page's Orders tab and on
 * the provider detail page's History tab. Reads as a printed receipt
 * entry: status badge + Fraunces italic stamp + mono total + status
 * chip up top, then dotted-leader meta rows below for the audit trail.
 */
export const OrderListItem = memo(function OrderListItem({
  order,
  onView,
  hideProviderRow = false,
}: OrderListItemProps) {
  const t = useIntl()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const items = order.expand?.['order_items(order)'] || []
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const displayStatus = getOrderDisplayStatus(order)

  const statusLabel = {
    pending: t.formatMessage({ id: 'orders.status_pending' }),
    received: t.formatMessage({ id: 'orders.status_received' }),
    overdue: t.formatMessage({ id: 'orders.status_overdue' }),
  }

  const orderLabel =
    order.orderNumber != null
      ? `#${order.orderNumber}`
      : `#${order.id.slice(0, 6)}`

  const StatusIcon =
    displayStatus === 'received'
      ? CircleCheckBig
      : displayStatus === 'pending'
        ? Clock
        : CircleAlert

  const hasProvider = !!order.expand?.provider

  return (
    <div
      className="order-row"
      onClick={() => onView(order)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView(order)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="order-row__top">
        <div className={`order-row__status-icon order-row__status-icon--${displayStatus}`}>
          <StatusIcon size={20} strokeWidth={1.8} />
        </div>

        <div className="order-row__lead">
          <div className="order-row__stamp">{orderLabel}</div>
          <div className="order-row__items">
            {t.formatMessage(
              { id: 'orders.item_unit_count' },
              { count: itemCount },
            )}
          </div>
        </div>

        <div className="order-row__trail">
          <span className="order-row__total">
            -{formatCurrency(order.total)}
          </span>
          <span className={`order-row__status-chip order-row__status-chip--${displayStatus}`}>
            {statusLabel[displayStatus]}
          </span>
        </div>
      </div>

      <div className="order-row__meta">
        <MetaRow
          icon={<Calendar size={14} strokeWidth={1.7} />}
          label={t.formatMessage({ id: 'orders.ordered_on_label' })}
          value={formatDate(new Date(order.date))}
        />
        {order.expand?.createdByUser && (
          <MetaRow
            icon={<UserPlus size={14} strokeWidth={1.7} />}
            label={t.formatMessage({ id: 'orders.ordered_by_label' })}
            value={
              order.expand.createdByUser.name ||
              order.expand.createdByUser.email
            }
          />
        )}
        {order.expand?.receivedByUser && (
          <MetaRow
            icon={<UserCheck size={14} strokeWidth={1.7} />}
            label={t.formatMessage({ id: 'orders.received_by_label' })}
            value={
              order.expand.receivedByUser.name ||
              order.expand.receivedByUser.email
            }
          />
        )}
        {!hideProviderRow && hasProvider && order.expand?.provider && (
          <MetaRow
            icon={<Truck size={14} strokeWidth={1.7} />}
            label={t.formatMessage({ id: 'orders.ordered_to_label' })}
            value={order.expand.provider.name}
          />
        )}
      </div>
    </div>
  )
})

interface MetaRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function MetaRow({ icon, label, value }: MetaRowProps) {
  return (
    <div className="order-row__meta-row">
      <span className="order-row__meta-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="order-row__meta-label">{label}</span>
      <span className="order-row__meta-leader" aria-hidden="true" />
      <span className="order-row__meta-value">{value}</span>
    </div>
  )
}
