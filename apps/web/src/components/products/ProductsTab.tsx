'use client'

import { useIntl } from 'react-intl';

import Image from '@/lib/Image'
import { Fragment, memo, useMemo } from 'react'
import { X, Plus, ChevronUp, ChevronRight, Loader2, Tags, ListFilter, ScanLine, ImagePlus, SlidersHorizontal, Eye, EyeOff, Printer } from 'lucide-react'
import { Modal, SwipeableRow } from '@/components/ui'
import { printBarcodeLabel } from '@/lib/barcode-print'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { scrollToTop } from '@/lib/scroll'
import {
  SORT_OPTIONS,
  getFilterLabel,
  type FilterCategory,
  type SortOption,
} from '@/lib/products'
import type { Product, ProductCategory, SortPreference } from '@kasero/shared/types'

// ============================================
// PROPS INTERFACE
// ============================================

export interface ProductsTabProps {
  // Data
  products: Product[]
  filteredProducts: Product[]
  categories: ProductCategory[]
  availableFilters: string[]

  // Search state
  searchQuery: string
  onSearchChange: (query: string) => void

  // Filter state
  selectedFilter: FilterCategory
  onFilterChange: (filter: FilterCategory) => void

  // Sort state
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void

  // Modal controls
  isSortSheetOpen: boolean
  onSortSheetOpenChange: (open: boolean) => void

  // Handlers
  onAddProduct: () => void
  onEditProduct: (product: Product) => void
  onViewProduct?: (product: Product) => void
  onAdjustInventory?: (product: Product) => void
  onToggleActive?: (product: Product) => void
  onOpenSettings: () => void

  // Permissions
  canModify?: boolean
  canManage?: boolean

  // Error state
  error?: string
  isModalOpen?: boolean

  // Scan-to-search
  onScanClick?: () => void
  scanBusy?: boolean
  scanHiddenInput?: React.ReactNode
}

// ============================================
// COMPONENT
// ============================================

