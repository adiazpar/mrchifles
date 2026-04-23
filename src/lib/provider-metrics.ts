import type { Order } from '@/types'
import { getOrderDisplayStatus, type ExpandedOrder } from '@/lib/products'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const RELIABILITY_WINDOW = 6
const RELIABILITY_MIN_RESOLVED = 3
const TYPICAL_ITEMS_LIMIT = 5
const MONTHLY_SPEND_WINDOW = 6

interface ProviderMetrics {
  totalSpent: number
  orderCount: number
  /** Average days between placed orders. Null when fewer than 2 orders. */
  cadenceDays: number | null
  /**
   * Reliability over the last N placed orders. `null` when there are fewer
   * than `RELIABILITY_MIN_RESOLVED` orders in the window that have resolved
   * against their ETA (received or overdue).
   *
   * - `windowSize`  — min(RELIABILITY_WINDOW, orderCount); what "últimas X" reads
   * - `resolved`    — orders in the window with an ETA AND status in {received, overdue}
   * - `onTime`      — of resolved, those received by ETA (same-day counts as on-time)
   * - `percent`     — onTime / resolved, rounded to the nearest whole number
   */
  reliability: {
    percent: number
    onTime: number
    resolved: number
    windowSize: number
  } | null
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

function startOfDay(value: Date | string): number {
  const d = value instanceof Date ? new Date(value) : new Date(value)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function computeProviderMetrics(orders: Order[]): ProviderMetrics {
  const orderCount = orders.length
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0)

  const cadenceDays = computeCadence(orders)
  const reliability = computeReliability(orders)

  return { totalSpent, orderCount, cadenceDays, reliability }
}

function computeCadence(orders: Order[]): number | null {
  if (orders.length < 2) return null
  const times = orders.map(o => toTime(o.date)).sort((a, b) => a - b)
  const spanMs = times[times.length - 1] - times[0]
  const gaps = times.length - 1
  const days = spanMs / gaps / MS_PER_DAY
  return Math.max(1, Math.round(days))
}

function computeReliability(orders: Order[]): ProviderMetrics['reliability'] {
  if (orders.length === 0) return null

  const recent = [...orders]
    .sort((a, b) => toTime(b.date) - toTime(a.date))
    .slice(0, RELIABILITY_WINDOW)
  const windowSize = recent.length

  let resolved = 0
  let onTime = 0
  for (const order of recent) {
    if (!order.estimatedArrival) continue
    const status = getOrderDisplayStatus(order)
    if (status === 'received') {
      resolved += 1
      if (order.receivedDate && startOfDay(order.receivedDate) <= startOfDay(order.estimatedArrival)) {
        onTime += 1
      }
    } else if (status === 'overdue') {
      resolved += 1
    }
  }

  if (resolved < RELIABILITY_MIN_RESOLVED) return null

  const percent = Math.round((onTime / resolved) * 100)
  return { percent, onTime, resolved, windowSize }
}

interface MonthlySpendBucket {
  /** Start of the month (local time, day 1, 00:00). Use this for the label. */
  start: Date
  total: number
  isCurrent: boolean
}

/**
 * Returns {MONTHLY_SPEND_WINDOW} monthly spend buckets ending at the month
 * containing `now` (default: today). Buckets are ordered oldest → newest.
 * Orders are bucketed by placement `date` in local time, so a pending order
 * placed today contributes to the current-month bar immediately. Months
 * with no orders are still included with total 0.
 */
export function computeMonthlySpend(
  orders: Order[],
  now: Date = new Date(),
): MonthlySpendBucket[] {
  const currentStart = startOfMonth(now)
  const buckets: MonthlySpendBucket[] = []
  for (let i = MONTHLY_SPEND_WINDOW - 1; i >= 0; i--) {
    buckets.push({
      start: addMonths(currentStart, -i),
      total: 0,
      isCurrent: i === 0,
    })
  }

  const oldestStartMs = buckets[0].start.getTime()
  for (const order of orders) {
    const orderStartMs = startOfMonth(order.date).getTime()
    if (orderStartMs < oldestStartMs) continue
    const bucket = buckets.find(b => b.start.getTime() === orderStartMs)
    if (bucket) bucket.total += order.total
  }

  return buckets
}

function startOfMonth(value: Date | string): Date {
  const d = value instanceof Date ? new Date(value) : new Date(value)
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1, 0, 0, 0, 0)
}

interface TypicalItem {
  /** Stable key for React — productId when available, else productName. */
  key: string
  name: string
  totalUnits: number
  orderCount: number
  lastOrderedAt: Date
}

/**
 * Aggregates order items across a provider's orders and returns the top
 * products ranked by order count (ties broken by total units). Orders are
 * counted by placement `date`, so pending orders contribute.
 */
export function computeTypicalItems(orders: ExpandedOrder[]): TypicalItem[] {
  interface Agg {
    key: string
    name: string
    totalUnits: number
    orderCount: number
    lastOrderedAtMs: number
  }
  const byKey = new Map<string, Agg>()

  for (const order of orders) {
    const items = order.expand?.['order_items(order)'] || []
    const orderTime = toTime(order.date)
    const seenThisOrder = new Set<string>()
    for (const item of items) {
      const key = item.productId || item.productName
      const entry = byKey.get(key) || {
        key,
        name: item.productName,
        totalUnits: 0,
        orderCount: 0,
        lastOrderedAtMs: 0,
      }
      entry.totalUnits += item.quantity
      // One order contributes one tick to orderCount even if the product
      // appears in multiple line items of that same order (unusual, but
      // possible). lastOrderedAt is the max date the product has shown up.
      if (!seenThisOrder.has(key)) {
        entry.orderCount += 1
        seenThisOrder.add(key)
      }
      if (orderTime > entry.lastOrderedAtMs) entry.lastOrderedAtMs = orderTime
      byKey.set(key, entry)
    }
  }

  const items: TypicalItem[] = [...byKey.values()].map(agg => ({
    key: agg.key,
    name: agg.name,
    totalUnits: agg.totalUnits,
    orderCount: agg.orderCount,
    lastOrderedAt: new Date(agg.lastOrderedAtMs),
  }))

  items.sort((a, b) => {
    if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount
    return b.totalUnits - a.totalUnits
  })

  return items.slice(0, TYPICAL_ITEMS_LIMIT)
}
