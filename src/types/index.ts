// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string
  email: string
  name: string
  created: string
  updated: string
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string
  name: string
  price: number // Selling price per unit
  costPrice?: number // Estimated cost per unit (optional)
  active: boolean
  created: string
  updated: string
}

// ============================================
// SALE TYPES
// ============================================

export type PaymentMethod = 'cash' | 'yape' | 'pos'
export type SalesChannel = 'feria' | 'whatsapp'

export interface Sale {
  id: string
  date: string
  total: number
  paymentMethod: PaymentMethod
  channel: SalesChannel
  employee: string // Relation ID to users
  notes?: string
  created: string
  // Expanded relations
  expand?: {
    'sale_items(sale)'?: SaleItem[]
    employee?: User
  }
}

export interface SaleItem {
  id: string
  sale: string // Relation ID
  product: string // Relation ID
  quantity: number
  unitPrice: number // Price charged (after any promo)
  subtotal: number
  created: string
  // Expanded relations
  expand?: {
    sale?: Sale
    product?: Product
  }
}

// ============================================
// ORDER TYPES (purchases from DaSol)
// ============================================

export type OrderStatus = 'pending' | 'received'

export interface Order {
  id: string
  date: string
  receivedDate?: string
  total: number // Total paid to DaSol
  status: OrderStatus
  notes?: string
  created: string
  updated: string
  // Expanded relations
  expand?: {
    'order_items(order)'?: OrderItem[]
  }
}

export interface OrderItem {
  id: string
  order: string // Relation ID
  product: string // Relation ID
  quantity: number // Units ordered
  created: string
  // Expanded relations
  expand?: {
    order?: Order
    product?: Product
  }
}

// ============================================
// CART TYPES (for UI state, not stored in DB)
// ============================================

export interface CartItem {
  product: Product
  quantity: number
  unitPrice: number // May differ from product.price if promo applied
  subtotal: number
}

export interface Cart {
  items: CartItem[]
  total: number
}
