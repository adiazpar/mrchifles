'use client'

import { useMemo } from 'react'
import { useOptionalBusiness } from '@/contexts/business-context'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

/**
 * Returns formatters pre-bound to the current business's locale and
 * currency. Use this in any component that displays money, dates, or
 * times — it ensures every business sees their own regional conventions
 * (decimal/thousand separators, currency symbol, date order, 24h vs 12h).
 *
 * Falls back to `en-US` / `USD` when rendered outside a BusinessProvider
 * (e.g. on the hub or auth pages) so callers never have to null-check.
 */
export function useBusinessFormat() {
  const business = useOptionalBusiness()?.business ?? null
  const locale = business?.locale ?? 'en-US'
  const currency = business?.currency ?? 'USD'

  return useMemo(
    () => ({
      locale,
      currency,
      formatCurrency: (amount: number) => formatCurrency(amount, locale, currency),
      formatDate: (date: Date | string) => formatDate(date, locale),
      formatTime: (date: Date | string) => formatTime(date, locale),
    }),
    [locale, currency],
  )
}
