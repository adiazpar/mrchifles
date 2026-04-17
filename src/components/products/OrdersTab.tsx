'use client'

import { memo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { X, Plus, ChevronUp, ChevronRight } from 'lucide-react'
import { ClipboardIcon, FilterIcon } from '@/components/icons'
import { getProviderInitials } from '@/components/providers'
import { Modal } from '@/components/ui'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useNavbar } from '@/contexts/navbar-context'
import { useTranslations } from 'next-intl'
import { scrollToTop } from '@/lib/scroll'
import {
  ORDER_SORT_OPTIONS,
  getOrderDisplayStatus,
  type OrderSortOption,
  type OrderStatusFilter,
} from '@/lib/products'
import type { Product } from '@/types'
import type { ExpandedOrder } from '@/lib/products'

// ============================================
// PROPS INTERFACE
// ============================================

export interface OrdersTabProps {
  // Data
  products: Product[]
  orders: ExpandedOrder[]
  filteredOrders: ExpandedOrder[]

  // Search state
  searchQuery: string
  onSearchChange: (query: string) => void

  // Sort state
  sortBy: OrderSortOption
  onSortChange: (sort: OrderSortOption) => void

  // Filter state
  statusFilter: OrderStatusFilter
  onStatusFilterChange: (filter: OrderStatusFilter) => void

  // Handlers
  onNewOrder: () => void
  onViewOrder: (order: ExpandedOrder) => void

  // Error state
  error?: string
  isModalOpen?: boolean
}

// Re-export the type for convenience
export type { OrderStatusFilter } from '@/lib/products'

// ============================================
// COMPONENT
// ============================================

