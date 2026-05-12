/**
 * Hook for managing product filtering, searching, and sorting
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  sortProducts,
  type FilterCategory,
  type SortOption,
} from '@/lib/products'
import type { Product, ProductCategory as IProductCategory, SortPreference } from '@kasero/shared/types'

// ============================================
// HOOK INTERFACE
// ============================================

interface UseProductFiltersOptions {
  products: Product[]
  categories: IProductCategory[]
  /** Initial sort preference from settings */
  sortPreference?: SortPreference
  /** Callback when sort changes (to persist to settings) */
  onSortChange?: (sort: SortOption) => void
}

interface UseProductFiltersReturn {
  // Search state
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Filter state
  selectedFilter: FilterCategory
  setSelectedFilter: (filter: FilterCategory) => void

  // Sort state
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void

  // Derived data
  filteredProducts: Product[]
  availableFilters: string[]
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useProductFilters({
  products,
  categories,
  sortPreference,
  onSortChange,
}: UseProductFiltersOptions): UseProductFiltersReturn {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all')

  // Sort state - initialize from settings if provided
  const [sortBy, setSortByState] = useState<SortOption>(() => sortPreference || 'name_asc')

  // Update sort when settings load
  useEffect(() => {
    if (sortPreference) {
      setSortByState(sortPreference)
    }
  }, [sortPreference])

  // Wrap setSortBy to also call onSortChange
  const setSortBy = useCallback((sort: SortOption) => {
    setSortByState(sort)
    onSortChange?.(sort)
  }, [onSortChange])

  // Include every category so a newly-created empty category shows up
  // in the filter sheet immediately, not only after a product is assigned.
  const availableFilters = useMemo(() => {
    const sortedCategoryIds = [...categories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(c => c.id)
    return ['low_stock', ...sortedCategoryIds]
  }, [categories])

  // Filter and search products, then sort via the shared `sortProducts`
  // util — same sort the new-order modal uses, so the two surfaces agree.
  const filteredProducts = useMemo(() => {
    let result = products

    // Filter by low stock (includes empty stock)
    if (selectedFilter === 'low_stock') {
      result = result.filter(p => {
        const stock = p.stock ?? 0
        const threshold = p.lowStockThreshold ?? 10
        return stock <= threshold
      })
    } else if (selectedFilter !== 'all') {
      // Filter by category ID
      result = result.filter(p => p.categoryId === selectedFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query)
      )
    }

    return sortProducts(result, sortBy, categories)
  }, [products, selectedFilter, searchQuery, sortBy, categories])

  return {
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    sortBy,
    setSortBy,
    filteredProducts,
    availableFilters,
  }
}
