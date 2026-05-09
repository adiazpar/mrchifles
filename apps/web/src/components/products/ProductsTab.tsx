'use client'

import { useIntl } from 'react-intl'

import Image from '@/lib/Image'
import { Fragment, memo, useMemo } from 'react'
import {
  X,
  Plus,
  ChevronUp,
  Loader2,
  Tags,
  ListFilter,
  ScanLine,
  ImagePlus,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Printer,
  Check,
} from 'lucide-react'
import {
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonList,
} from '@ionic/react'
import { ModalShell } from '@/components/ui'
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
  const intl = useIntl()

  const sortLabels: Record<SortPreference, string> = {
    name_asc: intl.formatMessage({ id: 'products.sort_name_asc' }),
    name_desc: intl.formatMessage({ id: 'products.sort_name_desc' }),
    price_asc: intl.formatMessage({ id: 'products.sort_price_asc' }),
    price_desc: intl.formatMessage({ id: 'products.sort_price_desc' }),
    category: intl.formatMessage({ id: 'products.sort_category' }),
    stock_asc: intl.formatMessage({ id: 'products.sort_stock_asc' }),
    stock_desc: intl.formatMessage({ id: 'products.sort_stock_desc' }),
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
    if (!categoryId) return intl.formatMessage({ id: 'products.uncategorized' })
    return categoryNameById.get(categoryId) ?? '-'
  }

  const hasProducts = products.length > 0

  return (
    <div className="flex flex-col gap-4">
      {error && !isModalOpen && (
        <div className="products-error">{error}</div>
      )}

      {hasProducts ? (
        <>
          {/* Search + scan + sort row — same chrome family as the POS
              search row. .app-search bar grows; tools-buttons are 48px
              circles for scan and sort/filter. */}
          <div className="products-tools-row">
            <label className="app-search">
              <span className="app-search__icon">{SearchIcon}</span>
              <input
                type="search"
                className="app-search__input"
                placeholder={intl.formatMessage({ id: 'products.search_placeholder' })}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label={intl.formatMessage({ id: 'products.search_placeholder' })}
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="app-search__clear"
                  onClick={() => onSearchChange('')}
                  aria-label={intl.formatMessage({ id: 'products.search_clear' })}
                >
                  <X />
                </button>
              )}
            </label>

            {onScanClick && (
              <button
                type="button"
                className="tools-button"
                onClick={onScanClick}
                disabled={scanBusy}
                aria-label={intl.formatMessage({ id: 'products.scan_aria' })}
              >
                {scanBusy ? (
                  <Loader2 className="animate-spin" size={18} strokeWidth={1.8} />
                ) : (
                  <ScanLine size={18} strokeWidth={1.8} />
                )}
              </button>
            )}

            <button
              type="button"
              className="tools-button"
              onClick={() => onSortSheetOpenChange(true)}
              aria-label={intl.formatMessage({ id: 'products.sort_filter_aria' })}
            >
              <ListFilter size={18} strokeWidth={1.8} />
            </button>
          </div>
          {scanHiddenInput}

          {/* Inventory ledger card — header (count + settings + add)
              followed by hairline-divided rows. */}
          <div className="inventory-ledger">
            <div className="inventory-ledger__header">
              <div className="inventory-ledger__count">
                <span className="inventory-ledger__count-num">
                  {filteredProducts.length}
                </span>
                {intl.formatMessage(
                  { id: 'products.product_count_unit' },
                  { count: filteredProducts.length },
                )}
                {canManage && (
                  <>
                    <span className="inventory-ledger__sep">·</span>
                    <button
                      type="button"
                      className="inventory-ledger__settings-link"
                      onClick={onOpenSettings}
                    >
                      {intl.formatMessage({ id: 'products.settings_link' })}
                    </button>
                  </>
                )}
              </div>
              {canManage && (
                <button
                  type="button"
                  className="inventory-ledger__add-button"
                  onClick={onAddProduct}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  {intl.formatMessage({ id: 'products.add_button' })}
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="inventory-ledger__empty">
                {intl.formatMessage({ id: 'products.no_results' })}
              </div>
            ) : (
              <IonList lines="none" className="inventory-ledger__list">
                {filteredProducts.map((product) => (
                  <Fragment key={product.id}>
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
              </IonList>
            )}
          </div>

          {filteredProducts.length > 5 && (
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
      ) : (
        // Empty state — Fraunces italic title, mono caption, terracotta CTA
        <div className="products-empty">
          <Tags className="products-empty__icon" aria-hidden="true" />
          <h2 className="products-empty__title">
            {intl.formatMessage({ id: 'products.empty_state_title' })}
          </h2>
          <p className="products-empty__desc">
            {intl.formatMessage({ id: 'products.empty_state_description' })}
          </p>
          {canManage && (
            <button
              type="button"
              className="products-empty__cta"
              onClick={onAddProduct}
            >
              <Plus size={14} strokeWidth={2.5} />
              {intl.formatMessage({ id: 'products.empty_state_button' })}
            </button>
          )}
        </div>
      )}

      {/* Sort + filter sheet */}
      <ModalShell
        isOpen={isSortSheetOpen}
        onClose={() => onSortSheetOpenChange(false)}
        title={intl.formatMessage({ id: 'products.sort_filter_title' })}
        variant="half"
      >
        <div className="modal-step-item">
          <div className="sort-sheet-section">
            <span className="sort-sheet-section__label">
              {intl.formatMessage({ id: 'products.sort_by_label' })}
            </span>
            <div>
              {SORT_OPTIONS.map((option) => {
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

        {availableFilters.length > 0 && (
          <div className="modal-step-item">
            <div className="sort-sheet-section">
              <span className="sort-sheet-section__label">
                {intl.formatMessage({ id: 'products.filter_by_category_label' })}
              </span>
              <div>
                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className={`sort-sheet-row${selectedFilter === 'all' ? ' sort-sheet-row--selected' : ''}`}
                >
                  <span className="sort-sheet-row__label">
                    {intl.formatMessage({ id: 'products.filter_all' })}
                  </span>
                  {selectedFilter === 'all' && (
                    <span className="sort-sheet-row__check" aria-hidden="true">
                      <Check size={18} strokeWidth={2.4} />
                    </span>
                  )}
                </button>
                {availableFilters.map((filter) => {
                  const selected = selectedFilter === filter
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => onFilterChange(filter)}
                      className={`sort-sheet-row${selected ? ' sort-sheet-row--selected' : ''}`}
                    >
                      <span className="sort-sheet-row__label">
                        {getFilterLabel(filter, categories)}
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
        )}
      </ModalShell>
    </div>
  )
}

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
  const intl = useIntl()
  const { formatCurrency } = useBusinessFormat()
  const iconUrl = getProductIconUrl(product)
  const stockValue = product.stock ?? 0
  const threshold = product.lowStockThreshold ?? 10
  const isLowStock = stockValue <= threshold
  const hasBarcode = !!product.barcode
  const isActive = product.active

  // Swipe actions render left-to-right. Semantic ordering mirrors the
  // orders list so muscle memory carries: primary leftmost, secondary
  // middle, remove-ish rightmost.
  const swipeActions = canModify && onAdjustInventory && onToggleActive
    ? [
        {
          icon: <SlidersHorizontal size={20} />,
          label: intl.formatMessage({ id: 'products.action_inventory' }),
          variant: 'info' as const,
          onClick: () => onAdjustInventory(product),
        },
        {
          icon: <Printer size={20} />,
          label: intl.formatMessage({ id: 'products.action_print' }),
          variant: 'warning' as const,
          disabled: !hasBarcode,
          onClick: () =>
            printBarcodeLabel({
              barcode: product.barcode ?? '',
              barcodeFormat: product.barcodeFormat ?? null,
              name: product.name,
            }),
        },
        {
          icon: isActive ? <EyeOff size={20} /> : <Eye size={20} />,
          label: isActive
            ? intl.formatMessage({ id: 'products.action_disable' })
            : intl.formatMessage({ id: 'products.action_enable' }),
          variant: 'neutral' as const,
          onClick: () => onToggleActive(product),
        },
      ]
    : []

  // Tap dispatch: managers (canModify) open the edit modal; everyone
  // else gets the read-only ProductInfoDrawer. Row is always tappable.
  const activate = canModify
    ? () => onEdit(product)
    : onView
      ? () => onView(product)
      : undefined

  return (
    <IonItemSliding>
      {/* lines="none" + a custom flex layout — IonItem's slot system was
          forcing a too-tight rhythm between the name and the metadata
          rows, and pushing the icon a fixed 16px away from the price
          column. The custom row gives each metadata line proper breath
          and lets the price anchor render in italic Fraunces. */}
      <IonItem
        button={!!activate}
        detail={false}
        onClick={activate}
        lines="none"
        className="product-row-host"
      >
        <div
          className={`product-row${!isActive ? ' product-row--inactive' : ''}`}
        >
          <div
            className={`product-row__icon${!isActive ? ' product-row__icon--inactive' : ''}`}
            aria-hidden="true"
          >
            {iconUrl && isPresetIcon(iconUrl) ? (
              (() => {
                const p = getPresetIcon(iconUrl)
                return p ? <p.icon size={20} className="text-text-primary" /> : null
              })()
            ) : iconUrl ? (
              <Image
                src={iconUrl}
                alt=""
                width={32}
                height={32}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <ImagePlus size={16} className="text-text-tertiary" />
            )}
          </div>

          <div className="product-row__body">
            <h3 className="product-row__name">{product.name}</h3>
            <span className="product-row__category">{categoryName}</span>
            {hasBarcode && (
              <span className="product-row__barcode">
                <ScanLine size={12} strokeWidth={1.8} />
                <span className="product-row__barcode-value">
                  {product.barcode}
                </span>
              </span>
            )}
          </div>

          <div className="product-row__trail">
            <span className="product-row__price">
              {formatCurrency(product.price)}
            </span>
            <span
              className={`product-row__stock${isLowStock && isActive ? ' product-row__stock--low' : ''}`}
            >
              {intl.formatMessage(
                { id: 'products.units_count' },
                { count: stockValue },
              )}
            </span>
          </div>
        </div>
      </IonItem>
      {swipeActions.length > 0 && (
        <IonItemOptions side="end">
          {swipeActions.map((action, index) => (
            <IonItemOption
              key={index}
              color={
                action.variant === 'warning'
                  ? 'warning'
                  : action.variant === 'info'
                    ? 'primary'
                    : 'medium'
              }
              onClick={() => action.onClick()}
            >
              {action.label}
            </IonItemOption>
          ))}
        </IonItemOptions>
      )}
    </IonItemSliding>
  )
})
