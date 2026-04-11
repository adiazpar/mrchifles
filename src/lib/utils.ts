/**
 * Format a monetary amount using the given locale and currency.
 *
 * Uses `Intl.NumberFormat`, which already knows per-currency decimal
 * conventions (e.g., CLP / COP / PYG are integer-only, USD / EUR use 2
 * decimals). Locale drives the decimal separator, thousand separator,
 * and symbol position.
 *
 * Callers should generally go through `useBusinessFormat()` instead,
 * which binds the current business's locale and currency automatically.
 * This lower-level helper is exposed for non-React code paths.
 */
export function formatCurrency(
  amount: number,
  locale: string = 'en-US',
  currency: string = 'USD',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format a date in the given locale. Uses the browser's local timezone,
 * which is correct for the vast majority of cases (user's phone time =
 * business physical location time).
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-US',
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Format a time in the given locale. Uses browser local timezone.
 */
export function formatTime(
  date: Date | string,
  locale: string = 'en-US',
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Get time-of-day greeting
 * 6am-12pm: Good morning
 * 12pm-6pm: Good afternoon
 * 6pm-6am: Good evening
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Combine CSS class names
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ============================================
// PRODUCT UTILITIES
// ============================================

/**
 * Get product icon from a product
 * The icon is stored as a base64 data URL (data:image/png;base64,...)
 *
 * @param product - Product with optional icon
 * @returns The icon data URL or null
 */
export function getProductIconUrl(
  product: { icon?: string | null },
): string | null {
  if (!product.icon) return null
  return product.icon
}

/**
 * Check if a string is an emoji (not a URL or path)
 */
export function isEmoji(str: string): boolean {
  return !str.startsWith('/') && !str.startsWith('data:') && !str.startsWith('http') && !str.startsWith('preset:')
}

/**
 * Check if a string is a base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:image/')
}
