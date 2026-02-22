'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import { Spinner } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { IconAdd, IconClose, IconTrash, IconImage, IconProducts, IconSearch } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { getProductImageUrl } from '@/lib/products'
import type { Product, ProductCategory } from '@/types'

// Category configuration
const CATEGORY_CONFIG: Record<ProductCategory, { label: string; size?: string; order: number }> = {
  chifles_grande: { label: 'Chifles Grande', size: '250g', order: 1 },
  chifles_chico: { label: 'Chifles Chico', size: '160g', order: 2 },
  miel: { label: 'Miel de Abeja', order: 3 },
  algarrobina: { label: 'Algarrobina', order: 4 },
  postres: { label: 'Postres', order: 5 },
}

// Filter tab configuration (combines chifles into one)
type FilterCategory = 'all' | 'chifles' | 'miel' | 'algarrobina' | 'postres'

const FILTER_CONFIG: Record<Exclude<FilterCategory, 'all'>, { label: string; categories: ProductCategory[] }> = {
  chifles: { label: 'Chifles', categories: ['chifles_grande', 'chifles_chico'] },
  miel: { label: 'Miel', categories: ['miel'] },
  algarrobina: { label: 'Algarrobina', categories: ['algarrobina'] },
  postres: { label: 'Postres', categories: ['postres'] },
}

