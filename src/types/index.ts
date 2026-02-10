// User types
export type UserRole = 'owner' | 'partner' | 'employee'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  created: string
  updated: string
}

// Product types
export interface Product {
  id: string
  name: string
  description?: string
  flavor?: string
  salePrice: number
  costPrice?: number
  active: boolean
  image?: string
  created: string
  updated: string
}

// Sale types
export type PaymentMethod = 'cash' | 'yape' | 'plin' | 'mixed'

export interface Sale {
  id: string
  saleNumber: number
  date: string
  total: number
  paymentMethod: PaymentMethod
  user: string
  cashDrawer?: string
  notes?: string
  created: string
}

export interface SaleItem {
  id: string
  sale: string
  product: string
  quantity: number
  unitPrice: number
  subtotal: number
}

// Cash drawer types
export type DrawerStatus = 'open' | 'closed'

export interface CashDrawer {
  id: string
  date: string
  openingBalance: number
  closingBalance?: number
  expectedCash?: number
  discrepancy?: number
  notes?: string
  status: DrawerStatus
  created: string
  updated: string
}

export type CashTransactionType = 'cash_in' | 'cash_out'

export interface CashTransaction {
  id: string
  cashDrawer: string
  type: CashTransactionType
  amount: number
  description: string
  created: string
}

// Expense types (Phase 2)
export type ExpenseCategory =
  | 'ingredients'
  | 'packaging'
  | 'transport'
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'other'

export interface Expense {
  id: string
  date: string
  amount: number
  category: ExpenseCategory
  description: string
  paymentMethod: PaymentMethod
  created: string
}

// Inventory types (Phase 2)
export interface Inventory {
  id: string
  product: string
  currentStock: number
  minStock: number
  updated: string
}
