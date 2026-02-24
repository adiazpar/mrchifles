import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth'

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

// ============================================
// FIREBASE INITIALIZATION
// ============================================

let app: FirebaseApp | null = null
let auth: Auth | null = null

/**
 * Get Firebase app instance (singleton)
 */
function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null

  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    console.warn('Firebase config missing - phone auth will not work')
    return null
  }

  if (!app) {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      app = existingApps[0]
    } else {
      app = initializeApp(firebaseConfig)
    }
  }

  return app
}

/**
 * Get Firebase Auth instance (singleton)
 */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined') return null

  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null

  if (!auth) {
    auth = getAuth(firebaseApp)
    // Set language to Spanish for SMS messages
    auth.languageCode = 'es'
  }

  return auth
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )
}

// ============================================
// RECAPTCHA MANAGEMENT
// ============================================

let recaptchaVerifier: RecaptchaVerifier | null = null

/**
 * Setup invisible reCAPTCHA for phone auth
 * Must be called before signInWithPhoneNumber
 */
export function setupRecaptcha(buttonId: string): RecaptchaVerifier | null {
  const authInstance = getFirebaseAuth()
  if (!authInstance) return null

  // Clear existing verifier if any
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // Ignore errors when clearing
    }
    recaptchaVerifier = null
  }

  // Create invisible reCAPTCHA
  recaptchaVerifier = new RecaptchaVerifier(authInstance, buttonId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - allow signInWithPhoneNumber
    },
    'expired-callback': () => {
      // reCAPTCHA expired - reset if needed
      console.warn('reCAPTCHA expired')
    },
  })

  return recaptchaVerifier
}

/**
 * Clear reCAPTCHA verifier
 */
export function clearRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // Ignore errors when clearing
    }
    recaptchaVerifier = null
  }
}

// ============================================
// PHONE AUTHENTICATION
// ============================================

/**
 * Send OTP via Firebase SMS
 * @param phoneNumber E.164 format (e.g., +51987654321)
 * @param buttonId ID of the button element for reCAPTCHA
 * @returns ConfirmationResult to verify OTP later
 */
export async function sendFirebaseOTP(
  phoneNumber: string,
  buttonId: string
): Promise<{ success: boolean; confirmationResult?: ConfirmationResult; error?: string }> {
  const authInstance = getFirebaseAuth()
  if (!authInstance) {
    return { success: false, error: 'Firebase no configurado' }
  }

  try {
    // Setup reCAPTCHA
    const verifier = setupRecaptcha(buttonId)
    if (!verifier) {
      return { success: false, error: 'Error al configurar reCAPTCHA' }
    }

    // Send OTP
    const confirmationResult = await signInWithPhoneNumber(authInstance, phoneNumber, verifier)

    return { success: true, confirmationResult }
  } catch (error) {
    console.error('Firebase OTP error:', error)

    // Handle specific Firebase errors
    const firebaseError = error as { code?: string; message?: string }

    if (firebaseError.code === 'auth/invalid-phone-number') {
      return { success: false, error: 'Numero de telefono invalido' }
    }
    if (firebaseError.code === 'auth/too-many-requests') {
      return { success: false, error: 'Demasiados intentos. Intenta mas tarde.' }
    }
    if (firebaseError.code === 'auth/captcha-check-failed') {
      return { success: false, error: 'Verificacion fallida. Intenta de nuevo.' }
    }

    return { success: false, error: 'Error al enviar el codigo' }
  }
}

/**
 * Verify OTP code using Firebase
 * @param confirmationResult From sendFirebaseOTP
 * @param code 6-digit OTP code
 * @returns Firebase ID token if successful
 */
export async function verifyFirebaseOTP(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<{ success: boolean; idToken?: string; phoneNumber?: string; error?: string }> {
  try {
    const userCredential = await confirmationResult.confirm(code)
    const idToken = await userCredential.user.getIdToken()
    const phoneNumber = userCredential.user.phoneNumber || undefined

    // Sign out from Firebase - we don't use Firebase for session management
    // PocketBase remains our auth system
    const authInstance = getFirebaseAuth()
    if (authInstance) {
      await authInstance.signOut()
    }

    return { success: true, idToken, phoneNumber }
  } catch (error) {
    console.error('Firebase verify error:', error)

    const firebaseError = error as { code?: string }

    if (firebaseError.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Codigo incorrecto' }
    }
    if (firebaseError.code === 'auth/code-expired') {
      return { success: false, error: 'Codigo expirado. Solicita uno nuevo.' }
    }

    return { success: false, error: 'Error al verificar el codigo' }
  }
}

// ============================================
// RATE LIMITING (Simple in-memory for demo)
// In production, use Redis or database
// ============================================

const otpAttempts = new Map<string, { count: number; resetAt: number }>()

/**
 * Check if phone number has exceeded OTP rate limit
 * @param phoneNumber E.164 format
 * @returns true if rate limited
 */
export function isRateLimited(phoneNumber: string): boolean {
  const now = Date.now()
  const record = otpAttempts.get(phoneNumber)

  if (!record) {
    return false
  }

  // Reset if past the reset time
  if (now > record.resetAt) {
    otpAttempts.delete(phoneNumber)
    return false
  }

  // Max 3 OTPs per hour
  return record.count >= 3
}

/**
 * Record an OTP attempt for rate limiting
 * @param phoneNumber E.164 format
 */
export function recordOTPAttempt(phoneNumber: string): void {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const record = otpAttempts.get(phoneNumber)

  if (!record || now > record.resetAt) {
    otpAttempts.set(phoneNumber, { count: 1, resetAt: now + oneHour })
  } else {
    record.count += 1
  }
}
