'use client'

import { ProductCard } from './product-card'
import { EmptyState } from '@/components/ui'
import { IconProducts } from '@/components/icons'

export interface Product {
  id: string
  name: string
  price: number
}

export interface CartItem {
  productId: string
  quantity: number
}

export interface ProductGridProps {
  products: Product[]
  cart: CartItem[]
  onSelectProduct: (productId: string) => void
  loading?: boolean
}

export function ProductGrid({
  products,
  cart,
  onSelectProduct,
  loading = false,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="product-grid">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="product-card animate-pulse bg-bg-sunken"
          >
            <div className="w-3/4 h-4 bg-border rounded" />
            <div className="w-1/2 h-6 bg-border rounded mt-2" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<IconProducts className="w-full h-full" />}
        title="Sin productos"
        description="Agrega productos desde la seccion de Productos para comenzar a vender."
      />
    )
  }

  const getQuantity = (productId: string) => {
    const item = cart.find((item) => item.productId === productId)
    return item?.quantity || 0
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          price={product.price}
          quantity={getQuantity(product.id)}
          onSelect={onSelectProduct}
        />
      ))}
    </div>
  )
}
