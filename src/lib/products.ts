/**
 * Product-related constants and types for the productos page
 */

import type { ProductCategory, Product, Order, OrderItem, Provider } from '@/types'

// ============================================
// CATEGORY CONFIGURATION
// ============================================

export const CATEGORY_CONFIG: Record<ProductCategory, { label: string; order: number }> = {
  food: { label: 'Food', order: 1 },
  beverage: { label: 'Beverage', order: 2 },
  snack: { label: 'Snack', order: 3 },
  dessert: { label: 'Dessert', order: 4 },
  other: { label: 'Other', order: 5 },
}

// ============================================
// FILTER CONFIGURATION
// ============================================

/** Filter category type */
export type FilterCategory = 'all' | 'low_stock' | ProductCategory

export const FILTER_CONFIG: Record<Exclude<FilterCategory, 'all' | 'low_stock'>, { label: string; categories: ProductCategory[] }> = {
  food: { label: 'Food', categories: ['food'] },
  beverage: { label: 'Beverage', categories: ['beverage'] },
  snack: { label: 'Snack', categories: ['snack'] },
  dessert: { label: 'Dessert', categories: ['dessert'] },
  other: { label: 'Other', categories: ['other'] },
}

// ============================================
// SORT OPTIONS
// ============================================

export type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'category' | 'stock_asc' | 'stock_desc'

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
  { value: 'stock_asc', label: 'Stock (low to high)' },
  { value: 'stock_desc', label: 'Stock (high to low)' },
  { value: 'category', label: 'Category' },
]

// ============================================
// TAB TYPES
// ============================================

export type PageTab = 'products' | 'orders'

export const TAB_SUBTITLES: Record<PageTab, string> = {
  products: 'Manage your catalog',
  orders: 'Supplier orders',
}

// ============================================
// PRODUCT FILTER STATE
// ============================================

export interface ProductFilters {
  selectedFilter: FilterCategory
  sortBy: SortOption
}

// ============================================
// EXPANDED ORDER TYPE
// ============================================

/** Order with expanded relations for display */
export interface ExpandedOrder extends Order {
  expand?: {
    'order_items(order)'?: (OrderItem & {
      expand?: {
        product?: Product
      }
    })[]
    provider?: Provider
  }
}

// ============================================
// ORDER ITEM FOR FORM
// ============================================

export interface OrderFormItem {
  product: Product
  quantity: number
}

// ============================================
// ORDER STATUS FILTER
// ============================================

export type OrderStatusFilter = 'all' | 'pending' | 'received'