export function OrdersTab({
  products,
  orders,
  filteredOrders,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  onNewOrder,
  onViewOrder,
  error,
  isModalOpen,
}: OrdersTabProps) {
  const t = useTranslations('orders')
  const tProducts = useTranslations('products')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams<{ businessId: string }>()
  const { setSlideDirection, setSlideTargetPath, setPendingHref } = useNavbar()
  const [isSortSheetOpen, setSortSheetOpen] = useState(false)

  const sortLabels: Record<OrderSortOption, string> = {
    date_desc: t('sort_date_desc'),
    date_asc: t('sort_date_asc'),
    total_desc: t('sort_total_desc'),
    total_asc: t('sort_total_asc'),
  }

  const statusFilterLabels: Record<OrderStatusFilter, string> = {
    all: t('filter_all'),
    pending: t('filter_status_pending'),
    received: t('filter_status_received'),
    overdue: t('filter_status_overdue'),
  }

  return (
    <div className="page-body space-y-4">
      {error && !isModalOpen && (
        <div className="p-4 bg-error-subtle text-error rounded-lg">
          {error}
        </div>
      )}

      {/* No products and no orders - show empty state */}
      {products.length === 0 && orders.length === 0 ? (
        <div className="empty-state-fill">
          <ClipboardIcon className="empty-state-icon" />
          <h3 className="empty-state-title">{t('empty_no_products_title')}</h3>
          <p className="empty-state-description">
            {t('empty_no_products_description')}
          </p>
        </div>
      ) : orders.length === 0 ? (
        /* Products exist but no orders yet */
        <div className="empty-state-fill">
          <ClipboardIcon className="empty-state-icon" />
          <h3 className="empty-state-title">{t('empty_no_orders_title')}</h3>
          <p className="empty-state-description">
            {t('empty_no_orders_description')}
          </p>
          <button
            type="button"
            onClick={onNewOrder}
            className="btn btn-primary mt-4"
            style={{ fontSize: 'var(--text-sm)', padding: '10px var(--space-5)', minHeight: 'unset', gap: 'var(--space-2)' }}
          >
            <Plus className="w-4 h-4" />
            {t('create_order_button')}
          </button>
        </div>
      ) : (
        /* Orders exist - show search, filter, and list */
        <>
          {/* Search Bar + Filter Button */}
          <div className="flex gap-2 items-stretch">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="input w-full h-full"
                style={{ paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingRight: '2.25rem', fontSize: 'var(--text-sm)', minHeight: 'unset' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
                  aria-label={t('search_clear')}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSortSheetOpen(true)}
              className="btn btn-secondary btn-icon flex-shrink-0"
              aria-label={t('sort_filter_aria')}
            >
              <FilterIcon style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Orders List Card */}
          <div className="card p-4 space-y-4">
            {/* List Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {t('order_count', { count: filteredOrders.length })}
                </span>
                <span className="text-text-tertiary">&#183;</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!params?.businessId) return
                    const href = `/${params.businessId}/providers`
                    setSlideTargetPath(href)
                    setSlideDirection('forward')
                    setPendingHref(href)
                    router.push(href)
                  }}
                  className="text-sm text-brand hover:text-brand transition-colors"
                >
                  {t('providers_link')}
                </button>
              </div>
              <button
                type="button"
                onClick={onNewOrder}
                className="btn btn-primary"
                style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', minHeight: 'unset', gap: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                {tCommon('add')}
              </button>
            </div>

            <hr className="border-border" />

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <p>{t('no_results')}</p>
              </div>
            ) : (
              <div>
                {filteredOrders.map((order) => (
                  <OrderListItem
                    key={order.id}
                    order={order}
                    onView={onViewOrder}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Back to top button */}
          {filteredOrders.length > 5 && (
            <button
              type="button"
              onClick={scrollToTop}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
              {tProducts('back_to_top')}
            </button>
          )}
        </>
      )}

      {/* Sort & Filter Modal */}
      <Modal
        isOpen={isSortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        title={t('sort_filter_title')}
      >
        <Modal.Item>
          <div className="space-y-2">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('sort_by_label')}</span>
            <div className="space-y-1">
              {ORDER_SORT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSortChange(option.value)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-bg-muted transition-colors"
                >
                  <span className={sortBy === option.value ? 'font-medium text-brand' : 'text-text-primary'}>
                    {sortLabels[option.value]}
                  </span>
                  {sortBy === option.value && (
                    <span className="w-5 h-5 text-brand">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Modal.Item>

        {/* Filter by Status */}
        <Modal.Item>
          <div className="space-y-2">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('filter_by_status_label')}</span>
            <div className="space-y-1">
              {(['all', 'pending', 'received', 'overdue'] as OrderStatusFilter[]).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusFilterChange(status)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-bg-muted transition-colors"
                >
                  <span className={statusFilter === status ? 'font-medium text-brand' : 'text-text-primary'}>
                    {statusFilterLabels[status]}
                  </span>
                  {statusFilter === status && (
                    <span className="w-5 h-5 text-brand">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={() => setSortSheetOpen(false)}
            className="btn btn-primary flex-1"
          >
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

// ============================================
// MEMOIZED LIST ITEM
// ============================================

interface OrderListItemProps {
  order: ExpandedOrder
  onView: (order: ExpandedOrder) => void
}

const OrderListItem = memo(function OrderListItem({
  order,
  onView,
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

  return (
    <div
      className={`list-item-clickable ${hasProvider ? 'items-start' : ''}`}
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
            <ClipboardIcon className={`w-5 h-5 ${colors.text}`} />
          </div>

          {/* Order info */}
          <div className="flex-1 min-w-0">
            <span className="font-medium block">
              {formatDate(new Date(order.date))}
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

          {/* Chevron */}
          <div className="text-text-tertiary ml-2 flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {hasProvider && order.expand?.provider && (
          <div className="mt-3 flex items-center gap-3 text-left">
            <div className="w-12 flex-shrink-0 flex items-center justify-center self-center">
              <span
                className="inline-flex items-center justify-center rounded-full bg-brand-subtle text-brand font-semibold"
                style={{ width: 24, height: 24, fontSize: 11, lineHeight: 1 }}
              >
                {getProviderInitials(order.expand.provider.name)}
              </span>
            </div>
            <span className="text-xs text-text-tertiary truncate min-w-0">
              {order.expand.provider.name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
})
