// Productos components barrel export.
//
// AddProductModal, EditProductModal, ProductSettingsModal, and
// ProductInfoDrawer are intentionally NOT re-exported here. They're
// lazy-loaded via `dynamic(import(...))` from ProductsView.tsx, and
// having them in this barrel would defeat the code-splitting (Vite's
// `INEFFECTIVE_DYNAMIC_IMPORT` warning). Import them directly from
// their source files when needed.

export { ProductsTab } from './ProductsTab'
export type { ProductsTabProps } from './ProductsTab'

export { OrdersTab } from './OrdersTab'
export type { OrdersTabProps } from './OrdersTab'

export { OrderListItem } from './OrderListItem'

export type { ProductFormData, StockAdjustmentData } from './ProductModal'

export { NewOrderModal } from './NewOrderModal'
export type { NewOrderModalProps } from './NewOrderModal'

export { OrderDetailModal } from './OrderDetailModal'
export type { OrderDetailModalProps } from './OrderDetailModal'
