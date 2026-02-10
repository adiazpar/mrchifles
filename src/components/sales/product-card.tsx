'use client'

import { formatCurrency } from '@/lib/utils'

export interface ProductCardProps {
  id: string
  name: string
  price: number
  quantity?: number
  onSelect: (id: string) => void
}

export function ProductCard({
  id,
  name,
  price,
  quantity = 0,
  onSelect,
}: ProductCardProps) {
  const isSelected = quantity > 0

  return (
    <button
      type="button"
      className={`product-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(id)}
    >
      <span className="product-card-name line-clamp-2">{name}</span>
      <span className="product-card-price">{formatCurrency(price)}</span>
      {isSelected && (
        <span className="badge badge-brand">
          x{quantity}
        </span>
      )}
    </button>
  )
}
