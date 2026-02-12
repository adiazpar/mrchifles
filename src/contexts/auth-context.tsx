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
import PocketBase from 'pocketbase'
import type { User } from '@/types'
import {
  hashPin,
  verifyPin,
  createSessionState,
  shouldLockSession,
  isLockedOut,
  getLockoutRemainingSeconds,
  recordFailedAttempt,
  resetPinAttempts,
  updateActivity,
  type SessionState,
} from '@/lib/auth'

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isLocked: boolean
  lockoutRemaining: number
  failedAttempts: number

  // Auth methods
  loginWithEmail: (email: string) => Promise<{ exists: boolean; user?: User }>
  verifyUserPin: (pin: string) => Promise<boolean>
  logout: () => void

  // Registration
  registerOwner: (data: {
    email: string
    password: string
    name: string
    pin: string
  }) => Promise<void>
  registerWithInvite: (data: {
    inviteCode: string
    email: string
    password: string
    name: string
    pin: string
  }) => Promise<void>

  // Session management
  lockSession: () => void
  unlockSession: (pin: string) => Promise<boolean>
  updateActivity: () => void

  // Remembered email (for quick PIN login)
  getRememberedEmail: () => string | null
  clearRememberedEmail: () => void

  // PocketBase instance for direct access if needed
  pb: PocketBase
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
const REMEMBERED_EMAIL_KEY = 'chifles_remembered_email'

// ============================================
// REMEMBERED EMAIL HELPERS
// ============================================

function getRememberedEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REMEMBERED_EMAIL_KEY)
}

function setRememberedEmail(email: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
}

