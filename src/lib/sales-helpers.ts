/**
 * Currency-aware math helpers for the sales feature.
 *
 * Keep this file pure (no React, no DB). All inputs are primitives,
 * outputs are primitives — easy to test, easy to reason about.
 */

// ISO 4217 zero-decimal currencies. Display and storage both use 0 decimals.
const ZERO_DECIMAL_CURRENCIES = new Set(['CLP', 'JPY', 'KRW', 'VND', 'XAF', 'XOF', 'XPF'])

export function decimalsForCurrency(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2
}

/**
 * Round a number to the appropriate number of decimals for the given
 * currency. Uses Math.round (banker's rounding NOT used) to match the
 * rounding orders/route.ts already does for `subtotal`.
 */
export function roundToCurrencyDecimals(value: number, currency: string): number {
  const decimals = decimalsForCurrency(currency)
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Midnight UTC of the same calendar day as `d`. Used as the lower bound
 * for "today" stats queries.
 *
 * Limitation acknowledged in the design spec: this uses server UTC, not
 * the business's locale timezone. v1.1 will switch to locale-aware buckets.
 */
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Midnight UTC of the day before `d`.
 */
export function startOfPrevUtcDay(d: Date): Date {
  const start = startOfUtcDay(d)
  start.setUTCDate(start.getUTCDate() - 1)
  return start
}

/**
 * Expected cash in the drawer at session close: starting float plus all
 * cash-payment-method sales. Rounded to currency decimals so the value
 * matches the cashier's mental model (no $230.0000000004).
 */
export function computeExpectedCash(
  startingCash: number,
  cashSalesTotal: number,
  currency: string,
): number {
  return roundToCurrencyDecimals(startingCash + cashSalesTotal, currency)
}

/**
 * Variance between the cashier's counted cash and the expected cash.
 * Negative = drawer short, positive = drawer over, 0 = reconciled.
 */
export function computeVariance(
  countedCash: number,
  expectedCash: number,
  currency: string,
): number {
  return roundToCurrencyDecimals(countedCash - expectedCash, currency)
}

const BILL_DENOMS_BY_CURRENCY: Record<string, number[]> = {
  USD: [5, 10, 20, 50, 100],
  PEN: [10, 20, 50, 100, 200],
  JPY: [1000, 5000, 10000],
  CLP: [1000, 5000, 10000, 20000],
}

/**
 * Returns up to 4 unique "round-up" bill amounts strictly greater than `total`,
 * derived from a per-currency denomination set. Used to render the cash
 * quick-fill buttons in the cart payment step. Falls back to USD denoms for
 * unknown currencies. Returns an empty array when the total is at or above
 * every denomination in the set.
 */
export function nextRoundBills(total: number, currency: string): number[] {
  const denoms =
    BILL_DENOMS_BY_CURRENCY[currency.toUpperCase()] ??
    BILL_DENOMS_BY_CURRENCY.USD
  // When the total exceeds every denomination, the loop would still push
  // Math.ceil(total/d)*d for each d (a value strictly above total), which
  // isn't useful for picking a single bill the customer actually handed
  // over. Bail out so the UI falls back to "Exact" + free-form input.
  const maxDenom = denoms[denoms.length - 1]
  if (total > maxDenom) return []
  const result: number[] = []
  for (const d of denoms) {
    const rounded = Math.ceil(total / d) * d
    if (rounded > total && !result.includes(rounded)) result.push(rounded)
    if (result.length >= 4) break
  }
  return result
}
