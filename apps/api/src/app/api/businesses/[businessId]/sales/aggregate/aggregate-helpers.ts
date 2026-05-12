import { roundToCurrencyDecimals } from '@kasero/shared/sales-helpers'
import type { PaymentMethod } from '@kasero/shared/types/sale'

interface DailyRow {
  day: string  // 'YYYY-MM-DD'
  total: number
}

interface HourlyRow {
  hour: number
  total: number
}

interface PaymentSplitRow {
  paymentMethod: PaymentMethod
  total: number
}

interface DailyRevenueEntry {
  date: string  // 'YYYY-MM-DD'
  total: number
}

interface HourlyEntry {
  hour: number
  total: number
}

interface PaymentSplit {
  cash: number
  card: number
  other: number
}

/**
 * Zero-pad a daily-revenue query result to a stable 7-entry array,
 * one entry per day in the inclusive `[since, today]` UTC window. Each
 * total is rounded to the currency's decimals. Days with no sales get
 * `total: 0`.
 */
export function padDailyRevenue(
  rows: DailyRow[],
  since: Date,
  today: Date,
  currency: string,
): DailyRevenueEntry[] {
  const byDay = new Map(rows.map((r) => [r.day, r.total]))
  const out: DailyRevenueEntry[] = []
  const cursor = new Date(since)
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10) // YYYY-MM-DD
    const total = byDay.get(key) ?? 0
    out.push({ date: key, total: roundToCurrencyDecimals(total, currency) })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

/**
 * Zero-pad an hourly-aggregation result to a stable 24-entry array
 * (hours 0-23). Missing hours get `total: 0`. All totals rounded.
 */
export function padHourly(rows: HourlyRow[], currency: string): HourlyEntry[] {
  const byHour = new Map(rows.map((r) => [r.hour, r.total]))
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    total: roundToCurrencyDecimals(byHour.get(hour) ?? 0, currency),
  }))
}

/**
 * Pivot a payment-split query into a fixed-shape `{cash, card, other}`
 * object. Missing methods default to 0. All totals rounded.
 */
export function pivotPaymentSplit(
  rows: PaymentSplitRow[],
  currency: string,
): PaymentSplit {
  const out: PaymentSplit = { cash: 0, card: 0, other: 0 }
  for (const r of rows) {
    out[r.paymentMethod] = roundToCurrencyDecimals(r.total, currency)
  }
  return out
}

/**
 * Normalize the previous-week revenue scalar: coerce a missing /
 * SQL-NULL aggregate to 0 and round to the business currency's
 * decimals. The window is `[today − 13d, today − 7d]` UTC; values that
 * come back as `null` (no sales in the window) become `0` so the Home
 * trend card can render an unambiguous "no comparison" baseline.
 */
export function normalizePreviousWeekRevenue(
  total: number | null | undefined,
  currency: string,
): number {
  return roundToCurrencyDecimals(total ?? 0, currency)
}
