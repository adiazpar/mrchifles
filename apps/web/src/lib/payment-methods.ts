import { Banknote, CreditCard, MoreHorizontal, type LucideIcon } from 'lucide-react'
import type { PaymentMethod } from '@kasero/shared/types/sale'

/**
 * Future hook for real payment processing. Today every entry has
 * `processor` undefined — the cart payment step is a recording layer only
 * and the sale is committed via the existing /sales endpoint regardless
 * of method. When a real provider is added (Stripe, etc.) it
 * implements this signature and the modal calls it before commitSale.
 */
export interface ProcessorInput {
  total: number
  currency: string
  saleId: string
}

export interface ProcessorResult {
  externalRef?: string
}

// Each method's i18n label is encoded as the full message id
// (`sales.cart.modal_method_<id>`). Storing the full id lets call sites
// pass method.labelKey straight to formatMessage without a string concat,
// keeping every dispatch inside the typed MessageId union.
export type PaymentMethodLabelKey = `sales.cart.modal_method_${PaymentMethod}`

export interface PaymentMethodEntry {
  id: PaymentMethod              // matches the DB enum: 'cash' | 'card' | 'other'
  labelKey: PaymentMethodLabelKey
  icon: LucideIcon
  colorToken: string             // CSS var: active-state border + icon tint
  subtleBg?: string              // CSS var: active-state bg fill (optional)
  supportsCashTendering: boolean // true only for 'cash' today
  processor?: (input: ProcessorInput) => Promise<ProcessorResult>
}

export const PAYMENT_METHODS: PaymentMethodEntry[] = [
  {
    id: 'cash',
    labelKey: 'sales.cart.modal_method_cash',
    icon: Banknote,
    colorToken: 'var(--color-success)',
    subtleBg: 'var(--color-success-subtle)',
    supportsCashTendering: true,
  },
  {
    id: 'card',
    labelKey: 'sales.cart.modal_method_card',
    icon: CreditCard,
    colorToken: 'var(--color-brand)',
    subtleBg: 'var(--color-brand-subtle)',
    supportsCashTendering: false,
  },
  {
    id: 'other',
    labelKey: 'sales.cart.modal_method_other',
    icon: MoreHorizontal,
    colorToken: 'var(--color-text-secondary)',
    // Page-bg as the active fill — slightly darker than the inactive
    // bg-surface, so it reads as "pressed in" against the modal body.
    // Avoids bg-muted (collides with bg-elevated/surface in light mode).
    subtleBg: 'var(--color-bg-base)',
    supportsCashTendering: false,
  },
]

export function getMethodById(id: PaymentMethod): PaymentMethodEntry {
  const entry = PAYMENT_METHODS.find((m) => m.id === id)
  if (!entry) throw new Error(`Unknown payment method id: ${id}`)
  return entry
}
