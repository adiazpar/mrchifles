'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { User } from '@/types'
import { fetchDeduped } from '@/lib/fetch'
import type { SupportedLocale } from '@/i18n/config'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError, apiPost, apiPatch } from '@/lib/api-client'

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
  const tAuth = useTranslations('auth')
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

      // Wipe any residual per-user session caches (business role cache,
      // per-business data caches) from a prior user on this tab before
      // seating the new identity. Without this, the business-context
      // would hand the new user the previous user's cached role.
      try {
        sessionStorage.clear()
      } catch {
        // Ignore storage errors
      }

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
      return { success: false, error: tAuth('connection_error') }
    }
  }, [tAuth, translateApiMessage])

  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiPost<{ user: User }>('/api/auth/register', { email, password, name })

      // Wipe residual per-user session caches from a prior user on this
      // tab (e.g. someone logged out and then registered a fresh account
      // in the same tab). Same defensive clear as login().
      try {
        sessionStorage.clear()
      } catch {
        // Ignore storage errors
      }

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
      return { success: false, error: tAuth('connection_error') }
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
    // Clear all per-user session caches so the next account to sign in
    // on this tab doesn't inherit stale role / business data.
    try {
      sessionStorage.clear()
    } catch {
      // Ignore storage errors
    }
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
        // Force RSC re-render so next-intl picks up the new cookie-bound bundle.
        router.refresh()
        return { success: true }
      } catch (err) {
        if (err instanceof ApiError) {
          const error = err.envelope
            ? translateApiMessage(err.envelope)
            : translateApiMessage({ messageCode: 'USER_LANGUAGE_UPDATE_FAILED' })
          return { success: false, error }
        }
        return { success: false, error: tAuth('connection_error') }
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
