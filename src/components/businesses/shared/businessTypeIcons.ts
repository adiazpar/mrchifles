import { ChefHat, HandHelping, Store, Boxes, Factory, Shapes } from 'lucide-react'
import type { ComponentType } from 'react'

export const BUSINESS_TYPE_ICONS: Partial<Record<string, ComponentType<{ className?: string }>>> = {
  food: ChefHat,
  retail: Store,
  services: HandHelping,
  wholesale: Boxes,
  manufacturing: Factory,
  other: Shapes,
}

export const BUSINESS_TYPE_FALLBACK_EMOJIS: Record<string, string> = {
  food: '🍽️',
  retail: '🛍️',
  services: '✂️',
  wholesale: '📦',
  manufacturing: '🏭',
  other: '💼',
}
