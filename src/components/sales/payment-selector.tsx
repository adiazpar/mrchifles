'use client'

import { IconCash, IconYape, IconPlin } from '@/components/icons'

export type PaymentMethod = 'cash' | 'yape' | 'plin'

export interface PaymentSelectorProps {
  selected: PaymentMethod | null
  onSelect: (method: PaymentMethod) => void
}

const paymentMethods: {
  id: PaymentMethod
  label: string
  icon: typeof IconCash
  className: string
}[] = [
  { id: 'cash', label: 'Efectivo', icon: IconCash, className: 'bg-cash' },
  { id: 'yape', label: 'Yape', icon: IconYape, className: 'bg-yape' },
  { id: 'plin', label: 'Plin', icon: IconPlin, className: 'bg-plin' },
]

export function PaymentSelector({ selected, onSelect }: PaymentSelectorProps) {
  return (
    <div className="payment-selector">
      {paymentMethods.map((method) => {
        const Icon = method.icon
        const isSelected = selected === method.id

        return (
          <button
            key={method.id}
            type="button"
            className={`payment-btn ${method.className} ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(method.id)}
            aria-pressed={isSelected}
          >
            <Icon className="w-5 h-5" />
            <span>{method.label}</span>
          </button>
        )
      })}
    </div>
  )
}
