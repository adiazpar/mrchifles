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
  resetSession,
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
  deviceTrusted: boolean

  // Setup state (for first-time setup flow)
  setupComplete: boolean
  isCheckingSetup: boolean

  // Auth methods (now phone-based)
  loginWithPassword: (phoneNumber: string, password: string) => Promise<void>
  loginWithPin: (pin: string) => Promise<boolean>
  logout: (clearDevice?: boolean) => void

  // OTP methods
  sendOTP: (phoneNumber: string, purpose: 'registration' | 'login' | 'reset') => Promise<{ success: boolean; devCode?: string; error?: string }>
  verifyOTP: (phoneNumber: string, code: string) => Promise<{ valid: boolean; error?: string }>

  // Registration (phone-based)
  registerOwner: (data: {
    phoneNumber: string
    password: string
    name: string
    pin: string
  }) => Promise<void>
  registerWithInvite: (data: {
    inviteCode: string
    phoneNumber: string
    password: string
    name: string
    pin: string
  }) => Promise<void>

  // Session management
  lockSession: () => void
  unlockSession: (pin: string) => Promise<boolean>
  updateActivity: () => void

  // Device trust (now phone-based)
  getRememberedPhone: () => string | null
  clearRememberedPhone: () => void
  trustDevice: (phoneNumber: string) => void

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
const REMEMBERED_PHONE_KEY = 'chifles_remembered_phone'

// ============================================
// REMEMBERED PHONE HELPERS
// ============================================

function getRememberedPhone(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REMEMBERED_PHONE_KEY)
}

function setRememberedPhone(phoneNumber: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(REMEMBERED_PHONE_KEY, phoneNumber)
}

function clearRememberedPhoneStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REMEMBERED_PHONE_KEY)
}

/**
 * Convert phone number to auth email format for PocketBase
 * +51987654321 -> 51987654321@phone.local
 */
