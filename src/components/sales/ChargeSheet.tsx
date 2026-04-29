'use client'

import type { UseCartResult } from '@/hooks/useCart'

interface ChargeSheetProps {
  isOpen: boolean
  cart: UseCartResult
  businessId: string
  onClose: () => void
}

export function ChargeSheet({ isOpen, onClose }: ChargeSheetProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end" onClick={onClose}>
      <div className="bg-bg-elevated w-full p-4">ChargeSheet stub</div>
    </div>
  )
}
