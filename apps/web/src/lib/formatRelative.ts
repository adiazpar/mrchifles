// src/lib/formatRelative.ts
//
// Locale-aware relative date formatting. Returns strings like "today",
// "yesterday", "4 days ago", "2 weeks ago", "last month", "3 months ago",
// "1 year ago". Uses Intl.RelativeTimeFormat so the output respects the
// business's locale.

export function formatRelative(date: Date | string, locale: string): string {
  const then = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const diffMs = now - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffDays === 0) return rtf.format(0, 'day')
  if (diffDays === 1) return rtf.format(-1, 'day')
  if (diffDays < 7) return rtf.format(-diffDays, 'day')
  if (diffDays < 30) return rtf.format(-Math.floor(diffDays / 7), 'week')
  if (diffDays < 365) return rtf.format(-Math.floor(diffDays / 30), 'month')
  return rtf.format(-Math.floor(diffDays / 365), 'year')
}