function phoneToAuthEmail(phoneNumber: string): string {
  const digits = phoneNumber.replace('+', '')
  return `${digits}@phone.local`
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

  // Check setup state on mount - verify if owner exists
  useEffect(() => {
    const checkSetup = async () => {
      try {
        // Use server-side API to check if owner exists
        // This avoids client-side auth restrictions
        const response = await fetch('/api/setup-status')
        const data = await response.json()
        setSetupComplete(data.ownerExists === true)
      } catch (error) {
        console.error('Error checking setup state:', error)
        // On error, assume setup is complete to avoid blocking existing users
        setSetupComplete(true)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkSetup()
  }, [])

  // Hydrate auth state from PocketBase on mount and validate with server
  useEffect(() => {
    const validateAuth = async () => {
      // Check if we have a stored token
      if (pb.authStore.model && pb.authStore.isValid) {
        try {
          // Validate token with server - this will fail if user was deleted
          const authData = await pb.collection('users').authRefresh()
          const refreshedUser = authData.record as unknown as User

          // Check if user has been disabled - log them out
          if (refreshedUser.status === 'disabled') {
            console.warn('User account has been disabled, logging out')
            pb.authStore.clear()
            setUser(null)
            clearRememberedPhoneStorage()
            setDeviceTrusted(false)
            return
          }

          setUser(refreshedUser)
        } catch {
          // Token is invalid or user was deleted - clear auth state
          console.warn('Auth token invalid or user deleted, clearing session')
          pb.authStore.clear()
          setUser(null)
          clearRememberedPhoneStorage()
          setDeviceTrusted(false)
        }
      }

      // Check if this device is trusted (has remembered phone)
      const rememberedPhone = getRememberedPhone()
      setDeviceTrusted(!!rememberedPhone && pb.authStore.isValid)

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

  // Periodically check if user has been disabled (every 30 seconds)
  useEffect(() => {
    if (!user) return

    const checkUserStatus = async () => {
      try {
        // Refresh user data to check current status
        const freshUser = await pb.collection('users').getOne<User>(user.id)
        if (freshUser.status === 'disabled') {
          console.warn('User account has been disabled, logging out')
          pb.authStore.clear()
          setUser(null)
          clearRememberedPhoneStorage()
          setDeviceTrusted(false)
        }
      } catch {
        // Ignore errors - user might have been deleted
      }
    }

    const interval = setInterval(checkUserStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [pb, user])

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

  // ============================================
  // AUTH METHODS
  // ============================================

  /**
   * Login with phone number and password (for new devices or expired sessions)
   * This is the primary authentication method
   */
  const loginWithPassword = useCallback(async (phoneNumber: string, password: string): Promise<void> => {
    try {
      // Convert phone to auth email format for PocketBase
      const authEmail = phoneToAuthEmail(phoneNumber)
      const authData = await pb.collection('users').authWithPassword(authEmail, password)
      setUser(authData.record as unknown as User)
      setRememberedPhone(phoneNumber) // Trust this device after successful password login
      setDeviceTrusted(true)
      setSessionState(prev => resetSession(prev))
    } catch (error) {
      // Don't log expected errors (disabled account, wrong password) as errors
      const pbError = error as { status?: number; message?: string }
      if (pbError.message?.includes('deshabilitada')) {
        console.warn('Login blocked: account disabled')
      } else {
        console.warn('Login failed:', pbError.status || 'unknown')
      }
      throw error
    }
  }, [pb])

  /**
   * Login with PIN (for trusted devices with valid session)
   * PIN is just a UI gate to unlock access to existing authenticated session
   */
  const loginWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const rememberedPhone = getRememberedPhone()
    if (!rememberedPhone) {
      return false
    }

    // Check if we have a valid PocketBase session
    if (!pb.authStore.isValid) {
      // Session expired - need password login
      clearRememberedPhoneStorage()
      setDeviceTrusted(false)
      return false
    }

    // Verify the session phone matches remembered phone
    const authUser = pb.authStore.model as User
    if (!authUser || authUser.phoneNumber !== rememberedPhone) {
      clearRememberedPhoneStorage()
      setDeviceTrusted(false)
      return false
    }

    // Check if PIN hash exists - defensive check
    if (!authUser.pin) {
      console.error('Login with PIN failed: authUser.pin is empty or undefined')
      return false
    }

    try {
      // Verify PIN against stored hash
      const isValid = await verifyPin(pin, authUser.pin)

      if (isValid) {
        // PIN correct - session is already valid, just update state
        setUser(authUser)
        setSessionState(prev => resetSession(prev))
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('PIN verification failed:', error)
      return false
    }
  }, [pb])

  const logout = useCallback((clearDevice = true) => {
    pb.authStore.clear()
    setUser(null)
    setSessionState(createSessionState())
    if (clearDevice) {
      clearRememberedPhoneStorage()
      setDeviceTrusted(false)
    }
  }, [pb])

  // ============================================
  // OTP METHODS
  // ============================================

  /**
   * Send OTP code to phone number via WhatsApp
   */
  const sendOTP = useCallback(async (
    phoneNumber: string,
    purpose: 'registration' | 'login' | 'reset'
  ): Promise<{ success: boolean; devCode?: string; error?: string }> => {
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, purpose }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Error al enviar el codigo' }
      }

      return { success: true, devCode: data.devCode }
    } catch {
      return { success: false, error: 'Error de conexion' }
    }
  }, [])

  /**
   * Verify OTP code
   */
  const verifyOTP = useCallback(async (
    phoneNumber: string,
    code: string
  ): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code }),
      })

      const data = await response.json()
      return { valid: data.valid, error: data.error }
    } catch {
      return { valid: false, error: 'Error de conexion' }
    }
  }, [])

  // ============================================
  // REGISTRATION METHODS
  // ============================================

  const registerOwner = useCallback(async (data: {
    phoneNumber: string
    password: string
    name: string
    pin: string
  }) => {
    // Check if setup is already complete (owner exists)
    if (setupComplete) {
      throw new Error('Ya existe un propietario registrado')
    }

    const pinHash = await hashPin(data.pin)
    const authEmail = phoneToAuthEmail(data.phoneNumber)

    try {
      // Create user with owner role using phone as auth email
      const newUser = await pb.collection('users').create({
        email: authEmail,               // Phone formatted as email for PocketBase auth
        emailVisibility: false,
        password: data.password,
        passwordConfirm: data.password,
        name: data.name,
        phoneNumber: data.phoneNumber,  // Actual phone number for display/WhatsApp
        phoneVerified: true,            // Verified via OTP before registration
        pin: pinHash,
        role: 'owner',
        status: 'active',
      })

      // Log in with auth email
      await pb.collection('users').authWithPassword(authEmail, data.password)
      setUser(newUser as unknown as User)

      // Mark setup as complete
      try {
        const configs = await pb.collection('app_config').getList(1, 1)
        if (configs.items.length > 0) {
          await pb.collection('app_config').update(configs.items[0].id, {
            setupComplete: true,
            ownerPhone: data.phoneNumber,
          })
        } else {
          // Create config record if none exists
          await pb.collection('app_config').create({
            setupComplete: true,
            ownerPhone: data.phoneNumber,
          })
        }
        setSetupComplete(true)
      } catch (configError) {
        console.error('Failed to update app config:', configError)
        // Don't fail registration if config update fails
      }

      // Trust this device
      setRememberedPhone(data.phoneNumber)
      setDeviceTrusted(true)
    } catch (error) {
      console.error('Registration failed:', error)
      // Extract PocketBase error message if available
      if (error && typeof error === 'object' && 'response' in error) {
        const pbError = error as { response?: { data?: Record<string, { message?: string }>, message?: string } }
        // Check for phone already exists error (email field in PocketBase)
        if (pbError.response?.data?.email?.message) {
          throw new Error('Ya existe una cuenta con este numero')
        }
        if (pbError.response?.data?.phoneNumber?.message) {
          throw new Error(pbError.response.data.phoneNumber.message)
        }
        throw new Error(pbError.response?.message || 'Error de registro')
      }
      throw error
    }
  }, [pb, setupComplete])

  const registerWithInvite = useCallback(async (data: {
    inviteCode: string
    phoneNumber: string
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
      const authEmail = phoneToAuthEmail(data.phoneNumber)

      // Create user with role from invite using phone as auth email
      const newUser = await pb.collection('users').create({
        email: authEmail,               // Phone formatted as email for PocketBase auth
        emailVisibility: false,
        password: data.password,
        passwordConfirm: data.password,
        name: data.name,
        phoneNumber: data.phoneNumber,  // Actual phone number for display/WhatsApp
        phoneVerified: true,            // Verified via OTP before registration
        pin: pinHash,
        role: validation.role,
        status: 'active',
      })

      // Log in with auth email
      await pb.collection('users').authWithPassword(authEmail, data.password)

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
      setRememberedPhone(data.phoneNumber)
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

    // Check if PIN hash exists - defensive check
    if (!user.pin) {
      console.error('Unlock failed: user.pin is empty or undefined')
      return false
    }

    try {
      const isValid = await verifyPin(pin, user.pin)

      if (isValid) {
        setSessionState(prev => ({
          ...resetSession(prev),
          isLocked: false,
        }))
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Unlock failed:', error)
      return false
    }
  }, [user])

  const handleUpdateActivity = useCallback(() => {
    setSessionState(updateActivity)
  }, [])

  // ============================================
  // DEVICE TRUST
  // ============================================

  const trustDevice = useCallback((phoneNumber: string) => {
    setRememberedPhone(phoneNumber)
    setDeviceTrusted(true)
  }, [])

  const clearRememberedPhone = useCallback(() => {
    clearRememberedPhoneStorage()
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
    deviceTrusted,

    // Setup state
    setupComplete,
    isCheckingSetup,

    loginWithPassword,
    loginWithPin,
    logout,

    sendOTP,
    verifyOTP,

    registerOwner,
    registerWithInvite,

    lockSession,
    unlockSession,
    updateActivity: handleUpdateActivity,

    getRememberedPhone,
    clearRememberedPhone,
    trustDevice,

    pb,
  }), [
    user,
    isLoading,
    sessionState.isLocked,
    deviceTrusted,
    setupComplete,
    isCheckingSetup,
    loginWithPassword,
    loginWithPin,
    logout,
    sendOTP,
    verifyOTP,
    registerOwner,
    registerWithInvite,
    lockSession,
    unlockSession,
    handleUpdateActivity,
    clearRememberedPhone,
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
