'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchDeduped } from '@/lib/fetch'
import { useBusiness } from '@/contexts/business-context'
import { useAuth } from '@/contexts/auth-context'
import { useProductFilters, useProductSettings, createSessionCache, CACHE_KEYS } from '@/hooks'
import { Spinner, TabContainer } from '@/components/ui'
import {
  ProductsTab,
  OrdersTab,
  AddProductModal,
  EditProductModal,
  ProductSettingsModal,
  type ProductFormData,
  type StockAdjustmentData,
} from '@/components/products'
import { ProductFormProvider, useProductForm } from '@/contexts/product-form-context'
import type { PipelineStep } from '@/hooks'
import {
  type PageTab,
  type OrderStatusFilter,
  type OrderSortOption,
  type SortOption,
  getOrderDisplayStatus,
} from '@/lib/products'
import { getProductIconUrl } from '@/lib/utils'
import { useAiProductPipeline, useImageCompression, useBusinessFormat } from '@/hooks'
import { useOrderFlows } from '@/hooks/useOrderFlows'
import { useOrders } from '@/contexts/orders-context'
import { useProviders } from '@/contexts/providers-context'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { useTranslations } from 'next-intl'
import type { Product, SortPreference, ProductCategory } from '@/types'

// ============================================
// SESSION CACHE
// ============================================

function scopedCache<T>(key: string, businessId: string) {
  return createSessionCache<T>(`${key}_${businessId}`)
}

// ============================================
// PRODUCT MODAL WRAPPER
// Syncs pipeline state to context and populates form on edit
// ============================================

// ============================================
// ADD PRODUCT MODAL WRAPPER
// ============================================

interface AddProductModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  categories: ProductCategory[]
  pipelineState: {
    step: PipelineStep
    result?: {
      name: string
      categoryId: string | null
      suggestedNewCategoryName: string | null
      iconPreview: string
      iconBlob: Blob
    } | null
    error?: string | null
  }
  isCompressing: boolean
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onAbortAiProcessing: () => void
  onPipelineReset: () => void
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onStartAiPipeline: () => void
  onCreateCategory: (name: string) => Promise<string | null>
  onOpenSettings: () => void
  onClearPendingPhoto: () => void
  checkBarcodeExists: (barcode: string) => Promise<string | null>
  defaultCategoryId?: string | null
}

function AddProductModalWrapper({
  isOpen,
  onClose,
  categories,
  pipelineState,
  isCompressing,
  onSubmit,
  onAbortAiProcessing,
  onPipelineReset,
  onAiPhotoCapture,
  onStartAiPipeline,
  onCreateCategory,
  onOpenSettings,
  onClearPendingPhoto,
  checkBarcodeExists,
  defaultCategoryId,
}: AddProductModalWrapperProps) {
  const tProductForm = useTranslations('productForm')
  const pendingActionRef = useRef<(() => void) | null>(null)
  const {
    barcode,
    setPipelineStep,
    setIsCompressing,
    setName,
    setCategoryId,
    setIconPreview,
    setGeneratedIconBlob,
    setIconType,
    setPresetEmoji,
    setError,
    resetForm,
  } = useProductForm()

  const handleStartAiPipelineWithBarcodeCheck = useCallback(async () => {
    setError('')
    const trimmed = barcode.trim()
    if (trimmed) {
      const existingName = await checkBarcodeExists(trimmed)
      if (existingName) {
        setError(tProductForm('barcode_already_used', { name: existingName }))
        return
      }
    }
    onStartAiPipeline()
  }, [barcode, checkBarcodeExists, onStartAiPipeline, setError, tProductForm])

  useEffect(() => {
    setPipelineStep(pipelineState.step)
  }, [pipelineState.step, setPipelineStep])

  useEffect(() => {
    setIsCompressing(isCompressing)
  }, [isCompressing, setIsCompressing])

  useEffect(() => {
    if (pipelineState.step === 'complete' && pipelineState.result) {
      const result = pipelineState.result
      setName(result.name)
      if (result.categoryId) {
        setCategoryId(result.categoryId)
      }
      setGeneratedIconBlob(result.iconBlob)
      setIconPreview(result.iconPreview)
      setIconType('custom')
      setPresetEmoji(null)
    }
  }, [
    pipelineState.step,
    pipelineState.result,
    setName,
    setCategoryId,
    setGeneratedIconBlob,
    setIconPreview,
    setIconType,
    setPresetEmoji,
  ])

  useEffect(() => {
    if (pipelineState.step === 'error' && pipelineState.error) {
      setError(pipelineState.error)
    }
  }, [pipelineState.step, pipelineState.error, setError])

  const handleExitComplete = useCallback(() => {
    resetForm(defaultCategoryId)
    if (pendingActionRef.current) {
      pendingActionRef.current()
      pendingActionRef.current = null
    }
  }, [resetForm, defaultCategoryId])

  const handleOpenSettings = useCallback(() => {
    pendingActionRef.current = onOpenSettings
    onClose()
  }, [onOpenSettings, onClose])

  const suggestedCategoryName = pipelineState.result?.suggestedNewCategoryName ?? null

  return (
    <AddProductModal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={handleExitComplete}
      categories={categories}
      onSubmit={onSubmit}
      onAbortAiProcessing={onAbortAiProcessing}
      onPipelineReset={onPipelineReset}
      onAiPhotoCapture={onAiPhotoCapture}
      onOpenSettings={handleOpenSettings}
      suggestedCategoryName={suggestedCategoryName}
      onCreateCategory={onCreateCategory}
      onStartAiPipeline={handleStartAiPipelineWithBarcodeCheck}
      onClearPendingPhoto={onClearPendingPhoto}
    />
  )
}

