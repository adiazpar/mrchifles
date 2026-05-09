'use client'

import { useIntl } from 'react-intl'
import { useState } from 'react'
import { useParams } from 'react-router'
import {
  X,
  Plus,
  ChevronUp,
  Clipboard,
  ListFilter,
  CircleCheckBig,
  Check,
} from 'lucide-react'
import {
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonList,
  IonSpinner,
} from '@ionic/react'
import { ModalShell } from '@/components/ui'
import { getOrderDisplayStatus } from '@/lib/products'
import { usePageTransition } from '@/contexts/page-transition-context'
import { scrollToTop } from '@/lib/scroll'
import {
  ORDER_SORT_OPTIONS,
  type OrderSortOption,
  type OrderStatusFilter,
  type OrderViewMode,
} from '@/lib/products'
import type { Product } from '@kasero/shared/types'
import type { ExpandedOrder } from '@/lib/products'
import { OrderListItem } from './OrderListItem'

const SearchIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export interface OrdersTabProps {
  products: Product[]
  orders: ExpandedOrder[]
  filteredOrders: ExpandedOrder[]
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: OrderSortOption
  onSortChange: (sort: OrderSortOption) => void
  statusFilter: OrderStatusFilter
  onStatusFilterChange: (filter: OrderStatusFilter) => void
  viewMode: OrderViewMode
  onViewModeChange: (mode: OrderViewMode) => void
  onNewOrder: () => void
  onViewOrder: (order: ExpandedOrder) => void
  onReceiveOrder?: (order: ExpandedOrder) => void
  onEditOrder?: (order: ExpandedOrder) => void
  onDeleteOrder?: (order: ExpandedOrder) => void
  canDelete?: boolean
  canManage?: boolean
  error?: string
  isModalOpen?: boolean
  isLoading?: boolean
}

