import type { User } from '@kasero/shared/types'

// ============================================
// LOCAL STORAGE CACHE
// ============================================

// Bumped to v2 when users.language was added — invalidates pre-i18n
// caches so old payloads (without `language`) don't poison the new
// locale flow.
export const USER_CACHE_KEY = 'kasero.auth.user.v2'

// Companion key — preserved from the JWT era for backwards compat with
// any consumer that still reads it. The migrated AuthContext drives
// session validity via authClient.useSession() (which has its own
// internal refresh), so this timestamp is no longer the source of truth
// for staleness. Safe to remove once no consumers read it.
export const USER_VALIDATED_KEY = 'kasero.auth.user.validated.v2'

// Custom DOM event broadcast from auth-context whenever the user's
// language preference mutates (login, register, refreshUser, or the
// explicit changeLanguage action). AppIntlProvider listens for this
// to swap the active message bundle without needing to consume
// useAuth() — that decoupling is what lets it sit ABOVE AuthProvider
// in the React tree, which AuthProvider requires (it calls useIntl
// and useApiMessage at render time for non-envelope error fallbacks).
export const LANGUAGE_CHANGE_EVENT = 'kasero:language-change' as const

export function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached) as User
    }
  } catch {
    // Invalid cache, ignore
  }
  return null
}

export function setCachedUser(user: User | null): void {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_CACHE_KEY)
      localStorage.removeItem(USER_VALIDATED_KEY)
    }
  } catch {
    // Storage error, ignore
  }
}