// ============================================
// EDIT PRODUCT MODAL WRAPPER
// ============================================

interface EditProductModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  onExitCleanup: () => void
  categories: ProductCategory[]
  editingProduct: Product | null
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onDelete: (productId: string) => Promise<boolean>
  onSaveAdjustment: (data: StockAdjustmentData) => Promise<void>
  canDelete: boolean
  defaultCategoryId?: string | null
  initialStep?: number
}

function EditProductModalWrapper({
  isOpen,
  onClose,
  onExitCleanup,
  categories,
  editingProduct,
  onSubmit,
  onDelete,
  onSaveAdjustment,
  canDelete,
  defaultCategoryId,
  initialStep,
}: EditProductModalWrapperProps) {
  const { populateFromProduct, resetForm } = useProductForm()

  // Populate form when modal opens with a product
  useEffect(() => {
    if (isOpen && editingProduct) {
      populateFromProduct(editingProduct, getProductIconUrl)
    }
  }, [isOpen, editingProduct, populateFromProduct])

  const handleExitComplete = useCallback(() => {
    resetForm(defaultCategoryId)
    onExitCleanup()
  }, [resetForm, defaultCategoryId, onExitCleanup])

  return (
    <EditProductModal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={handleExitComplete}
      categories={categories}
      onSubmit={onSubmit}
      onDelete={onDelete}
      onSaveAdjustment={onSaveAdjustment}
      canDelete={canDelete}
      initialStep={initialStep}
    />
  )
}

