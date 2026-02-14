/**
 * Format currency in Peruvian Soles
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date in Peruvian format (DD/MM/YYYY)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(d)
}

/**
 * Format time in 12-hour format
 * Fixes es-PE locale quirk: "1:30 a. m." -> "1:30 a.m."
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Lima',
  }).format(d)
    .replace(/a\.\s*m\./gi, 'a.m.')
    .replace(/p\.\s*m\./gi, 'p.m.')
}

/**
 * Get time-of-day greeting in Spanish
 * 6am-12pm: Buenos dias
 * 12pm-6pm: Buenas tardes
 * 6pm-6am: Buenas noches
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'Buenos dias'
  if (hour >= 12 && hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

/**
 * Combine CSS class names
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