// Modal component
function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Delete confirmation modal
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  isDeleting
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  productName: string
  isDeleting: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Eliminar producto</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Estas seguro que deseas eliminar <strong>{productName}</strong>? Esta accion no se puede deshacer.
          </p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1 }}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-danger"
            style={{ flex: 1 }}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner /> : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductosPage() {
  const { user, pb } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete modal state
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [active, setActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Permission check
  const canDelete = user?.role === 'owner' || user?.role === 'partner'

  // Load products
  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      try {
        const records = await pb.collection('products').getFullList<Product>({
          sort: 'name',
          requestKey: null,
        })
        if (cancelled) return
        setProducts(records)
      } catch (err) {
        if (cancelled) return
        console.error('Error loading products:', err)
        setError('Error al cargar los productos')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [pb])

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let result = products

    // Filter by category
    if (selectedFilter !== 'all') {
      const allowedCategories = FILTER_CONFIG[selectedFilter].categories
      result = result.filter(p => p.category && allowedCategories.includes(p.category))
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query)
      )
    }

    // Sort: active first, then by name
    return result.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [products, selectedFilter, searchQuery])

  // Get available filters based on products
  const availableFilters = useMemo(() => {
    const productCategories = new Set<ProductCategory>()
    products.forEach(p => {
      if (p.category) productCategories.add(p.category)
    })

    // Check which filters have at least one product
    const filters: Exclude<FilterCategory, 'all'>[] = []
    for (const [filter, config] of Object.entries(FILTER_CONFIG) as [Exclude<FilterCategory, 'all'>, typeof FILTER_CONFIG[keyof typeof FILTER_CONFIG]][]) {
      if (config.categories.some(cat => productCategories.has(cat))) {
        filters.push(filter)
      }
    }
    return filters
  }, [products])

  const resetForm = useCallback(() => {
    setName('')
    setPrice('')
    setCategory('')
    setActive(true)
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(false)
    setEditingProduct(null)
    setError('')
  }, [])

  const handleOpenAdd = useCallback(() => {
    resetForm()
    setIsModalOpen(true)
  }, [resetForm])

  const handleOpenEdit = useCallback((product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setPrice(product.price.toString())
    setCategory(product.category || '')
    setActive(product.active)
    setImageFile(null)
    setRemoveImage(false)
    // Set existing image preview
    const existingImageUrl = getProductImageUrl(product, '200x200')
    setImagePreview(existingImageUrl)
    setError('')
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    resetForm()
  }, [resetForm])

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5242880) {
      setError('La imagen debe ser menor a 5MB')
      return
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const isHeicFile = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
    if (!validTypes.includes(file.type) && !isHeicFile) {
      setError('Solo se permiten imagenes JPG, PNG, WebP o HEIC')
      return
    }

    setError('')
    setImageFile(file)
    setRemoveImage(false)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRemoveImage = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Ingresa un precio valido')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('price', priceNum.toString())
      if (category) {
        formData.append('category', category)
      }
      formData.append('active', active.toString())

      if (imageFile) {
        formData.append('image', imageFile)
      } else if (removeImage && editingProduct?.image) {
        formData.append('image', '')
      }

      let record: Product
      if (editingProduct) {
        record = await pb.collection('products').update<Product>(editingProduct.id, formData)
        setProducts(prev => prev.map(p => p.id === record.id ? record : p))
      } else {
        record = await pb.collection('products').create<Product>(formData)
        setProducts(prev => [...prev, record].sort((a, b) => a.name.localeCompare(b.name)))
      }

      handleCloseModal()
    } catch (err) {
      console.error('Error saving product:', err)
      setError('Error al guardar el producto')
    } finally {
      setIsSaving(false)
    }
  }, [name, price, category, active, imageFile, removeImage, editingProduct, pb, handleCloseModal])

  const handleDelete = useCallback(async () => {
    if (!deleteProduct) return

    setIsDeleting(true)

    try {
      await pb.collection('products').delete(deleteProduct.id)
      setProducts(prev => prev.filter(p => p.id !== deleteProduct.id))
      setDeleteProduct(null)
    } catch (err) {
      console.error('Error deleting product:', err)
      setError('Error al eliminar el producto')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteProduct, pb])

  if (isLoading) {
    return (
      <>
        <PageHeader title="Productos" subtitle="Gestiona tu catalogo" />
        <main className="main-content">
          <div className="flex justify-center py-12">
            <Spinner className="spinner-lg" />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Gestiona tu catalogo"
      />

      <main className="main-content space-y-4">
        {error && !isModalOpen && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="search-bar">
          <IconSearch className="search-bar-icon" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-bar-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="search-bar-clear"
              aria-label="Limpiar busqueda"
            >
              <IconClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        {availableFilters.length > 0 && (
          <div className="filter-tabs">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`filter-tab ${selectedFilter === 'all' ? 'filter-tab-active' : ''}`}
            >
              Todos
            </button>
            {availableFilters.map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`filter-tab ${selectedFilter === filter ? 'filter-tab-active' : ''}`}
              >
                {FILTER_CONFIG[filter].label}
              </button>
            ))}
          </div>
        )}

        {/* Product List Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
          </span>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn btn-primary btn-sm"
          >
            <IconAdd className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {/* Product List */}
        {products.length === 0 ? (
            <div className="empty-state">
              <IconProducts className="empty-state-icon" />
              <h3 className="empty-state-title">No hay productos</h3>
              <p className="empty-state-description">
                Agrega tu primer producto para comenzar
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="btn btn-primary mt-4"
              >
                Agregar producto
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <IconSearch className="empty-state-icon" />
              <h3 className="empty-state-title">Sin resultados</h3>
              <p className="empty-state-description">
                No se encontraron productos con ese criterio
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map(product => {
                const imageUrl = getProductImageUrl(product, '100x100')
                const categoryConfig = product.category ? CATEGORY_CONFIG[product.category] : null

                return (
                  <div
                    key={product.id}
                    className="list-item-clickable"
                    onClick={() => handleOpenEdit(product)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleOpenEdit(product)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    {/* Product Image/Icon */}
                    <div className="product-list-image">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="product-list-image-img"
                          unoptimized
                        />
                      ) : (
                        <IconImage className="w-5 h-5 text-text-tertiary" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${!product.active ? 'text-text-tertiary' : ''}`}>
                          {product.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {categoryConfig && (
                          <>
                            <span className="text-xs text-text-tertiary">
                              {categoryConfig.label}
                              {categoryConfig.size && ` (${categoryConfig.size})`}
                            </span>
                            <span className="text-text-muted">·</span>
                          </>
                        )}
                        <span className={`text-xs ${product.active ? 'text-success' : 'text-text-tertiary'}`}>
                          {product.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <span className={`font-display font-bold ${!product.active ? 'text-text-tertiary' : 'text-text-primary'}`}>
                        S/ {product.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Chevron */}
                    <div className="text-text-tertiary ml-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
      </main>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Editar producto' : 'Agregar producto'}
        footer={
          <>
            {editingProduct && canDelete && (
              <button
                type="button"
                onClick={() => {
                  setDeleteProduct(editingProduct)
                }}
                className="modal-action-delete"
                title="Eliminar producto"
              >
                <IconTrash className="w-5 h-5" />
              </button>
            )}
            <div className="modal-actions">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="product-form"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? <Spinner /> : 'Guardar'}
              </button>
            </div>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className="label">Imagen</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={handleImageChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="image-preview">
                <Image
                  src={imagePreview}
                  alt="Vista previa"
                  width={120}
                  height={120}
                  className="image-preview-img"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="image-preview-remove"
                  title="Eliminar imagen"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="image-upload-zone"
              >
                <IconImage className="w-8 h-8 text-text-tertiary mb-2" />
                <span className="text-sm text-text-secondary">
                  Toca para agregar imagen
                </span>
                <span className="text-xs text-text-tertiary mt-1">
                  JPG, PNG, WebP o HEIC (max 5MB)
                </span>
              </button>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="label">Nombre</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Ej: Tocino"
              autoComplete="off"
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="label">Precio (S/)</label>
            <input
              id="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="input"
              placeholder="0.00"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="label">Categoria</label>
            <select
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value as ProductCategory | '')}
              className="input"
            >
              <option value="">Seleccionar categoria</option>
              {Object.entries(CATEGORY_CONFIG)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}{config.size ? ` (${config.size})` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="label mb-0">Activo</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                Mostrar en la lista de ventas
              </p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="toggle"
            />
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={deleteProduct !== null}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        productName={deleteProduct?.name || ''}
        isDeleting={isDeleting}
      />
    </>
  )
}