export type { OrderStatusFilter } from '@/lib/products'

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
  const intl = useIntl()
  const params = useParams<{ businessId: string }>()
  const { navigate } = usePageTransition()
  const [isSortSheetOpen, setSortSheetOpen] = useState(false)

  const sortLabels: Record<OrderSortOption, string> = {
    date_desc: intl.formatMessage({ id: 'orders.sort_date_desc' }),
    date_asc: intl.formatMessage({ id: 'orders.sort_date_asc' }),
    total_desc: intl.formatMessage({ id: 'orders.sort_total_desc' }),
    total_asc: intl.formatMessage({ id: 'orders.sort_total_asc' }),
  }

  const statusFilterLabels: Record<OrderStatusFilter, string> = {
    all: intl.formatMessage({ id: 'orders.filter_all' }),
    pending: intl.formatMessage({ id: 'orders.filter_status_pending' }),
    received: intl.formatMessage({ id: 'orders.filter_status_received' }),
    overdue: intl.formatMessage({ id: 'orders.filter_status_overdue' }),
  }

  const noProductsAndNoOrders = products.length === 0 && orders.length === 0
  const hasNoOrders = orders.length === 0 && products.length > 0

  return (
    <div className="flex flex-col gap-4">
      {error && !isModalOpen && (
        <div className="products-error">{error}</div>
      )}

      {noProductsAndNoOrders ? (
        <div className="products-empty">
          <Clipboard className="products-empty__icon" aria-hidden="true" />
          <h2 className="products-empty__title">
            {intl.formatMessage({ id: 'orders.empty_no_products_title' })}
          </h2>
          <p className="products-empty__desc">
            {intl.formatMessage({ id: 'orders.empty_no_products_description' })}
          </p>
        </div>
      ) : hasNoOrders ? (
        <div className="products-empty">
          <Clipboard className="products-empty__icon" aria-hidden="true" />
          <h2 className="products-empty__title">
            {intl.formatMessage({ id: 'orders.empty_no_orders_title' })}
          </h2>
          <p className="products-empty__desc">
            {intl.formatMessage({ id: 'orders.empty_no_orders_description' })}
          </p>
          {canManage && (
            <button
              type="button"
              className="products-empty__cta"
              onClick={onNewOrder}
            >
              <Plus size={14} strokeWidth={2.5} />
              {intl.formatMessage({ id: 'orders.create_order_button' })}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Search + view-mode toggle + sort row. */}
          <div className="products-tools-row">
            <label className="app-search">
              <span className="app-search__icon">{SearchIcon}</span>
              <input
                type="search"
                className="app-search__input"
                placeholder={intl.formatMessage({ id: 'orders.search_placeholder' })}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label={intl.formatMessage({ id: 'orders.search_placeholder' })}
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="app-search__clear"
                  onClick={() => onSearchChange('')}
                  aria-label={intl.formatMessage({ id: 'orders.search_clear' })}
                >
                  <X />
                </button>
              )}
            </label>

            <button
              type="button"
              className="tools-button"
              onClick={() =>
                onViewModeChange(viewMode === 'completed' ? 'active' : 'completed')
              }
              aria-pressed={viewMode === 'completed'}
              aria-label={
                viewMode === 'completed'
                  ? intl.formatMessage({ id: 'orders.toggle_showing_completed_aria' })
                  : intl.formatMessage({ id: 'orders.toggle_show_completed_aria' })
              }
            >
              <CircleCheckBig size={18} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              className="tools-button"
              onClick={() => setSortSheetOpen(true)}
              aria-label={intl.formatMessage({ id: 'orders.sort_filter_aria' })}
            >
              <ListFilter size={18} strokeWidth={1.8} />
            </button>
          </div>

          {/* Inventory ledger card (orders bucket). */}
          <div className="inventory-ledger">
            <div className="inventory-ledger__header">
              <div className="inventory-ledger__count">
                <span className="inventory-ledger__count-num">
                  {filteredOrders.length}
                </span>
                {intl.formatMessage(
                  { id: 'orders.order_count_unit' },
                  { count: filteredOrders.length },
                )}
                <span className="inventory-ledger__sep">·</span>
                <button
                  type="button"
                  className="inventory-ledger__settings-link"
                  onClick={() => {
                    if (!params?.businessId) return
                    navigate(`/${params.businessId}/providers`)
                  }}
                >
                  {intl.formatMessage({ id: 'orders.providers_link' })}
                </button>
              </div>
              {canManage && (
                <button
                  type="button"
                  className="inventory-ledger__add-button"
                  onClick={onNewOrder}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  {intl.formatMessage({ id: 'common.add' })}
                </button>
              )}
            </div>

            {isLoading && filteredOrders.length === 0 ? (
              <div className="inventory-ledger__empty">
                <IonSpinner name="crescent" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="inventory-ledger__empty">
                {orders.some((o) =>
                  viewMode === 'completed'
                    ? getOrderDisplayStatus(o) === 'received'
                    : getOrderDisplayStatus(o) !== 'received',
                )
                  ? intl.formatMessage({ id: 'orders.no_results' })
                  : viewMode === 'completed'
                    ? intl.formatMessage({ id: 'orders.empty_no_completed' })
                    : intl.formatMessage({ id: 'orders.empty_no_active' })}
              </div>
            ) : (
              <IonList lines="none" className="inventory-ledger__list">
                {filteredOrders.map((order) => {
                  const alreadyReceived = getOrderDisplayStatus(order) === 'received'
                  // Receive is available to any active member; edit + delete
                  // are manager-only. Mirrors the products list ordering.
                  const swipeActions =
                    viewMode !== 'completed'
                      ? [
                          ...(onReceiveOrder
                            ? [
                                {
                                  label: intl.formatMessage({
                                    id: 'orders.action_receive',
                                  }),
                                  variant: 'success' as const,
                                  disabled: alreadyReceived,
                                  onClick: () => onReceiveOrder(order),
                                },
                              ]
                            : []),
                          ...(canManage && onEditOrder
                            ? [
                                {
                                  label: intl.formatMessage({
                                    id: 'orders.action_edit',
                                  }),
                                  variant: 'neutral' as const,
                                  disabled: alreadyReceived,
                                  onClick: () => onEditOrder(order),
                                },
                              ]
                            : []),
                          ...(canManage && onDeleteOrder
                            ? [
                                {
                                  label: intl.formatMessage({
                                    id: 'orders.action_delete',
                                  }),
                                  variant: 'destructive' as const,
                                  disabled: !canDelete || alreadyReceived,
                                  onClick: () => onDeleteOrder(order),
                                },
                              ]
                            : []),
                        ]
                      : []
                  return (
                    <IonItemSliding key={order.id}>
                      <IonItem lines="none">
                        <OrderListItem order={order} onView={onViewOrder} />
                      </IonItem>
                      {swipeActions.length > 0 && (
                        <IonItemOptions side="end">
                          {swipeActions.map((action, index) => (
                            <IonItemOption
                              key={index}
                              color={
                                action.variant === 'destructive'
                                  ? 'danger'
                                  : action.variant === 'success'
                                    ? 'success'
                                    : 'medium'
                              }
                              disabled={action.disabled}
                              onClick={() => action.onClick()}
                            >
                              {action.label}
                            </IonItemOption>
                          ))}
                        </IonItemOptions>
                      )}
                    </IonItemSliding>
                  )
                })}
              </IonList>
            )}
          </div>

          {filteredOrders.length > 5 && (
            <button
              type="button"
              className="products-back-to-top"
              onClick={() => scrollToTop()}
            >
              <ChevronUp size={14} strokeWidth={2} />
              {intl.formatMessage({ id: 'products.back_to_top' })}
            </button>
          )}
        </>
      )}

      {/* Sort + filter sheet. */}
      <ModalShell
        isOpen={isSortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        title={intl.formatMessage({ id: 'orders.sort_filter_title' })}
        variant="half"
      >
        <div className="modal-step-item">
          <div className="sort-sheet-section">
            <span className="sort-sheet-section__label">
              {intl.formatMessage({ id: 'orders.sort_by_label' })}
            </span>
            <div>
              {ORDER_SORT_OPTIONS.map((option) => {
                const selected = sortBy === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSortChange(option.value)}
                    className={`sort-sheet-row${selected ? ' sort-sheet-row--selected' : ''}`}
                  >
                    <span className="sort-sheet-row__label">
                      {sortLabels[option.value]}
                    </span>
                    {selected && (
                      <span className="sort-sheet-row__check" aria-hidden="true">
                        <Check size={18} strokeWidth={2.4} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {viewMode === 'active' && (
          <div className="modal-step-item">
            <div className="sort-sheet-section">
              <span className="sort-sheet-section__label">
                {intl.formatMessage({ id: 'orders.filter_by_status_label' })}
              </span>
              <div>
                {(['all', 'pending', 'overdue'] as OrderStatusFilter[]).map(
                  (status) => {
                    const selected = statusFilter === status
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => onStatusFilterChange(status)}
                        className={`sort-sheet-row${selected ? ' sort-sheet-row--selected' : ''}`}
                      >
                        <span className="sort-sheet-row__label">
                          {statusFilterLabels[status]}
                        </span>
                        {selected && (
                          <span className="sort-sheet-row__check" aria-hidden="true">
                            <Check size={18} strokeWidth={2.4} />
                          </span>
                        )}
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  )
}
