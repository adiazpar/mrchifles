'use client'

import { useIntl } from 'react-intl';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import type { User } from '@kasero/shared/types'
import { fetchDeduped } from '@/lib/fetch'
import type { SupportedLocale } from '@/i18n/config'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError, apiPost, apiPatch } from '@/lib/api-client'
import { clearKaseroLocalStorage } from '@/hooks/useSessionCache'

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // Auth methods
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  changeLanguage: (language: SupportedLocale) => Promise<{ success: boolean; error?: string }>
}

// ============================================
// LOCAL STORAGE CACHE
// ============================================

// Bumped to v2 when users.language was added — invalidates cached user
// objects from before the schema change.
const AUTH_CACHE_KEY = 'auth_user_cache_v2'
const AUTH_VALIDATED_KEY = 'auth_last_validated'
const VALIDATION_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

// Names of the Serwist caches whose contents are scoped to the
// current user's session. Must match the cacheName entries in
// src/app/sw.ts. Listing them in one place so both caches stay
// purged on identity change. Adding a new per-user cache to sw.ts
// requires extending this list.
const SCOPED_SW_CACHE_NAMES = ['api-business', 'app-pages'] as const

// Wipe service-worker caches that hold per-user response data. The
// SW caches are keyed only by URL — there's no per-userId namespace
// — so when a user logs out (or a different user logs in on the
// same browser), the cached snapshots from the prior session would
// otherwise be served from caches.match() the next time the network
// is slow. Verified-exploitable on shared devices in the audit (H-2).
async function clearScopedServiceWorkerCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return
  try {
    await Promise.all(
      SCOPED_SW_CACHE_NAMES.map((name) => caches.delete(name)),
    )
  } catch {
    // caches.delete can reject in private-browsing modes or when the
    // SW hasn't yet installed. Failure here is best-effort cleanup,
    // not a security boundary — the cookie has already been cleared
    // server-side by /api/auth/logout, so an attacker would need
    // both the cached responses AND a way to make the SW serve them
    // without an auth check (which doesn't exist today).
  }
}

function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached) as User
    }
  } catch {
    // Invalid cache, ignore
  }
  return null
}

function setCachedUser(user: User | null): void {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY)
      localStorage.removeItem(AUTH_VALIDATED_KEY)
    }
  } catch {
    // Storage error, ignore
  }
}

function shouldRevalidate(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const lastValidated = localStorage.getItem(AUTH_VALIDATED_KEY)
    if (!lastValidated) return true
    const elapsed = Date.now() - parseInt(lastValidated, 10)
    return elapsed > VALIDATION_INTERVAL_MS
  } catch {
    return true
  }
}

