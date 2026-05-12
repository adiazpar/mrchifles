import type { PaymentMethod } from './sale'

export interface DailyRevenueEntry {
  /** Calendar date in 'YYYY-MM-DD' format, UTC. */
  date: string
  total: number
}

export interface TopProductEntry {
  /** Nullable: the FK is set to NULL when the underlying product is
   *  deleted (sale_items.product_id has onDelete: 'set null'). The
   *  productName snapshot survives. UI consumers fall back to the
   *  Package placeholder icon when productId is null. */
  productId: string | null
  productName: string
  quantity: number
  revenue: number
}

export interface PaymentSplit {
  cash: number
  card: number
  other: number
}

export interface HourlyEntry {
  /** 0-23, UTC hour-of-day. */
  hour: number
  total: number
}

export interface SalesAggregateResponse {
  /** Last 7 days, oldest → newest, always 7 entries (zero-padded). */
  dailyRevenue: DailyRevenueEntry[]
  /**
   * Total revenue across the previous 7-day window, i.e. UTC range
   * `[today - 13 days, today - 7 days]` inclusive. Used by the Home
   * "This week" trend card to render a vs-last-week delta. Always a
   * non-nullable scalar; 0 when there were no sales in the window.
   */
  previousWeekRevenue: number
  /** Last 30 days, top 10 by revenue. May be empty. */
  topProducts: TopProductEntry[]
  /** Last 7 days, totals per payment method. */
  paymentSplit: PaymentSplit
  /** Last 7 days, aggregated by hour-of-day. Always 24 entries. */
  hourly: HourlyEntry[]
}

// Re-export PaymentMethod so consumers don't need a separate import.
export type { PaymentMethod }
