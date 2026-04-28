'use client'

import { Fragment, useState } from 'react'
import { useParams } from 'next/navigation'
import { X, Plus, ChevronUp, Clipboard, ListFilter, CircleCheckBig, Pencil, Trash2 } from 'lucide-react'
import { Modal, Spinner, SwipeableRow } from '@/components/ui'
import { getOrderDisplayStatus } from '@/lib/products'
import { usePageTransition } from '@/contexts/page-transition-context'
import { useTranslations } from 'next-intl'
import { scrollToTop } from '@/lib/scroll'
import {
  ORDER_SORT_OPTIONS,
  type OrderSortOption,
  type OrderStatusFilter,
  type OrderViewMode,
} from '@/lib/products'
import type { Product } from '@/types'
import type { ExpandedOrder } from '@/lib/products'
import { OrderListItem } from './OrderListItem'

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

  // View mode (active vs completed)
  viewMode: OrderViewMode
  onViewModeChange: (mode: OrderViewMode) => void

  // Handlers
  onNewOrder: () => void
  onViewOrder: (order: ExpandedOrder) => void
  /**
   * Optional swipe-action handlers. Each takes the order and opens the detail
   * modal on the corresponding step. Pass all three to enable the swipe tray.
   */
  onReceiveOrder?: (order: ExpandedOrder) => void
  onEditOrder?: (order: ExpandedOrder) => void
  onDeleteOrder?: (order: ExpandedOrder) => void
  /** Gates the delete swipe action; matches the canDelete used by the modal. */
  canDelete?: boolean
  canManage?: boolean

  // Error state
  error?: string
  isModalOpen?: boolean
  /**
   * True while the bucket matching `viewMode` is mid-fetch and has nothing
   * cached yet. The empty state is suppressed during this window so the
   * user sees a spinner instead of "no completed orders" flashing for a
   * frame on a cold toggle.
   */
  isLoading?: boolean
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
  viewMode,
  onViewModeChange,
  onNewOrder,
  onViewOrder,
  onReceiveOrder,
  onEditOrder,
  onDeleteOrder,
  canDelete = false,
  canManage = false,
  error,
  isModalOpen,
  isLoading = false,
}: OrdersTabProps) {
  const t = useTranslations('orders')
  const tProducts = useTranslations('products')
  const tCommon = useTranslations('common')
  const params = useParams<{ businessId: string }>()
  const { setSlideDirection, setSlideTargetPath, navigate } = usePageTransition()
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
          <Clipboard className="empty-state-icon" />
          <h3 className="empty-state-title">{t('empty_no_products_title')}</h3>
          <p className="empty-state-description">
            {t('empty_no_products_description')}
          </p>
        </div>
      ) : orders.length === 0 ? (
        /* Products exist but no orders yet */
        <div className="empty-state-fill">
          <Clipboard className="empty-state-icon" />
          <h3 className="empty-state-title">{t('empty_no_orders_title')}</h3>
          <p className="empty-state-description">
            {t('empty_no_orders_description')}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={onNewOrder}
              className="btn btn-primary mt-4"
              style={{ fontSize: 'var(--text-sm)', padding: '10px var(--space-5)', minHeight: 'unset', gap: 'var(--space-2)' }}
            >
              <Plus className="w-4 h-4" />
              {t('create_order_button')}
            </button>
          )}
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
              onClick={() => onViewModeChange(viewMode === 'completed' ? 'active' : 'completed')}
              aria-pressed={viewMode === 'completed'}
              aria-label={
                viewMode === 'completed'
                  ? t('toggle_showing_completed_aria')
                  : t('toggle_show_completed_aria')
              }
              className={`btn btn-icon !rounded-full flex-shrink-0 ${
                viewMode === 'completed'
                  ? 'border-brand bg-brand-subtle text-brand'
                  : 'btn-secondary'
              }`}
            >
              <CircleCheckBig style={{ width: 18, height: 18 }} />
            </button>
            <button
              type="button"
              onClick={() => setSortSheetOpen(true)}
              className="btn btn-secondary btn-icon flex-shrink-0"
              aria-label={t('sort_filter_aria')}
            >
              <ListFilter style={{ width: 18, height: 18 }} />
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
                    navigate(href)
                  }}
                  className="text-sm text-brand hover:text-brand transition-colors"
                >
                  {t('providers_link')}
                </button>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={onNewOrder}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', minHeight: 'unset', gap: 'var(--space-2)', borderRadius: 'var(--radius-full)' }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  {tCommon('add')}
                </button>
              )}
            </div>

            <hr className="border-border" />

            {/* Orders List */}
            {isLoading && filteredOrders.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <p>
                  {orders.some(o => (viewMode === 'completed'
                    ? getOrderDisplayStatus(o) === 'received'
                    : getOrderDisplayStatus(o) !== 'received'))
                    ? t('no_results')
                    : viewMode === 'completed'
                      ? t('empty_no_completed')
                      : t('empty_no_active')}
                </p>
              </div>
            ) : (
              <div className="list-divided">
                {filteredOrders.map((order, i) => {
                  const alreadyReceived = getOrderDisplayStatus(order) === 'received'
                  // Receive is available to any active member (employees
                  // included) — receiving incoming inventory is normal floor
                  // work. Edit + Delete are manager-only. Mirrors the
                  // products list ordering for muscle-memory consistency.
                  const swipeActions = viewMode !== 'completed'
                    ? [
                        ...(onReceiveOrder ? [{
                          icon: <CircleCheckBig size={20} />,
                          label: t('action_receive'),
                          variant: 'info' as const,
                          disabled: alreadyReceived,
                          onClick: () => onReceiveOrder(order),
                        }] : []),
                        ...(canManage && onEditOrder ? [{
                          icon: <Pencil size={20} />,
                          label: t('action_edit'),
                          variant: 'neutral' as const,
                          // Received orders are locked — no quantity / total /
                          // provider edits once stock has been posted.
                          disabled: alreadyReceived,
                          onClick: () => onEditOrder(order),
                        }] : []),
                        ...(canManage && onDeleteOrder ? [{
                          icon: <Trash2 size={20} />,
                          label: t('action_delete'),
                          variant: 'danger' as const,
                          // Received orders can't be deleted either — would
                          // require rolling back the stock changes they posted.
                          disabled: !canDelete || alreadyReceived,
                          onClick: () => onDeleteOrder(order),
                        }] : []),
                      ]
                    : []
                  const hasSwipeActions = swipeActions.length > 0
                  return (
                    <Fragment key={order.id}>
                      {i > 0 && <hr className="list-divider" />}
                      {hasSwipeActions ? (
                        <SwipeableRow actions={swipeActions}>
                          <OrderListItem order={order} onView={onViewOrder} />
                        </SwipeableRow>
                      ) : (
                        <OrderListItem order={order} onView={onViewOrder} />
                      )}
                    </Fragment>
                  )
                })}
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

        {/* Filter by Status — only shown in Active view (Completed has a single status) */}
        {viewMode === 'active' && (
          <Modal.Item>
            <div className="space-y-2">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{t('filter_by_status_label')}</span>
              <div className="space-y-1">
                {(['all', 'pending', 'overdue'] as OrderStatusFilter[]).map(status => (
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
        )}

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
