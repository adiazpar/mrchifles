// ============================================
// USER TYPES
// ============================================

export type UserRole = 'owner' | 'partner' | 'employee'
export type UserStatus = 'active' | 'pending' | 'disabled'

export interface User {
  id: string
  email: string // Formatted phone as email (51987654321@phone.local) for PocketBase auth
  phoneNumber: string // E.164 format (+51987654321) for WhatsApp/display
  phoneVerified: boolean // Whether phone was verified via OTP
  name: string
  role: UserRole
  status: UserStatus
  pin?: string // Stored as SHA-256 hash for PIN verification
  invitedBy?: string // Relation ID to user who invited them
  avatar?: string // Optional avatar file
  created: string
  updated: string
  // Expanded relations
  expand?: {
    invitedBy?: User
  }
}

// ============================================
// OTP TYPES
// ============================================

export type OTPPurpose = 'registration' | 'login' | 'reset'

export interface OTPCode {
  id: string
  phoneNumber: string // E.164 format
  code: string // 6-digit code
  expiresAt: string // ISO date string
  used: boolean
  purpose: OTPPurpose
  created: string
}

// ============================================
// INVITE CODE TYPES
// ============================================

export type InviteRole = 'partner' | 'employee'

export interface InviteCode {
  id: string
  code: string // 6 uppercase alphanumeric chars
  role: InviteRole
  createdBy: string // Relation ID to owner
  usedBy?: string // Relation ID to user who used it
  expiresAt: string // ISO date string
  used: boolean
  created: string
  // Expanded relations
  expand?: {
    createdBy?: User
    usedBy?: User
  }
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
// OWNERSHIP TRANSFER TYPES
// ============================================

export type TransferStatus = 'pending' | 'accepted' | 'completed' | 'expired' | 'cancelled'

export interface OwnershipTransfer {
  id: string
  code: string // 8-char uppercase code
  fromUser: string // Relation ID to current owner
  toPhone: string // E.164 format
  toUser?: string // Relation ID to recipient (set when accepted)
  status: TransferStatus
  expiresAt: string // ISO date string
  acceptedAt?: string // ISO date string
  completedAt?: string // ISO date string
  created: string
  updated: string
  // Expanded relations
  expand?: {
    fromUser?: User
    toUser?: User
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
