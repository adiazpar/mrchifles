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
  deviceTrusted: boolean

  // Setup state (for first-time setup flow)
  setupComplete: boolean
  isCheckingSetup: boolean

  // Auth methods
  loginWithPassword: (email: string, password: string) => Promise<void>
  loginWithPin: (pin: string) => Promise<boolean>
  logout: (clearDevice?: boolean) => void

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

  // Device trust
  getRememberedEmail: () => string | null
  clearRememberedEmail: () => void
  trustDevice: (email: string) => void

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

function clearRememberedEmailStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REMEMBERED_EMAIL_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pb] = useState(() => new PocketBase(POCKETBASE_URL))
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionState, setSessionState] = useState<SessionState>(createSessionState)
  const [deviceTrusted, setDeviceTrusted] = useState(false)

  // Setup state - tracks whether owner account has been created
  const [setupComplete, setSetupComplete] = useState(true) // Default true to avoid flash
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)

  // Check setup state on mount
  useEffect(() => {
    const checkSetup = async () => {
      try {
        // app_config has public read access
        const configs = await pb.collection('app_config').getList(1, 1)
        if (configs.items.length > 0) {
          setSetupComplete(configs.items[0].setupComplete === true)
        } else {
          // No config record means fresh install
          setSetupComplete(false)
        }
      } catch (error) {
        console.error('Error checking setup state:', error)
        // On error, assume setup is complete to avoid blocking existing users
        setSetupComplete(true)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkSetup()
  }, [pb])

  // Hydrate auth state from PocketBase on mount and validate with server
  useEffect(() => {
    const validateAuth = async () => {
      // Check if we have a stored token
      if (pb.authStore.model && pb.authStore.isValid) {
        try {
          // Validate token with server - this will fail if user was deleted
          const authData = await pb.collection('users').authRefresh()
          setUser(authData.record as unknown as User)
        } catch {
          // Token is invalid or user was deleted - clear auth state
          console.warn('Auth token invalid or user deleted, clearing session')
          pb.authStore.clear()
          setUser(null)
          clearRememberedEmailStorage()
          setDeviceTrusted(false)
        }
      }

      // Check if this device is trusted (has remembered email)
      const rememberedEmail = getRememberedEmail()
      setDeviceTrusted(!!rememberedEmail && pb.authStore.isValid)

      setIsLoading(false)
    }

    validateAuth()

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

  /**
   * Login with email and password (for new devices or expired sessions)
   * This is the primary authentication method
   */
  const loginWithPassword = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      setUser(authData.record as unknown as User)
      setRememberedEmail(email) // Trust this device after successful password login
      setDeviceTrusted(true)
      setSessionState(resetPinAttempts(sessionState))
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }, [pb, sessionState])

  /**
   * Login with PIN (for trusted devices with valid session)
   * PIN is just a UI gate to unlock access to existing authenticated session
   */
  const loginWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const rememberedEmail = getRememberedEmail()
    if (!rememberedEmail) {
      return false
    }

    // Check if we have a valid PocketBase session
    if (!pb.authStore.isValid) {
      // Session expired - need password login
      clearRememberedEmailStorage()
      setDeviceTrusted(false)
      return false
    }

    // Verify the session email matches remembered email
    const authUser = pb.authStore.model as User
    if (!authUser || authUser.email !== rememberedEmail) {
      clearRememberedEmailStorage()
      setDeviceTrusted(false)
      return false
    }

    if (isLockedOut(sessionState)) {
      return false
    }

    try {
      // Verify PIN against stored hash
      const isValid = await verifyPin(pin, authUser.pin || '')

      if (isValid) {
        // PIN correct - session is already valid, just update state
        setUser(authUser)
        setSessionState(resetPinAttempts(sessionState))
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
  }, [pb, sessionState])

  const logout = useCallback((clearDevice = true) => {
    pb.authStore.clear()
    setUser(null)
    setSessionState(createSessionState())
    if (clearDevice) {
      clearRememberedEmailStorage()
      setDeviceTrusted(false)
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
    // Check if setup is already complete (owner exists)
    if (setupComplete) {
      throw new Error('Ya existe un propietario registrado')
    }

    const pinHash = await hashPin(data.pin)

    try {
      // Create user with owner role using ACTUAL password
      const newUser = await pb.collection('users').create({
        email: data.email,
        emailVisibility: true,
        password: data.password,        // ACTUAL password
        passwordConfirm: data.password, // ACTUAL password
        name: data.name,
        pin: pinHash,                   // PIN hash stored separately for quick unlock
        role: 'owner',
        status: 'active',
      })

      // Log in with ACTUAL password
      await pb.collection('users').authWithPassword(data.email, data.password)
      setUser(newUser as unknown as User)

      // Mark setup as complete
      try {
        const configs = await pb.collection('app_config').getList(1, 1)
        if (configs.items.length > 0) {
          await pb.collection('app_config').update(configs.items[0].id, {
            setupComplete: true,
            ownerEmail: data.email,
          })
        }
        setSetupComplete(true)
      } catch (configError) {
        console.error('Failed to update app config:', configError)
        // Don't fail registration if config update fails
      }

      // Trust this device
      setRememberedEmail(data.email)
      setDeviceTrusted(true)
    } catch (error) {
      console.error('Registration failed:', error)
      // Extract PocketBase error message if available
      if (error && typeof error === 'object' && 'response' in error) {
        const pbError = error as { response?: { data?: Record<string, { message?: string }>, message?: string } }
        // Check for email already exists error
        if (pbError.response?.data?.email?.message) {
          throw new Error(pbError.response.data.email.message)
        }
        throw new Error(pbError.response?.message || 'Error de registro')
      }
      throw error
    }
  }, [pb, setupComplete])

  const registerWithInvite = useCallback(async (data: {
    inviteCode: string
    email: string
    password: string
    name: string
    pin: string
  }) => {
    try {
      // Validate invite code using server-side endpoint (rate-limited)
      const response = await fetch(`${POCKETBASE_URL}/api/validate-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.inviteCode }),
      })

      const validation = await response.json()

      if (response.status === 429) {
        throw new Error(validation.error || 'Demasiados intentos')
      }

      if (!validation.valid) {
        throw new Error('Codigo de invitacion invalido o expirado')
      }

      const pinHash = await hashPin(data.pin)

      // Create user with role from invite using ACTUAL password
      const newUser = await pb.collection('users').create({
        email: data.email,
        emailVisibility: true,
        password: data.password,        // ACTUAL password
        passwordConfirm: data.password, // ACTUAL password
        name: data.name,
        pin: pinHash,                   // PIN hash stored separately
        role: validation.role,
        status: 'active',
      })

      // Log in with ACTUAL password to get auth token
      await pb.collection('users').authWithPassword(data.email, data.password)

      // Mark invite as used via server-side endpoint (now we're authenticated)
      try {
        await fetch(`${POCKETBASE_URL}/api/use-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token,
          },
          body: JSON.stringify({ code: data.inviteCode }),
        })
      } catch (updateError) {
        // Non-critical - invite marking as used can fail without breaking registration
        console.error('Failed to mark invite as used:', updateError)
      }

      setUser(newUser as unknown as User)

      // Trust this device
      setRememberedEmail(data.email)
      setDeviceTrusted(true)
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
  // DEVICE TRUST
  // ============================================

  const trustDevice = useCallback((email: string) => {
    setRememberedEmail(email)
    setDeviceTrusted(true)
  }, [])

  const clearRememberedEmail = useCallback(() => {
    clearRememberedEmailStorage()
    setDeviceTrusted(false)
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
    deviceTrusted,

    // Setup state
    setupComplete,
    isCheckingSetup,

    loginWithPassword,
    loginWithPin,
    logout,

    registerOwner,
    registerWithInvite,

    lockSession,
    unlockSession,
    updateActivity: handleUpdateActivity,

    getRememberedEmail,
    clearRememberedEmail,
    trustDevice,

    pb,
  }), [
    user,
    isLoading,
    sessionState.isLocked,
    sessionState.failedAttempts,
    lockoutRemaining,
    deviceTrusted,
    setupComplete,
    isCheckingSetup,
    loginWithPassword,
    loginWithPin,
    logout,
    registerOwner,
    registerWithInvite,
    lockSession,
    unlockSession,
    handleUpdateActivity,
    clearRememberedEmail,
    trustDevice,
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
