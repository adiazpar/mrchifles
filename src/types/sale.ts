export type PaymentMethod = 'cash' | 'card' | 'other'

export interface SaleItem {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number  // computed: quantity * unitPrice
}

export interface Sale {
  id: string
  saleNumber: number
  date: string         // ISO timestamp
  total: number
  paymentMethod: PaymentMethod
  notes: string | null
  items: SaleItem[]
  createdByUserId: string
  createdAt: string    // ISO timestamp
}

export interface SalesStats {
  todayRevenue: number
  todayCount: number
  todayAvgTicket: number | null
  yesterdayRevenue: number
  vsYesterdayPct: number | null  // percentage value, e.g. 12.5 means +12.5%
}
