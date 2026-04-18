// ============================================
// USER TYPES
// ============================================

export type UserRole = 'owner' | 'partner' | 'employee'
export type MembershipStatus = 'active' | 'pending' | 'disabled'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string | null
  language: string
}

// ============================================
// INVITE CODE TYPES
// ============================================

export type InviteRole = 'partner' | 'employee'

export interface InviteCode {
  id: string
  code: string // 6 uppercase alphanumeric chars
  role: InviteRole
  createdBy: string
  usedBy?: string
  expiresAt: Date | string
  expand?: {
    createdBy?: User
    usedBy?: User
  }
}

// ============================================
// PRODUCT CATEGORY TYPES
// ============================================

/** Custom product category */
export interface ProductCategory {
  id: string
  businessId: string
  name: string
  sortOrder: number
}

// ============================================
// PRODUCT SETTINGS TYPES
// ============================================

export type SortPreference = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'category' | 'stock_asc' | 'stock_desc'

export interface ProductSettings {
  defaultCategoryId?: string | null
  sortPreference: SortPreference
}

// ============================================
// PRODUCT TYPES
// ============================================

export type BarcodeFormat =
  | 'CODABAR'
  | 'CODE_39'
  | 'CODE_93'
  | 'CODE_128'
  | 'ITF'
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'UPC_E'
  | 'UPC_EAN_EXTENSION'

export type BarcodeSource = 'scanned' | 'generated' | 'manual'

export interface Product {
  id: string
  businessId: string
  name: string
  price: number
  costPrice?: number | null
  active: boolean
  categoryId?: string | null
  productCategory?: ProductCategory | null
  icon?: string | null
  barcode?: string | null
  barcodeFormat?: BarcodeFormat | null
  barcodeSource?: BarcodeSource | null
  stock?: number | null
  lowStockThreshold?: number | null
}

// ============================================
// PROVIDER TYPES
// ============================================

export interface Provider {
  id: string
  businessId: string
  name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
  active: boolean
  createdAt?: Date | string | null
}

// ============================================
// ORDER TYPES (purchases from suppliers)
// ============================================

export type OrderStatus = 'pending' | 'received'

export interface Order {
  id: string
  businessId: string
  providerId?: string | null
  // User who created the order. Nullable for legacy rows.
  createdByUserId?: string | null
  // Human-readable, per-business sequential reference ("#47"). Nullable
  // to tolerate rows that pre-date the backfill.
  orderNumber?: number | null
  date: Date | string
  receivedDate?: Date | string | null
  total: number
  status: OrderStatus
  estimatedArrival?: Date | string | null
  receipt?: string | null
  notes?: string | null
}

export interface OrderItem {
  id: string
  orderId: string
  productId?: string | null
  productName: string
  quantity: number
  unitCost?: number | null
  subtotal?: number | null
  receivedQuantity?: number | null
}

// ============================================
// OWNERSHIP TRANSFER TYPES
// ============================================

export type TransferStatus = 'pending' | 'accepted' | 'completed' | 'expired' | 'cancelled'

export interface OwnershipTransfer {
  id: string
  code: string
  fromUser: string
  toEmail: string
  toUser?: string
  status: TransferStatus
  expiresAt: Date | string
  acceptedAt?: Date | string
  completedAt?: Date | string
  expand?: {
    fromUser?: User
    toUser?: User
  }
}

