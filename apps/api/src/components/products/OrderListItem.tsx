'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar, CircleCheckBig, CircleAlert, Clock, UserPlus, UserCheck, Truck } from 'lucide-react'
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
 * the provider detail page's History tab. Renders a two-column main row
 * (status icon · reference + item count · total + status) plus metadata
 * rows for Ordered on / Ordered by / Ordered to.
 */
export const OrderListItem = memo(function OrderListItem({
  order,
  onView,
  hideProviderRow = false,
}: OrderListItemProps) {
  const t = useTranslations('orders')
  const { formatCurrency, formatDate } = useBusinessFormat()
  const items = order.expand?.['order_items(order)'] || []
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const displayStatus = getOrderDisplayStatus(order)

  const statusColors = {
    pending: { bg: '!bg-warning-subtle', text: 'text-warning' },
    received: { bg: '!bg-success-subtle', text: 'text-success' },
    overdue: { bg: '!bg-error-subtle', text: 'text-error' },
  }
  const statusLabel = {
    pending: t('status_pending'),
    received: t('status_received'),
    overdue: t('status_overdue'),
  }
  const colors = statusColors[displayStatus]

  const hasProvider = !!order.expand?.provider
  const orderLabel = order.orderNumber != null
    ? `#${order.orderNumber}`
    : `#${order.id.slice(0, 6)}`

  return (
    <div
      className="list-item-clickable items-start"
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={`product-list-image flex items-center justify-center ${colors.bg}`}>
            {displayStatus === 'received' ? (
              <CircleCheckBig className={`w-5 h-5 ${colors.text}`} />
            ) : displayStatus === 'pending' ? (
              <Clock className={`w-5 h-5 ${colors.text}`} />
            ) : (
              <CircleAlert className={`w-5 h-5 ${colors.text}`} />
            )}
          </div>

          {/* Order reference + item count */}
          <div className="flex-1 min-w-0">
            <span className="font-medium block tabular-nums">
              {orderLabel}
            </span>
            <span className="text-xs text-text-tertiary mt-0.5 block">
              {t('item_unit_count', { count: itemCount })}
            </span>
          </div>

          {/* Total and Status */}
          <div className="text-right flex-shrink-0">
            <span className="font-medium block text-error">
              -{formatCurrency(order.total)}
            </span>
            <span className={`text-xs mt-0.5 block ${colors.text}`}>
              {statusLabel[displayStatus]}
            </span>
          </div>
        </div>

        {/* Creation date as metadata, mirroring the "Ordered to:" row layout */}
        <div className="mt-3 flex items-center gap-3">
          <div className="w-12 flex-shrink-0 flex items-center justify-center self-center">
            <Calendar className="w-4 h-4 text-text-tertiary" />
          </div>
          <span className="flex-1 min-w-0 text-xs text-text-tertiary">
            {t('ordered_on_label')}
          </span>
          <span className="text-right flex-shrink-0 text-xs text-text-tertiary truncate tabular-nums">
            {formatDate(new Date(order.date))}
          </span>
        </div>

        {order.expand?.createdByUser && (
          <div className="mt-2 flex items-center gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center self-center">
              <UserPlus className="w-4 h-4 text-text-tertiary" />
            </div>
            <span className="flex-1 min-w-0 text-xs text-text-tertiary">
              {t('ordered_by_label')}
            </span>
            <span className="text-right flex-shrink-0 text-xs text-text-tertiary truncate">
              {order.expand.createdByUser.name || order.expand.createdByUser.email}
            </span>
          </div>
        )}

        {order.expand?.receivedByUser && (
          <div className="mt-2 flex items-center gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center self-center">
              <UserCheck className="w-4 h-4 text-text-tertiary" />
            </div>
            <span className="flex-1 min-w-0 text-xs text-text-tertiary">
              {t('received_by_label')}
            </span>
            <span className="text-right flex-shrink-0 text-xs text-text-tertiary truncate">
              {order.expand.receivedByUser.name || order.expand.receivedByUser.email}
            </span>
          </div>
        )}

        {!hideProviderRow && hasProvider && order.expand?.provider && (
          <div className="mt-2 flex items-center gap-3">
            <div className="w-12 flex-shrink-0 flex items-center justify-center self-center">
              <Truck className="w-4 h-4 text-text-tertiary" />
            </div>
            <span className="flex-1 min-w-0 text-xs text-text-tertiary">
              {t('ordered_to_label')}
            </span>
            <span className="text-right flex-shrink-0 text-xs text-text-tertiary truncate">
              {order.expand.provider.name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
})