export default function ProductosPage() {
  const t = useTranslations('products')
  const tOrders = useTranslations('orders')
  const { user } = useAuth()
  const { canManage, businessId } = useBusiness()
  const { formatDate, locale } = useBusinessFormat()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Tab state — initialized from the URL so browser back/forward and
  // router.back() restore the tab the user was on.
  const [activeTab, setActiveTab] = useState<PageTab>(() =>
    searchParams?.get('tab') === 'orders' ? 'orders' : 'products'
  )

  // Build the canonical URL for a given tab so we can keep the URL in sync
  // with tab state. Products is the default and carries no query param.
  const urlForTab = useCallback(
    (tab: PageTab) =>
      tab === 'products' ? `/${businessId}/products` : `/${businessId}/products?tab=orders`,
    [businessId]
  )

  // Business-scoped caches (only products remain page-local; orders and
  // providers live in shared contexts now).
  const bid = businessId || ''
  const productsCache = useMemo(() => scopedCache<Product[]>(CACHE_KEYS.PRODUCTS, bid), [bid])

  // Data state - initialize from cache
  const [products, setProductsState] = useState<Product[]>(() => scopedCache<Product[]>(CACHE_KEYS.PRODUCTS, bid).get() || [])
  const [isLoading, setIsLoading] = useState(() => !scopedCache<Product[]>(CACHE_KEYS.PRODUCTS, bid).get())
  const [error, setError] = useState('')

  // Shared stores (see src/contexts/{orders,providers}-context). Any
  // mutation anywhere in the app updates these single sources of truth,
  // so the Orders tab automatically stays in sync with, e.g., a provider
  // deletion from the provider detail page.
  const { orders, setOrders, ensureLoaded: ensureOrdersLoaded } = useOrders()
  const {
    providers,
    ensureLoaded: ensureProvidersLoaded,
  } = useProviders()
  // The new-order modal dropdown should only surface usable providers.
  const activeProviders = useMemo(() => providers.filter(p => p.active), [providers])

  // Wrapper function that updates both state and sessionStorage cache.
  const setProducts = useCallback((updater: Product[] | ((prev: Product[]) => Product[])) => {
    setProductsState(prev => {
      const newProducts = typeof updater === 'function' ? updater(prev) : updater
      productsCache.set(newProducts)
      return newProducts
    })
  }, [productsCache])

  // Product settings
  const productSettings = useProductSettings({ businessId: businessId || '' })
  const {
    categories,
    settings,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    updateSettings,
    isCreating: isCreatingCategory,
    isUpdating: isUpdatingCategory,
    isDeleting: isDeletingCategory,
    isSavingSettings,
    error: settingsError,
    clearError: clearSettingsError,
  } = productSettings

  // Handler to update sort preference in settings
  const handleSortChange = useCallback(async (sort: SortOption) => {
    await updateSettings({ sortPreference: sort as SortPreference })
  }, [updateSettings])

  // Product filters
  const {
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    sortBy,
    setSortBy,
    filteredProducts,
    availableFilters,
  } = useProductFilters({
    products,
    categories,
    sortPreference: settings?.sortPreference,
    onSortChange: handleSortChange,
  })

  // Sort sheet state
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false)

  // Product settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Product modal state
  const [isModalOpen, setIsModalOpen] = useState(false)

  // AI Pipeline (needed by page for photo capture handler)
  const pipeline = useAiProductPipeline()
  const compression = useImageCompression()

  // Order search/filter state (not part of the modal flow)
  const [orderSearchQuery, setOrderSearchQuery] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all')
  const [orderSortBy, setOrderSortBy] = useState<OrderSortOption>('date_desc')

  // Permission check
  const canDelete = canManage

  // New/Edit/Receive/Delete order flows are encapsulated in this hook so
  // multiple pages can reuse them (products tab, provider detail, etc.).
  const orderFlows = useOrderFlows({
    businessId: businessId || '',
    products,
    providers: activeProviders,
    setOrders,
    setProducts,
    canDelete,
  })

  // Load products (page-local) + providers (shared context) on mount.
  useEffect(() => {
    if (!businessId) return

    const cachedProducts = productsCache.get()

    // Providers live in the shared context; ensureLoaded is idempotent
    // so a previously-hydrated context is a no-op.
    ensureProvidersLoaded()

    if (cachedProducts) {
      // Products already loaded from cache in useState.
      return
    }

    let cancelled = false

    async function loadInitialData() {
      try {
        const response = await fetchDeduped(`/api/businesses/${businessId}/products`)
        const result = await response.json()
        if (cancelled) return
        if (response.ok && result.success) {
          setProducts(result.products)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error loading data:', err)
        setError(tOrders('error_failed_to_load'))
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadInitialData()
    return () => { cancelled = true }
  }, [businessId, setProducts, productsCache, ensureProvidersLoaded, tOrders])

  // Lazy load orders when switching to orders tab (idempotent via context).
  useEffect(() => {
    if (!businessId || activeTab !== 'orders') return
    ensureOrdersLoaded()
  }, [activeTab, businessId, ensureOrdersLoaded])

  // Open modals from query string (deep-links from provider detail page)
  useEffect(() => {
    const newOrderFlag = searchParams?.get('newOrder')
    const preselectedProviderId = searchParams?.get('providerId')
    const deepLinkedOrderId = searchParams?.get('orderId')

    if (newOrderFlag === '1') {
      setActiveTab('orders')
      orderFlows.openNewOrder(preselectedProviderId || undefined)
      // Drop the deep-link params but keep ?tab=orders so tab state
      // persists across back/forward navigation.
      router.replace(urlForTab('orders'))
      return
    }

    if (deepLinkedOrderId && orders.length > 0) {
      const target = orders.find(o => o.id === deepLinkedOrderId)
      if (target) {
        setActiveTab('orders')
        orderFlows.openOrderDetail(target)
        router.replace(urlForTab('orders'))
      }
    }
    // Intentional: we only want this effect to react when orders load or
    // when the user navigates here with a different query. No exhaustive-deps
    // on the setters; they are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, orders, businessId])

  // Track which product is being edited (for passing to modal wrapper)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editInitialStep, setEditInitialStep] = useState(0)

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders

    if (orderStatusFilter !== 'all') {
      result = result.filter(o => getOrderDisplayStatus(o) === orderStatusFilter)
    }

    if (orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase()
      result = result.filter(o => {
        const providerName = o.expand?.provider?.name?.toLowerCase() || ''
        const d = new Date(o.date)
        const dateStr = formatDate(d).toLowerCase()
        const dayNum = d.getDate().toString()
        const year = d.getFullYear().toString()
        // Generate month/day names in both business locale and user language
        const userLang = user?.language || 'en-US'
        const seen = new Set<string>()
        const langs = [locale, userLang].filter(l => {
          const base = l.split('-')[0]
          if (seen.has(base)) return false
          seen.add(base)
          return true
        })
        const names = langs.flatMap(l => [
          d.toLocaleDateString(l, { month: 'long' }),
          d.toLocaleDateString(l, { month: 'short' }),
          d.toLocaleDateString(l, { weekday: 'long' }),
          d.toLocaleDateString(l, { weekday: 'short' }),
        ]).join(' ').toLowerCase()
        const orderNumber = o.orderNumber != null ? `#${o.orderNumber} ${o.orderNumber}` : ''
        const searchable = `${orderNumber} ${dateStr} ${names} ${dayNum} ${year} ${providerName}`
        return searchable.includes(query)
      })
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (orderSortBy) {
        case 'date_desc': return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'date_asc': return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'total_desc': return b.total - a.total
        case 'total_asc': return a.total - b.total
        default: return 0
      }
    })

    return result
  }, [orders, orderStatusFilter, orderSearchQuery, orderSortBy, formatDate, locale, user?.language])

  // Product handlers - now receive data from modal context
  const handleSubmitProduct = useCallback(async (
    formData: ProductFormData,
    editingProductId: string | null
  ): Promise<boolean> => {
    if (!formData.name.trim()) {
      return false
    }

    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum < 0) {
      return false
    }

    try {
      const data = new FormData()
      data.append('name', formData.name.trim())
      data.append('price', priceNum.toString())
      data.append('categoryId', formData.categoryId || '')
      data.append('active', formData.active.toString())
      data.append('barcode', formData.barcode || '')
      data.append('barcodeFormat', formData.barcodeFormat || '')
      data.append('barcodeSource', formData.barcodeSource || '')
      if (formData.generatedIconBlob) {
        data.append('icon', formData.generatedIconBlob, 'icon.png')
      } else if (formData.iconType === 'preset' && formData.presetEmoji) {
        data.append('presetIcon', formData.presetEmoji)
      } else if (formData.iconType === null) {
        // Icon was cleared
        data.append('clearIcon', 'true')
      }

      const url = editingProductId
        ? `/api/businesses/${businessId}/products/${editingProductId}`
        : `/api/businesses/${businessId}/products`
      const method = editingProductId ? 'PATCH' : 'POST'

      const response = await fetch(url, { method, body: data })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save product')
      }

      const record: Product = result.product
      if (editingProductId) {
        setProducts(prev => prev.map(p => p.id === record.id ? record : p))
      } else {
        setProducts(prev => [...prev, record].sort((a, b) => a.name.localeCompare(b.name)))
      }

      return true
    } catch (err) {
      console.warn('Error saving product:', err)
      if (err instanceof Error) {
        throw err
      }
      throw new Error('Failed to save product')
    }
  }, [businessId, setProducts])

  const handleDeleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/products/${productId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        return false
      }

      setProducts(prev => prev.filter(p => p.id !== productId))
      return true
    } catch (err) {
      console.error('Error deleting product:', err)
      return false
    }
  }, [businessId, setProducts])

  const handleSaveAdjustment = useCallback(async (data: StockAdjustmentData) => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/products/${data.productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: data.newStockValue }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        return
      }

      setProducts(prev => prev.map(p => p.id === data.productId ? { ...p, stock: data.newStockValue } : p))
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error adjusting stock:', err)
    }
  }, [businessId, setProducts])

  const handleCloseModal = useCallback(() => {
    if (pipeline.state.step !== 'idle') {
      pipeline.cancel()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setPendingAiImage(null)
    setIsModalOpen(false)
  }, [pipeline, compression])

  const handleOpenAdd = useCallback(() => {
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setEditingProduct(null)
    setIsModalOpen(true)
  }, [pipeline, compression])

  const handleOpenEdit = useCallback((product: Product) => {
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setEditInitialStep(0)
    setEditingProduct(product)
    setIsModalOpen(true)
  }, [pipeline, compression])

  const handleAdjustInventory = useCallback((product: Product) => {
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setEditInitialStep(1)
    setEditingProduct(product)
    setIsModalOpen(true)
  }, [pipeline, compression])

  const handleToggleActive = useCallback(async (product: Product) => {
    const nextActive = !product.active
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, active: nextActive } : p
      )
    )
    try {
      const fd = new FormData()
      fd.set('active', nextActive ? 'true' : 'false')
      const response = await fetch(`/api/businesses/${businessId}/products/${product.id}`, {
        method: 'PATCH',
        body: fd,
      })
      if (!response.ok) throw new Error('PATCH failed')
    } catch (err) {
      console.error('Error toggling product status:', err)
      // Revert
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: product.active } : p))
      )
    }
  }, [businessId, setProducts])

  const handleBarcodeScanResult = useCallback(async ({ value }: { value: string }) => {
    setError('')
    try {
      const response = await fetch(
        `/api/businesses/${businessId}/products?barcode=${encodeURIComponent(value)}`
      )
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(tOrders('error_unable_to_lookup_barcode'))
        return
      }

      const matched: Product[] = data.products || []
      if (matched.length > 0) {
        handleOpenEdit(matched[0])
      } else {
        setSearchQuery(value)
      }
    } catch {
      setError(tOrders('error_unable_to_lookup_barcode'))
    }
  }, [businessId, handleOpenEdit, setError, setSearchQuery, tOrders])

  const {
    open: openBarcodeScan,
    busy: barcodeScanBusy,
    hiddenInput: barcodeScanInput,
  } = useBarcodeScan({
    onResult: handleBarcodeScanResult,
    onError: setError,
  })

  const [pendingAiImage, setPendingAiImage] = useState<string | null>(null)

  const handleAiPhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const compressedBase64 = await compression.compressImage(file)

    if (compression.state.error || !compressedBase64) {
      return
    }

    setPendingAiImage(compressedBase64)
  }, [compression])

  const handleStartAiPipeline = useCallback(() => {
    if (!pendingAiImage) return
    pipeline.startPipeline(pendingAiImage, {
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to start AI pipeline')
    })
  }, [pendingAiImage, pipeline, categories])

  const handleCreateCategory = useCallback(async (name: string): Promise<string | null> => {
    const created = await createCategory(name)
    return created?.id ?? null
  }, [createCategory])

  const handleClearPendingPhoto = useCallback(() => {
    setPendingAiImage(null)
  }, [])

  const checkBarcodeExists = useCallback(async (value: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `/api/businesses/${businessId}/products?barcode=${encodeURIComponent(value)}`
      )
      const data = await response.json()
      if (!response.ok || !data.success) return null
      const matched: Product[] = data.products || []
      return matched.length > 0 ? matched[0].name : null
    } catch {
      return null
    }
  }, [businessId])


  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-4">
        {/* Section Tabs */}
        <div className="section-tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('products')
              setError('')
              router.replace(urlForTab('products'), { scroll: false })
            }}
            className={`section-tab ${activeTab === 'products' ? 'section-tab-active' : ''}`}
          >
            {t('tab_products')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('orders')
              setError('')
              router.replace(urlForTab('orders'), { scroll: false })
            }}
            className={`section-tab ${activeTab === 'orders' ? 'section-tab-active' : ''}`}
          >
            {t('tab_orders')}
          </button>
        </div>

        <TabContainer
          activeTab={activeTab}
          onTabChange={(id) => {
            const tab = id as PageTab
            setActiveTab(tab)
            setError('')
            router.replace(urlForTab(tab), { scroll: false })
          }}
          swipeable
          fitActiveHeight
          preserveScrollOnChange
        >
          <TabContainer.Tab id="products">
            <ProductsTab
              products={products}
              filteredProducts={filteredProducts}
              categories={categories}
              availableFilters={availableFilters}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              isSortSheetOpen={isSortSheetOpen}
              onSortSheetOpenChange={setIsSortSheetOpen}
              onAddProduct={handleOpenAdd}
              onEditProduct={handleOpenEdit}
              onAdjustInventory={handleAdjustInventory}
              onToggleActive={handleToggleActive}
              canModify={canManage}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              error={error}
              isModalOpen={isModalOpen}
              onScanClick={openBarcodeScan}
              scanBusy={barcodeScanBusy}
              scanHiddenInput={barcodeScanInput}
            />
          </TabContainer.Tab>
          <TabContainer.Tab id="orders">
            <OrdersTab
              products={products}
              orders={orders}
              filteredOrders={filteredOrders}
              searchQuery={orderSearchQuery}
              onSearchChange={setOrderSearchQuery}
              sortBy={orderSortBy}
              onSortChange={setOrderSortBy}
              statusFilter={orderStatusFilter}
              onStatusFilterChange={setOrderStatusFilter}
              onNewOrder={() => orderFlows.openNewOrder()}
              onViewOrder={(order) => orderFlows.openOrderDetail(order)}
              error={error || orderFlows.error}
              isModalOpen={orderFlows.isNewOrderOpen}
            />
          </TabContainer.Tab>
        </TabContainer>
      </main>

      {/* Product Modals - shared form context, only one open at a time */}
      <ProductFormProvider defaultCategoryId={settings?.defaultCategoryId}>
        <AddProductModalWrapper
          isOpen={isModalOpen && !editingProduct}
          onClose={handleCloseModal}
          categories={categories}
          pipelineState={pipeline.state}
          isCompressing={compression.state.isProcessing}
          onSubmit={handleSubmitProduct}
          onAbortAiProcessing={() => {
            pipeline.cancel()
            compression.cancel()
          }}
          onPipelineReset={() => {
            pipeline.reset()
            setPendingAiImage(null)
          }}
          onAiPhotoCapture={handleAiPhotoCapture}
          onStartAiPipeline={handleStartAiPipeline}
          onCreateCategory={handleCreateCategory}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onClearPendingPhoto={handleClearPendingPhoto}
          checkBarcodeExists={checkBarcodeExists}
          defaultCategoryId={settings?.defaultCategoryId}
        />
        <EditProductModalWrapper
          isOpen={isModalOpen && !!editingProduct}
          onClose={handleCloseModal}
          onExitCleanup={() => setEditingProduct(null)}
          categories={categories}
          editingProduct={editingProduct}
          onSubmit={handleSubmitProduct}
          onDelete={handleDeleteProduct}
          onSaveAdjustment={handleSaveAdjustment}
          canDelete={canDelete}
          defaultCategoryId={settings?.defaultCategoryId}
          initialStep={editInitialStep}
        />
      </ProductFormProvider>

      {/* Product Settings Modal */}
      <ProductSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        categories={categories}
        isCreatingCategory={isCreatingCategory}
        isUpdatingCategory={isUpdatingCategory}
        isDeletingCategory={isDeletingCategory}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={async (id: string) => {
          const success = await deleteCategory(id)
          if (success) {
            setProducts(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: null } : p))
          }
          return success
        }}
        onReorderCategories={reorderCategories}
        defaultCategoryId={settings?.defaultCategoryId || null}
        sortPreference={settings?.sortPreference || 'name_asc'}
        isSavingSettings={isSavingSettings}
        onUpdateSettings={updateSettings}
        error={settingsError}
        onClearError={clearSettingsError}
      />

      {/* New Order + Order Detail modals (encapsulated in useOrderFlows) */}
      {orderFlows.modals}
    </>
  )
}