function setValidatedNow(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AUTH_VALIDATED_KEY, Date.now().toString())
  } catch {
    // Storage error, ignore
  }
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const tAuth = useIntl()
  const translateApiMessage = useApiMessage()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load cached user and validate auth on mount (if needed)
  useEffect(() => {
    const cachedUser = getCachedUser()

    // If we have cached data, use it immediately
    if (cachedUser) {
      setUser(cachedUser)
      setIsLoading(false)

      // Skip API call if validated recently (within 5 minutes)
      if (!shouldRevalidate()) {
        return
      }
    }

    // Validate auth with server
    const validateAuth = async () => {
      try {
        const response = await fetchDeduped('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUser(data.user)
            setCachedUser(data.user)
            setValidatedNow()
          } else {
            // Server says no user, clear cache
            setUser(null)
            setCachedUser(null)
          }
        } else {
          // Auth failed, clear cache
          setUser(null)
          setCachedUser(null)
        }
      } catch (error) {
        console.error('Failed to validate auth:', error)
        // On network error, keep cached user (offline support)
      } finally {
        setIsLoading(false)
      }
    }

    validateAuth()
  }, [])

  // ============================================
  // AUTH METHODS
  // ============================================

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiPost<{ user: User }>('/api/auth/login', { email, password })

      // Wipe any residual per-user caches (business role cache,
      // per-business data caches) from a prior user on this tab before
      // seating the new identity. Without this, the business-context
      // would hand the new user the previous user's cached role.
      // Both stores get flushed: sessionStorage covers the per-tab
      // caches, clearKaseroLocalStorage covers the cold-start-survivors
      // (e.g. sales-sessions).
      try {
        sessionStorage.clear()
      } catch {
        // Ignore storage errors
      }
      clearKaseroLocalStorage()
      // Drop the SW caches owned by the previous user. await is safe
      // here — login latency is dominated by the network round-trip
      // above, the cache deletion is a few ms.
      await clearScopedServiceWorkerCaches()

      setUser(data.user)
      setCachedUser(data.user)
      setValidatedNow()

      // Kick off the hub's business-list fetch during the auth-gate
      // overlay animation so it's in flight (and often resolved) by the
      // time the hub mounts. fetchDeduped shares the in-flight promise
      // with the hub's own call on mount, so the hub doesn't duplicate
      // the request when timing overlaps. Fire-and-forget — any failure
      // retries naturally on the hub mount.
      void fetchDeduped('/api/businesses/list').catch(() => {})

      return { success: true }
    } catch (err) {
      if (err instanceof ApiError) {
        const error = err.envelope
          ? translateApiMessage(err.envelope)
          : translateApiMessage({ messageCode: 'AUTH_LOGIN_FAILED' })
        return { success: false, error }
      }
      return { success: false, error: tAuth.formatMessage({
        id: 'auth.connection_error'
      }) };
    }
  }, [tAuth, translateApiMessage])

  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiPost<{ user: User }>('/api/auth/register', { email, password, name })

      // Wipe residual per-user caches from a prior user on this tab
      // (e.g. someone logged out and then registered a fresh account
      // in the same tab). Same defensive clear as login().
      try {
        sessionStorage.clear()
      } catch {
        // Ignore storage errors
      }
      clearKaseroLocalStorage()
      // Same SW-cache wipe as login(): a fresh registration in a
      // browser that previously held another user's session must
      // not serve that user's stale snapshots offline.
      await clearScopedServiceWorkerCaches()

      setUser(data.user)
      setCachedUser(data.user)
      setValidatedNow()

      // Intentionally no /api/businesses/list prefetch — a freshly
      // registered user has no businesses yet, and the hub's empty
      // state renders without a network round-trip.

      return { success: true }
    } catch (err) {
      if (err instanceof ApiError) {
        const error = err.envelope
          ? translateApiMessage(err.envelope)
          : translateApiMessage({ messageCode: 'AUTH_REGISTER_FAILED' })
        return { success: false, error }
      }
      return { success: false, error: tAuth.formatMessage({
        id: 'auth.connection_error'
      }) };
    }
  }, [tAuth, translateApiMessage])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore errors
    }
    setUser(null)
    setCachedUser(null)
    // Clear all per-user caches so the next account to sign in on this
    // tab doesn't inherit stale role / business / session data. Cover
    // ALL stores — sessionStorage for per-tab caches, our prefixed
    // localStorage entries for cold-start-survivors, AND the SW
    // caches that hold per-user API/page responses (without this
    // last clear, an attacker offline-mode'ing the device after
    // logout could replay the cached responses without an auth
    // check — verified-exploitable as audit H-2).
    try {
      sessionStorage.clear()
    } catch {
      // Ignore storage errors
    }
    clearKaseroLocalStorage()
    await clearScopedServiceWorkerCaches()
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetchDeduped('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
          setCachedUser(data.user)
          setValidatedNow()
        }
      }
    } catch {
      // Ignore errors
    }
  }, [])

  const changeLanguage = useCallback(
    async (language: SupportedLocale): Promise<{ success: boolean; error?: string }> => {
      try {
        await apiPatch('/api/user/language', { language })
        setUser((prev) => {
          if (!prev) return prev
          const next = { ...prev, language }
          setCachedUser(next)
          return next
        })
        // The user.language change above already propagates through
        // AppIntlProvider (which reads useAuth().user.language and swaps
        // the message bundle). router.refresh() is a leftover from the
        // pre-Vite cookie-bound RSC pipeline and is now a no-op via the
        // next-navigation-shim — kept for shim parity, no longer needed
        // for i18n correctness.
        router.refresh()
        return { success: true }
      } catch (err) {
        if (err instanceof ApiError) {
          const error = err.envelope
            ? translateApiMessage(err.envelope)
            : translateApiMessage({ messageCode: 'USER_LANGUAGE_UPDATE_FAILED' })
          return { success: false, error }
        }
        return { success: false, error: tAuth.formatMessage({
          id: 'auth.connection_error'
        }) };
      }
    },
    [router, tAuth, translateApiMessage],
  )

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    changeLanguage,
  }), [user, isLoading, login, register, logout, refreshUser, changeLanguage])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// HOOKS
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}
