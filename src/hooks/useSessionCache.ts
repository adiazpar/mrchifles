/**
 * Creates standalone cache functions for use outside of React components.
 * Useful for initializing state in useState callbacks.
 *
 * @example
 * const { get, set, clear } = createSessionCache<Product[]>('products')
 *
 * const [products, setProducts] = useState<Product[]>(() => get() || [])
 */
export function createSessionCache<T>(key: string) {
  const get = (): T | null => {
    if (typeof window === 'undefined') return null
    try {
      const cached = sessionStorage.getItem(key)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  const set = (data: T) => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(key, JSON.stringify(data))
    } catch {
      // Storage error, ignore
    }
  }

  const clear = () => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(key)
  }

  return { get, set, clear }
}

// Single source of truth for every sessionStorage key the app uses.
// Per-business caches are scoped via scopedCache(key, businessId);
// global caches are read/written with createSessionCache(key).
//
// If you add a NEW sessionStorage key anywhere in src/, add it here
// first and import the CACHE_KEYS.* reference — never hardcode a
// cache-key string at a call site.
export const CACHE_KEYS = {
  // Per-business list / map caches (suffixed with `_${businessId}`
  // via scopedCache). Every one of these is cleared together by
  // clearPerBusinessCaches on leave / delete-business / account-delete.
  PRODUCTS: 'products_cache',
  PROVIDERS: 'providers_cache',
  ORDERS: 'orders_cache',
  SALES: 'sales_cache',
  SALES_CART: 'sales_cart',
  SALES_SESSIONS: 'sales_sessions_cache',
  CATEGORIES: 'product_categories_cache',
  PRODUCT_SETTINGS: 'product_settings_cache',
  PENDING_TRANSFER: 'pending_transfer',

  // Cross-business caches. NOT scoped by businessId.
  BUSINESS_SHELL: 'kasero_business_cache',   // Map<businessId, {name, role, ...}> used by PageTransitionContext
  HUB_BUSINESSES: 'kasero_hub_businesses',   // The list rendered on the hub home
} as const

// Keys that live under scopedCache(key, businessId). Kept in sync with
// CACHE_KEYS so clearPerBusinessCaches can drop every entry in one call.
const PER_BUSINESS_KEYS = [
  CACHE_KEYS.PRODUCTS,
  CACHE_KEYS.PROVIDERS,
  CACHE_KEYS.ORDERS,
  CACHE_KEYS.SALES,
  CACHE_KEYS.SALES_CART,
  CACHE_KEYS.SALES_SESSIONS,
  CACHE_KEYS.CATEGORIES,
  CACHE_KEYS.PRODUCT_SETTINGS,
  CACHE_KEYS.PENDING_TRANSFER,
] as const

/**
 * Business-scoped cache helper. The products cache (and any other
 * per-business list) must not bleed across businesses in the same session,
 * so we suffix the key with the businessId. Shared so every site that
 * reads/writes/clears the same logical cache agrees on the key.
 */
export function scopedCache<T>(key: string, businessId: string) {
  return createSessionCache<T>(`${key}_${businessId}`)
}

/**
 * Drop every per-business sessionStorage entry for one businessId. Call
 * after a mutation that makes the cached shape stale: leaving the
 * business, deleting the business, deleting the account, or having the
 * access revoked.
 */
export function clearPerBusinessCaches(businessId: string): void {
  for (const key of PER_BUSINESS_KEYS) {
    scopedCache(key, businessId).clear()
  }
}

/**
 * Drop the top-level hub businesses list. Call after any mutation that
 * changes a business's metadata (name, icon, locale, currency, type) or
 * changes which businesses the user belongs to (create, delete, leave,
 * accept transfer).
 */
export function clearHubBusinessesCache(): void {
  createSessionCache(CACHE_KEYS.HUB_BUSINESSES).clear()
}
