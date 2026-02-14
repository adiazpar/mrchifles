/**
 * Mock data for development/demo purposes
 * This will be replaced with real data from PocketBase
 */

// Initial stats for dashboard
export const INITIAL_STATS = {
  todaySales: 1250.0,
  previousDaySales: 1100.0,
  transactionCount: 45,
  cashBalance: 650.0,
}

// Mock inventory data
export const MOCK_INVENTORY = {
  totalUnits: 156,
  lowStockCount: 2,
  pendingOrder: true,
  lowStockProducts: [
    { name: 'Chifles Picante', stock: 5, threshold: 10 },
    { name: 'Chifles Dulce', stock: 3, threshold: 10 },
  ],
}

// Weekly sales trend (last 7 days)
export const WEEKLY_SALES = [820, 950, 1100, 890, 1200, 1100, 1250]

// Payment method breakdown
export const PAYMENT_BREAKDOWN = [
  { value: 750, color: 'var(--color-cash)', label: 'Efectivo' },
  { value: 420, color: 'var(--color-yape)', label: 'Yape' },
  { value: 80, color: 'var(--color-pos)', label: 'POS' },
]

// Top products
export const TOP_PRODUCTS = [
  { label: 'Tocino', value: 28, color: 'var(--color-brand)' },
  { label: 'Natural', value: 22, color: 'var(--brand-400)' },
  { label: 'Picante', value: 15, color: 'var(--brand-300)' },
  { label: 'Dulce', value: 10, color: 'var(--brand-200)' },
]