function clearRememberedEmail(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REMEMBERED_EMAIL_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pb] = useState(() => new PocketBase(POCKETBASE_URL))
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUser, setPendingUser] = useState<User | null>(null) // User waiting for PIN
  const [sessionState, setSessionState] = useState<SessionState>(createSessionState)

  // Hydrate auth state from PocketBase on mount
  useEffect(() => {
    const authData = pb.authStore.model
    if (authData && pb.authStore.isValid) {
      setUser(authData as User)
    }
    setIsLoading(false)

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model as User | null)
    })

    return () => {
      unsubscribe()
    }
  }, [pb])

  // Check for inactivity and lock session
  useEffect(() => {
    if (!user) return

    const checkInactivity = () => {
      if (shouldLockSession(sessionState) && !sessionState.isLocked) {
        setSessionState(prev => ({ ...prev, isLocked: true }))
      }
    }

    const interval = setInterval(checkInactivity, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [user, sessionState])

  // Update lockout countdown
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  useEffect(() => {
    if (isLockedOut(sessionState)) {
      const updateCountdown = () => {
        const remaining = getLockoutRemainingSeconds(sessionState)
        setLockoutRemaining(remaining)
        if (remaining <= 0) {
          setSessionState(prev => ({
            ...prev,
            failedAttempts: 0,
            lockoutUntil: null,
          }))
        }
      }
      updateCountdown()
      const interval = setInterval(updateCountdown, 1000)
      return () => clearInterval(interval)
    } else {
      setLockoutRemaining(0)
    }
  }, [sessionState])

  // ============================================
  // AUTH METHODS
  // ============================================

  const loginWithEmail = useCallback(async (email: string): Promise<{ exists: boolean; user?: User }> => {
    try {
      // Check if user exists with this email
      const records = await pb.collection('users').getList(1, 1, {
        filter: `email = "${email}"`,
      })

      if (records.items.length === 0) {
        return { exists: false }
      }

      const foundUser = records.items[0] as unknown as User
      setPendingUser(foundUser)
      return { exists: true, user: foundUser }
    } catch (error) {
      console.error('Error checking email:', error)
      throw error
    }
  }, [pb])

  const verifyUserPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!pendingUser) {
      throw new Error('No user pending PIN verification')
    }

    if (isLockedOut(sessionState)) {
      return false
    }

    try {
      // Verify PIN against stored hash
      const isValid = await verifyPin(pin, pendingUser.pin || '')

      if (isValid) {
        // Authenticate with PocketBase using email and a dummy request
        // Since PocketBase requires password for auth, we'll use authRefresh after setting the token
        // For now, we'll use a workaround: fetch the full user data and set it
        await pb.collection('users').authWithPassword(pendingUser.email, pin)
        setUser(pendingUser)
        setPendingUser(null)
        setSessionState(resetPinAttempts(sessionState))
        // Remember email for quick login next time
        setRememberedEmail(pendingUser.email)
        return true
      } else {
        setSessionState(recordFailedAttempt(sessionState))
        return false
      }
    } catch (error) {
      console.error('PIN verification failed:', error)
      setSessionState(recordFailedAttempt(sessionState))
      return false
    }
  }, [pendingUser, sessionState, pb])

  const logout = useCallback((clearEmail = true) => {
    pb.authStore.clear()
    setUser(null)
    setPendingUser(null)
    setSessionState(createSessionState())
    if (clearEmail) {
      clearRememberedEmail()
    }
  }, [pb])

  // ============================================
  // REGISTRATION METHODS
  // ============================================

  const registerOwner = useCallback(async (data: {
    email: string
    password: string
    name: string
    pin: string
  }) => {
    const pinHash = await hashPin(data.pin)

    try {
      // Create user with owner role
      const newUser = await pb.collection('users').create({
        email: data.email,
        password: data.password,
        passwordConfirm: data.password,
        name: data.name,
        pin: pinHash,
        role: 'owner',
        status: 'active',
      })

      // Log in the new user
      await pb.collection('users').authWithPassword(data.email, data.password)
      setUser(newUser as unknown as User)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }, [pb])

  const registerWithInvite = useCallback(async (data: {
    inviteCode: string
    email: string
    password: string
    name: string
    pin: string
  }) => {
    try {
      // Validate invite code
      const invites = await pb.collection('invite_codes').getList(1, 1, {
        filter: `code = "${data.inviteCode}" && used = false && expiresAt > @now`,
      })

      if (invites.items.length === 0) {
        throw new Error('Codigo de invitacion invalido o expirado')
      }

      const invite = invites.items[0]
      const pinHash = await hashPin(data.pin)

      // Create user with role from invite
      const newUser = await pb.collection('users').create({
        email: data.email,
        password: data.password,
        passwordConfirm: data.password,
        name: data.name,
        pin: pinHash,
        role: invite.role,
        status: 'active',
        invitedBy: invite.createdBy,
      })

      // Mark invite as used
      await pb.collection('invite_codes').update(invite.id, {
        used: true,
        usedBy: newUser.id,
      })

      // Log in the new user
      await pb.collection('users').authWithPassword(data.email, data.password)
      setUser(newUser as unknown as User)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }, [pb])

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  const lockSession = useCallback(() => {
    setSessionState(prev => ({ ...prev, isLocked: true }))
  }, [])

  const unlockSession = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false

    if (isLockedOut(sessionState)) {
      return false
    }

    try {
      const isValid = await verifyPin(pin, user.pin || '')

      if (isValid) {
        setSessionState(prev => ({
          ...resetPinAttempts(prev),
          isLocked: false,
        }))
        return true
      } else {
        setSessionState(recordFailedAttempt(sessionState))
        return false
      }
    } catch (error) {
      console.error('Unlock failed:', error)
      setSessionState(recordFailedAttempt(sessionState))
      return false
    }
  }, [user, sessionState])

  const handleUpdateActivity = useCallback(() => {
    setSessionState(updateActivity)
  }, [])

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user && !sessionState.isLocked,
    isLoading,
    isLocked: sessionState.isLocked,
    lockoutRemaining,
    failedAttempts: sessionState.failedAttempts,

    loginWithEmail,
    verifyUserPin,
    logout,

    registerOwner,
    registerWithInvite,

    lockSession,
    unlockSession,
    updateActivity: handleUpdateActivity,

    getRememberedEmail,
    clearRememberedEmail,

    pb,
  }), [
    user,
    isLoading,
    sessionState.isLocked,
    sessionState.failedAttempts,
    lockoutRemaining,
    loginWithEmail,
    verifyUserPin,
    logout,
    registerOwner,
    registerWithInvite,
    lockSession,
    unlockSession,
    handleUpdateActivity,
    pb,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// ============================================
// HELPER HOOKS
// ============================================

export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}
