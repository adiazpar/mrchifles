'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Card, Spinner } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { IconAdd, IconClose, IconTrash, IconImage, IconProducts } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { getProductImageUrl } from '@/lib/products'
import type { Product, ProductCategory } from '@/types'

// Category display names and order
const CATEGORY_CONFIG: Record<ProductCategory, { label: string; order: number }> = {
  chifles: { label: 'Chifles', order: 1 },
  miel: { label: 'Miel de Abeja', order: 2 },
  algarrobina: { label: 'Algarrobina', order: 3 },
  postres: { label: 'Postres', order: 4 },
}

// Group products by category
function groupByCategory(products: Product[]): Map<ProductCategory | 'sin_categoria', Product[]> {
  const groups = new Map<ProductCategory | 'sin_categoria', Product[]>()

  for (const product of products) {
    const category = product.category || 'sin_categoria'
    if (!groups.has(category)) {
      groups.set(category, [])
    }
    groups.get(category)!.push(product)
  }

  return groups
}

// Get sorted category keys
function getSortedCategories(groups: Map<ProductCategory | 'sin_categoria', Product[]>): (ProductCategory | 'sin_categoria')[] {
  const keys = Array.from(groups.keys())
  return keys.sort((a, b) => {
    const orderA = a === 'sin_categoria' ? 999 : CATEGORY_CONFIG[a]?.order ?? 999
    const orderB = b === 'sin_categoria' ? 999 : CATEGORY_CONFIG[b]?.order ?? 999
    return orderA - orderB
  })
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
  const [costPrice, setCostPrice] = useState('')
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

  const resetForm = useCallback(() => {
    setName('')
    setPrice('')
    setCostPrice('')
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
    setCostPrice(product.costPrice?.toString() || '')
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
    // Note: HEIC may show as empty string or application/octet-stream on some browsers
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

    const costPriceNum = costPrice ? parseFloat(costPrice) : undefined
    if (costPrice && (isNaN(costPriceNum!) || costPriceNum! < 0)) {
      setError('Ingresa un costo valido')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('price', priceNum.toString())
      if (costPriceNum !== undefined) {
        formData.append('costPrice', costPriceNum.toString())
      }
      formData.append('active', active.toString())

      if (imageFile) {
        formData.append('image', imageFile)
      } else if (removeImage && editingProduct?.image) {
        // To remove an image in PocketBase, pass an empty string
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
  }, [name, price, costPrice, active, imageFile, removeImage, editingProduct, pb, handleCloseModal])

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
        <PageHeader title="Productos" subtitle="Catalogo de productos" />
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
        subtitle="Catalogo de productos"
      />

      <main className="main-content">
        {error && !isModalOpen && (
          <div className="p-4 mb-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}

        {products.length === 0 ? (
          <Card padding="lg">
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
          </Card>
        ) : (
          <div className="product-categories">
            {(() => {
              const groups = groupByCategory(products)
              const sortedCategories = getSortedCategories(groups)

              return sortedCategories.map(category => {
                const categoryProducts = groups.get(category) || []
                const categoryLabel = category === 'sin_categoria'
                  ? 'Sin Categoria'
                  : CATEGORY_CONFIG[category]?.label || category

                return (
                  <section key={category} className="product-category-section">
                    <h2 className="product-category-title">{categoryLabel}</h2>
                    <div className="product-grid">
                      {categoryProducts.map(product => {
                        const imageUrl = getProductImageUrl(product, '200x200')
                        const isInactive = !product.active
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            className={`product-card ${isInactive ? 'product-card--inactive' : ''}`}
                          >
                            {/* Product image */}
                            <div className="product-card-image">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={product.name}
                                  width={200}
                                  height={200}
                                  unoptimized
                                />
                              ) : (
                                <div className="product-card-image-placeholder">
                                  <IconImage className="w-10 h-10" />
                                </div>
                              )}
                              {isInactive && (
                                <span className="product-card-badge product-card-badge--inactive">
                                  Inactivo
                                </span>
                              )}
                            </div>

                            {/* Product info */}
                            <div className="product-card-info">
                              <span className="product-card-name">
                                {product.name}
                              </span>
                              <span className="product-card-price">
                                <span className="product-card-price-currency">S/ </span>
                                {product.price.toFixed(2)}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })
            })()}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="fab"
          aria-label="Agregar producto"
        >
          <IconAdd className="w-6 h-6" />
        </button>
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
              placeholder="Ej: Chifles Grande"
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

          {/* Cost price */}
          <div>
            <label htmlFor="costPrice" className="label">Costo (S/) <span className="text-text-tertiary font-normal">(opcional)</span></label>
            <input
              id="costPrice"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={e => setCostPrice(e.target.value)}
              className="input"
              placeholder="0.00"
            />
            <p className="helper-text">Para calcular la ganancia</p>
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
