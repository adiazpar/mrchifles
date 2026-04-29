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