export function ProductsTab({
  products,
  filteredProducts,
  categories,
  availableFilters,
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  isSortSheetOpen,
  onSortSheetOpenChange,
  onAddProduct,
  onEditProduct,
  onViewProduct,
  onAdjustInventory,
  onToggleActive,
  onOpenSettings,
  canModify = false,
  canManage = false,
  error,
  isModalOpen,
  onScanClick,
  scanBusy,
  scanHiddenInput,
}: ProductsTabProps) {
  const t = useIntl()
  const tCommon = useIntl()

  const sortLabels: Record<SortPreference, string> = {
    name_asc: t.formatMessage({
      id: 'products.sort_name_asc'
    }),
    name_desc: t.formatMessage({
      id: 'products.sort_name_desc'
    }),
    price_asc: t.formatMessage({
      id: 'products.sort_price_asc'
    }),
    price_desc: t.formatMessage({
      id: 'products.sort_price_desc'
    }),
    category: t.formatMessage({
      id: 'products.sort_category'
    }),
    stock_asc: t.formatMessage({
      id: 'products.sort_stock_asc'
    }),
    stock_desc: t.formatMessage({
      id: 'products.sort_stock_desc'
    }),
  }

  // Look up category name by ID in O(1). Without this map, rendering a
  // list of N products with M categories cost O(N*M) .find() calls per
  // render — noticeable once a business has 100+ products with
  // categories set.
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.id, c.name)
    return map
  }, [categories])

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return '-'
    return categoryNameById.get(categoryId) ?? '-'
  }

  return (
    <div className="page-body space-y-4">
      {error && !isModalOpen && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}
      {/* Search, Filter, and List Header - only show when products exist */}
      {products.length > 0 && (
        <>
          {/* Search Bar + Scan + Sort & Filter Buttons */}
          <div className="flex gap-2 items-stretch">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t.formatMessage({
                  id: 'products.search_placeholder'
                })}
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="input input-search w-full h-full"
                style={{ paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingRight: '2.25rem', fontSize: 'var(--text-sm)', minHeight: 'unset' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
                  aria-label={t.formatMessage({
                    id: 'products.search_clear'
                  })}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {onScanClick && (
              <button
                type="button"
                onClick={onScanClick}
                disabled={scanBusy}
                className="btn btn-secondary btn-icon flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t.formatMessage({
                  id: 'products.scan_aria'
                })}
              >
                {scanBusy ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                ) : (
                  <ScanLine size={18} />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => onSortSheetOpenChange(true)}
              className="btn btn-secondary btn-icon flex-shrink-0"
              aria-label={t.formatMessage({
                id: 'products.sort_filter_aria'
              })}
            >
              <ListFilter style={{ width: 18, height: 18 }} />
            </button>
          </div>
          {scanHiddenInput}

          {/* Product List Card */}
          <div className="card p-4 space-y-4">
            {/* List Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {t.formatMessage({
                    id: 'products.product_count'
                  }, { count: filteredProducts.length })}
                </span>
                <span className="text-text-tertiary">&#183;</span>
                {canManage && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-sm text-brand hover:text-brand transition-colors"
                  >
                    {t.formatMessage({
                      id: 'products.settings_link'
                    })}
                  </button>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', minHeight: 'unset', gap: 'var(--space-2)', borderRadius: 'var(--radius-full)' }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  {t.formatMessage({
                    id: 'products.add_button'
                  })}
                </button>
              )}
            </div>

            <hr className="border-border" />

            {/* Product List */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <p>{t.formatMessage({
                  id: 'products.no_results'
                })}</p>
              </div>
            ) : (
              <div className="list-divided">
                {filteredProducts.map((product, i) => (
                  <Fragment key={product.id}>
                    {i > 0 && <hr className="list-divider" />}
                    <ProductListItem
                      product={product}
                      categoryName={getCategoryName(product.categoryId)}
                      onEdit={onEditProduct}
                      onView={onViewProduct}
                      onAdjustInventory={onAdjustInventory}
                      onToggleActive={onToggleActive}
                      canModify={canModify}
                    />
                  </Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Back to top button */}
          {filteredProducts.length > 5 && (
            <button
              type="button"
              onClick={() => scrollToTop()}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
              {t.formatMessage({
                id: 'products.back_to_top'
              })}
            </button>
          )}
        </>
      )}
      {/* Empty state - no products at all */}
      {products.length === 0 && (
        <div className="empty-state-fill">
          <Tags className="empty-state-icon" />
          <h3 className="empty-state-title">{t.formatMessage({
            id: 'products.empty_state_title'
          })}</h3>
          <p className="empty-state-description">
            {t.formatMessage({
              id: 'products.empty_state_description'
            })}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={onAddProduct}
              className="btn btn-primary mt-4"
              style={{ fontSize: 'var(--text-sm)', padding: '10px var(--space-5)', minHeight: 'unset', gap: 'var(--space-2)' }}
            >
              <Plus className="w-4 h-4" />
              {t.formatMessage({
                id: 'products.empty_state_button'
              })}
            </button>
          )}
        </div>
      )}
      {/* Sort & Filter Modal */}
      <Modal
        isOpen={isSortSheetOpen}
        onClose={() => onSortSheetOpenChange(false)}
        title={t.formatMessage({
          id: 'products.sort_filter_title'
        })}
      >
        <Modal.Item>
            <div className="space-y-2">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{t.formatMessage({
                id: 'products.sort_by_label'
              })}</span>
              <div className="space-y-1">
                {SORT_OPTIONS.map(option => (
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

        {/* Filter Section */}
        {availableFilters.length > 0 && (
          <Modal.Item>
              <div className="space-y-2">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">{t.formatMessage({
                  id: 'products.filter_by_category_label'
                })}</span>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => onFilterChange('all')}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-bg-muted transition-colors"
                  >
                    <span className={selectedFilter === 'all' ? 'font-medium text-brand' : 'text-text-primary'}>
                      {t.formatMessage({
                        id: 'products.filter_all'
                      })}
                    </span>
                    {selectedFilter === 'all' && (
                      <span className="w-5 h-5 text-brand">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </button>
                  {availableFilters.map(filter => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => onFilterChange(filter)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-bg-muted transition-colors"
                    >
                      <span className={selectedFilter === filter ? 'font-medium text-brand' : 'text-text-primary'}>
                        {getFilterLabel(filter, categories)}
                      </span>
                      {selectedFilter === filter && (
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
            onClick={() => onSortSheetOpenChange(false)}
            className="btn btn-primary flex-1"
          >
            {tCommon.formatMessage({
              id: 'common.done'
            })}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ============================================
// MEMOIZED LIST ITEM
// ============================================

interface ProductListItemProps {
  product: Product
  categoryName: string
  onEdit: (product: Product) => void
  onView?: (product: Product) => void
  onAdjustInventory?: (product: Product) => void
  onToggleActive?: (product: Product) => void
  canModify?: boolean
}

const ProductListItem = memo(function ProductListItem({
  product,
  categoryName,
  onEdit,
  onView,
  onAdjustInventory,
  onToggleActive,
  canModify = false,
}: ProductListItemProps) {
  const t = useIntl()
  const { formatCurrency } = useBusinessFormat()
  const iconUrl = getProductIconUrl(product)
  const stockValue = product.stock ?? 0
  const threshold = product.lowStockThreshold ?? 10
  const isLowStock = stockValue <= threshold
  const hasBarcode = !!product.barcode
  const isActive = product.active

  // Swipe actions render left-to-right; the rightmost is exposed first as the row
  // slides. Semantic ordering mirrors the orders list so muscle memory carries across
  // surfaces: the "remove-ish" action sits rightmost (easiest to reach), the primary
  // everyday action sits leftmost (requires the deepest swipe), and the secondary
  // action is in the middle. For products that means:
  //   inventory  (primary)  →  print  (secondary)  →  disable/enable  (remove-ish)
  const swipeActions = canModify && onAdjustInventory && onToggleActive
    ? [
        {
          icon: <SlidersHorizontal size={20} />,
          label: t.formatMessage({
            id: 'products.action_inventory'
          }),
          variant: 'info' as const,
          onClick: () => onAdjustInventory(product),
        },
        {
          icon: <Printer size={20} />,
          label: t.formatMessage({
            id: 'products.action_print'
          }),
          variant: 'warning' as const,
          disabled: !hasBarcode,
          onClick: () => printBarcodeLabel({
            barcode: product.barcode ?? '',
            barcodeFormat: product.barcodeFormat ?? null,
            name: product.name,
          }),
        },
        {
          icon: isActive ? <EyeOff size={20} /> : <Eye size={20} />,
          label: isActive ? t.formatMessage({
            id: 'products.action_disable'
          }) : t.formatMessage({
            id: 'products.action_enable'
          }),
          variant: 'neutral' as const,
          onClick: () => onToggleActive(product),
        },
      ]
    : []

  // Tap dispatch: managers (canModify) open the edit modal; everyone else
  // gets the read-only ProductInfoDrawer. The row is always tappable —
  // employees just land on a different surface.
  const activate = canModify ? () => onEdit(product) : (onView ? () => onView(product) : undefined)

  return (
    <SwipeableRow actions={swipeActions}>
      <div
        className={`list-item-clickable ${hasBarcode ? 'items-start' : ''}`}
        onClick={activate}
        onKeyDown={activate ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            activate()
          }
        } : undefined}
        tabIndex={activate ? 0 : undefined}
        role={activate ? 'button' : undefined}
      >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {/* Product Icon */}
          <div className="product-list-image">
            {iconUrl && isPresetIcon(iconUrl) ? (
              (() => { const p = getPresetIcon(iconUrl); return p ? <p.icon size={24} className="text-text-primary" /> : null })()
            ) : iconUrl ? (
              <Image
                src={iconUrl}
                alt={product.name}
                width={40}
                height={40}
                className="product-list-image-img"
                unoptimized
              />
            ) : (
              <ImagePlus className="w-5 h-5 text-text-tertiary" />
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <span className={`font-medium truncate block ${!product.active ? 'text-text-tertiary' : ''}`}>
              {product.name}
            </span>
            <span className="text-xs text-text-tertiary mt-0.5 block">
              {categoryName}
            </span>
          </div>

          {/* Price and Stock */}
          <div className="text-right flex-shrink-0">
            <span className={`font-medium block ${!product.active ? 'text-text-tertiary' : 'text-text-primary'}`}>
              {formatCurrency(product.price)}
            </span>
            <span className={`text-xs mt-0.5 block ${isLowStock && product.active ? 'text-error' : 'text-text-tertiary'}`}>
              {t.formatMessage({
                id: 'products.units_count'
              }, { count: stockValue })}
            </span>
          </div>

          {/* Chevron */}
          <div className="text-text-tertiary ml-2 flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {hasBarcode && (
          <div className="mt-3 flex items-center gap-3 text-left">
            <div className="w-12 flex-shrink-0 flex items-center justify-center self-center">
              <ScanLine className="w-4 h-4 text-text-tertiary" />
            </div>
            <span className="text-xs text-text-tertiary break-all block min-w-0">
              {product.barcode}
            </span>
          </div>
        )}
        </div>
      </div>
    </SwipeableRow>
  );
})
