'use client'

import { useIntl } from 'react-intl'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { authClient } from '@/lib/auth-client'
import type { User } from '@kasero/shared/types'
import type { SupportedLocale } from '@/i18n/config'
import { useApiMessage } from '@/hooks/useApiMessage'
import type { ApiMessageCode } from '@kasero/shared/api-messages'
import { clearKaseroLocalStorage } from '@/hooks/useSessionCache'
import { LANGUAGE_CHANGE_EVENT, setCachedUser } from '@/lib/user-cache'

// ============================================
// TYPES
// ============================================

interface LoginResult {
  success: boolean
  error?: string
  /** Set when the server demands a TOTP challenge before sign-in completes. */
  requires2FA?: boolean
  /** Set when the server bounced the sign-in because the email isn't verified. */
  requiresEmailVerification?: boolean
}

interface RegisterResult {
  success: boolean
  error?: string
  messageCode?: ApiMessageCode
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  register: (email: string, password: string, name: string) => Promise<RegisterResult>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  changeLanguage: (language: SupportedLocale) => Promise<{ success: boolean; error?: string }>
}

// Names of the Serwist caches whose contents are scoped to the current
// user's session. Must match the cacheName entries in src/app/sw.ts.
// Listing them in one place so both caches stay purged on identity
// change. Adding a new per-user cache to sw.ts requires extending this
// list. Security boundary per audit H-2 — do not loosen.
const SCOPED_SW_CACHE_NAMES = ['api-business', 'app-pages'] as const

// Wipe service-worker caches that hold per-user response data. The SW
// caches are keyed only by URL — there's no per-userId namespace — so
// when a user logs out (or a different user logs in on the same
// browser), the cached snapshots from the prior session would otherwise
// be served from caches.match() the next time the network is slow.
async function clearScopedServiceWorkerCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return
  try {
    await Promise.all(SCOPED_SW_CACHE_NAMES.map((n) => caches.delete(n)))
  } catch {
    // Best-effort cleanup. Cookie was already cleared server-side.
  }
}

// Broadcast a runtime language change so AppIntlProvider — which is
// mounted ABOVE AuthProvider in the React tree and therefore can't
// observe useAuth() updates directly — can swap its message bundle.
function dispatchLanguageChange(language: string | undefined): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { language } }),
  )
}

