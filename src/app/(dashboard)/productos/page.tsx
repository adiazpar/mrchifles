'use client'

import { useState, useCallback } from 'react'
import { PageHeader } from '@/components/layout'
import { Button, Card, Input, Modal, Badge, EmptyState, useToast } from '@/components/ui'
import { IconPlus, IconEdit, IconTrash, IconProducts, IconSearch } from '@/components/icons'
import { formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  name: string
  price: number
  costPrice?: number
  active: boolean
}

// Mock products for demo
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Chifles Natural', price: 5.0, costPrice: 2.5, active: true },
  { id: '2', name: 'Chifles con Sal', price: 5.0, costPrice: 2.5, active: true },
  { id: '3', name: 'Chifles Tocino', price: 6.0, costPrice: 3.0, active: true },
  { id: '4', name: 'Chifles Picante', price: 6.0, costPrice: 3.0, active: true },
  { id: '5', name: 'Chifles Ajo', price: 6.0, costPrice: 3.0, active: true },
  { id: '6', name: 'Chifles BBQ', price: 6.5, costPrice: 3.2, active: true },
  { id: '7', name: 'Chifles Mix', price: 8.0, costPrice: 4.0, active: true },
  { id: '8', name: 'Combo Familiar', price: 15.0, costPrice: 7.5, active: true },
]

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    costPrice: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addToast } = useToast()

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openCreateModal = useCallback(() => {
    setEditingProduct(null)
    setFormData({ name: '', price: '', costPrice: '' })
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      costPrice: product.costPrice?.toString() || '',
    })
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setFormData({ name: '', price: '', costPrice: '' })
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!formData.name.trim() || !formData.price) {
        addToast('error', 'Por favor completa todos los campos requeridos')
        return
      }

      setIsSubmitting(true)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      if (editingProduct) {
        // Update existing product
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...p,
                  name: formData.name.trim(),
                  price: parseFloat(formData.price),
                  costPrice: formData.costPrice
                    ? parseFloat(formData.costPrice)
                    : undefined,
                }
              : p
          )
        )
        addToast('success', 'Producto actualizado')
      } else {
        // Create new product
        const newProduct: Product = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name.trim(),
          price: parseFloat(formData.price),
          costPrice: formData.costPrice
            ? parseFloat(formData.costPrice)
            : undefined,
          active: true,
        }
        setProducts((prev) => [...prev, newProduct])
        addToast('success', 'Producto creado')
      }

      setIsSubmitting(false)
      closeModal()
    },
    [formData, editingProduct, addToast, closeModal]
  )

  const toggleProductActive = useCallback(
    async (productId: string) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, active: !p.active } : p
        )
      )
      addToast('success', 'Estado del producto actualizado')
    },
    [addToast]
  )

  const deleteProduct = useCallback(
    async (productId: string) => {
      if (!confirm('Esta seguro de eliminar este producto?')) return

      setProducts((prev) => prev.filter((p) => p.id !== productId))
      addToast('success', 'Producto eliminado')
    },
    [addToast]
  )

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle={`${products.length} productos`}
        actions={
          <Button onClick={openCreateModal}>
            <IconPlus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Producto</span>
          </Button>
        }
      />

      <div className="main-content">
        {/* Search */}
        <div className="mb-6 relative">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-12"
          />
        </div>

        {/* Products list */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={<IconProducts className="w-full h-full" />}
            title={searchQuery ? 'Sin resultados' : 'Sin productos'}
            description={
              searchQuery
                ? 'No se encontraron productos con ese nombre'
                : 'Agrega tu primer producto para comenzar'
            }
            action={
              !searchQuery && (
                <Button onClick={openCreateModal}>
                  <IconPlus className="w-5 h-5" />
                  Crear Producto
                </Button>
              )
            }
          />
        ) : (
          <Card variant="bordered">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Precio</th>
                    <th className="hidden sm:table-cell text-right">Costo</th>
                    <th className="hidden sm:table-cell text-center">Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{product.name}</span>
                          <span className="sm:hidden">
                            <Badge
                              variant={product.active ? 'success' : 'default'}
                            >
                              {product.active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </span>
                        </div>
                      </td>
                      <td className="text-right font-medium">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="hidden sm:table-cell text-right text-text-secondary">
                        {product.costPrice
                          ? formatCurrency(product.costPrice)
                          : '-'}
                      </td>
                      <td className="hidden sm:table-cell text-center">
                        <Badge
                          variant={product.active ? 'success' : 'default'}
                        >
                          {product.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon
                            onClick={() => toggleProductActive(product.id)}
                            aria-label={
                              product.active ? 'Desactivar' : 'Activar'
                            }
                          >
                            <span className="text-xs">
                              {product.active ? 'Off' : 'On'}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon
                            onClick={() => openEditModal(product)}
                            aria-label="Editar"
                          >
                            <IconEdit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon
                            onClick={() => deleteProduct(product.id)}
                            aria-label="Eliminar"
                          >
                            <IconTrash className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="product-form"
              loading={isSubmitting}
            >
              {editingProduct ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Nombre del producto"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ej: Chifles Tocino"
              required
            />
            <Input
              label="Precio de venta"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, price: e.target.value }))
              }
              placeholder="0.00"
              required
            />
            <Input
              label="Costo (opcional)"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, costPrice: e.target.value }))
              }
              placeholder="0.00"
              helper="El costo ayuda a calcular las ganancias"
            />
          </div>
        </form>
      </Modal>
    </>
  )
}