// Map better-auth's session.user shape onto our canonical User type.
// better-auth stores the avatar in the `image` field but the on-disk
// column is `avatar` — the alias is configured in
// apps/api/src/lib/auth.ts via `fields: { image: 'avatar' }`. We accept
// either spelling here so the mapper survives any future alias change.
function mapSessionUserToUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null
  const u = raw as Record<string, unknown>
  if (typeof u.id !== 'string' || typeof u.email !== 'string' || typeof u.name !== 'string') {
    return null
  }
  const avatar =
    (u.image as string | null | undefined) ??
    (u.avatar as string | null | undefined) ??
    null
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatar,
    language: (u.language as string | undefined) ?? 'en-US',
    emailVerified: Boolean(u.emailVerified),
    phoneNumber: (u.phoneNumber as string | null | undefined) ?? null,
    phoneNumberVerified: Boolean(u.phoneNumberVerified),
    twoFactorEnabled: Boolean(u.twoFactorEnabled),
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
  const intl = useIntl()
  const translateApiMessage = useApiMessage()
  const { data: session, isPending, refetch } = authClient.useSession()

  const user = useMemo(
    () => mapSessionUserToUser(session?.user ?? null),
    [session?.user],
  )
  const isAuthenticated = !!user

  // Per-user cache eviction. When the active user-id changes (logout,
  // fresh login, account switch in the same browser), wipe
  // sessionStorage, the kasero.* localStorage entries, and the SW
  // caches that hold per-user API/page responses. Without this, a
  // returning visitor inherits stale role data and any cached responses
  // from the previous identity. Verified-exploitable on shared devices
  // in the audit (H-2).
  const previousUserIdRef = useRef<string | null>(null)
  useEffect(() => {
    const currentId = user?.id ?? null
    const previous = previousUserIdRef.current
    if (previous !== null && previous !== currentId) {
      try {
        sessionStorage.clear()
      } catch {
        // Storage error, ignore.
      }
      clearKaseroLocalStorage()
      void clearScopedServiceWorkerCaches()
    }
    previousUserIdRef.current = currentId
  }, [user?.id])

  // Broadcast language whenever the resolved user.language changes so
  // AppIntlProvider (mounted ABOVE AuthProvider) can swap its bundle.
  // Also persist the resolved user to the user-cache so AppIntlProvider's
  // cold-start fast-path (getCachedUser) picks the right locale on the
  // next page load — without this write the cache stays stale and a
  // returning visitor sees the default en-US bundle until session loads.
  useEffect(() => {
    if (!user) {
      setCachedUser(null)
      dispatchLanguageChange(undefined)
      return
    }
    setCachedUser(user)
    dispatchLanguageChange(user.language)
  }, [user?.language, user?.id, user])

  // ============================================
  // AUTH METHODS
  // ============================================

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await authClient.signIn.email({ email, password })
      const err = result.error
      if (err) {
        const code = err.code
        if (code === 'EMAIL_NOT_VERIFIED') {
          return {
            success: false,
            requiresEmailVerification: true,
            error: translateApiMessage({ messageCode: 'EMAIL_NOT_VERIFIED' }),
          }
        }
        if (
          code === 'TWO_FACTOR_REQUIRED' ||
          code === 'TWO_FACTOR_VERIFICATION_REQUIRED'
        ) {
          return {
            success: false,
            requires2FA: true,
            error: '',
          }
        }
        return {
          success: false,
          error:
            err.message ??
            intl.formatMessage({ id: 'auth.connection_error' }),
        }
      }
      await refetch()
      return { success: true }
    },
    [intl, refetch, translateApiMessage],
  )

  const register = useCallback(
    async (email: string, password: string, name: string): Promise<RegisterResult> => {
      const result = await authClient.signUp.email({ email, password, name })
      const err = result.error
      if (err) {
        const code = err.code as ApiMessageCode | undefined
        return {
          success: false,
          error:
            err.message ??
            intl.formatMessage({ id: 'auth.connection_error' }),
          messageCode: code,
        }
      }
      await refetch()
      return { success: true }
    },
    [intl, refetch],
  )

  const logout = useCallback(async () => {
    try {
      await authClient.signOut()
    } catch {
      // Sign-out is best-effort. Even when the server rejects (rare),
      // the client-side cleanup below should still run.
    }
    try {
      sessionStorage.clear()
    } catch {
      // Storage error, ignore.
    }
    clearKaseroLocalStorage()
    await clearScopedServiceWorkerCaches()
    await refetch()
    dispatchLanguageChange(undefined)
  }, [refetch])

  const refreshUser = useCallback(async () => {
    await refetch()
  }, [refetch])

  const changeLanguage = useCallback(
    async (language: SupportedLocale): Promise<{ success: boolean; error?: string }> => {
      // authClient.updateUser sends a PATCH /api/auth/update-user; the
      // additionalField mapping in apps/api/src/lib/auth.ts (`language`
      // additionalFields entry with input: true) makes this field
      // user-settable. Refetch picks up the new value into session.
      const result = await authClient.updateUser({ language })
      const err = result.error
      if (err) {
        return {
          success: false,
          error:
            err.message ??
            intl.formatMessage({ id: 'auth.connection_error' }),
        }
      }
      await refetch()
      dispatchLanguageChange(language)
      router.refresh()
      return { success: true }
    },
    [intl, refetch, router],
  )

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      isLoading: isPending,
      login,
      register,
      logout,
      refreshUser,
      changeLanguage,
    }),
    [user, isAuthenticated, isPending, login, register, logout, refreshUser, changeLanguage],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ============================================
// HOOKS
// ============================================

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export function useUser(): User | null {
  return useAuth().user
}

export function useIsAuthenticated(): boolean {
  return useAuth().isAuthenticated
}
