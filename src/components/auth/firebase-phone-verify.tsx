'use client'

import { useState, useCallback, useRef, useEffect, useId } from 'react'
import type { ConfirmationResult } from 'firebase/auth'
import { Spinner } from '@/components/ui'
import { OTPInput } from '@/components/auth/otp-input'
import {
  sendFirebaseOTP,
  verifyFirebaseOTP,
  clearRecaptcha,
  isFirebaseConfigured,
  isRateLimited,
  recordOTPAttempt,
} from '@/lib/firebase'
import { formatPhoneForDisplay } from '@/lib/countries'

// ============================================
// TYPES
// ============================================

interface FirebasePhoneVerifyProps {
  phoneNumber: string
  onVerified: (idToken: string) => void
  onBack?: () => void
  onError?: (error: string) => void
}

type VerifyStep = 'ready' | 'sending' | 'otp'

// ============================================
// COMPONENT
// ============================================

/**
 * Firebase Phone Verification Component
 *
 * Handles:
 * 1. reCAPTCHA setup (invisible)
 * 2. SMS OTP sending via Firebase
 * 3. OTP verification
 * 4. Returns Firebase ID token on success
 */
export function FirebasePhoneVerify({
  phoneNumber,
  onVerified,
  onBack,
  onError,
}: FirebasePhoneVerifyProps) {
  const [step, setStep] = useState<VerifyStep>('ready')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)

  const buttonId = useId().replace(/:/g, '-') + '-verify-btn'
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha()
    }
  }, [])

  const handleSendOTP = useCallback(async () => {
    setError('')

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      const errorMsg = 'Firebase no configurado. Contacta al administrador.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    // Check rate limit
    if (isRateLimited(phoneNumber)) {
      const errorMsg = 'Demasiados intentos. Espera una hora.'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    setStep('sending')
    setIsLoading(true)

    const result = await sendFirebaseOTP(phoneNumber, buttonId)

    if (!result.success) {
      setError(result.error || 'Error al enviar el codigo')
      setStep('ready')
      setIsLoading(false)
      onError?.(result.error || 'Error al enviar el codigo')
      return
    }

    // Record attempt for rate limiting
    recordOTPAttempt(phoneNumber)

    setConfirmationResult(result.confirmationResult || null)
    setStep('otp')
    setIsLoading(false)
  }, [phoneNumber, buttonId, onError])

  const handleVerifyOTP = useCallback(
    async (code: string) => {
      if (!confirmationResult) {
        setError('Error interno. Intenta de nuevo.')
        return
      }

      setIsLoading(true)
      setError('')

      const result = await verifyFirebaseOTP(confirmationResult, code)

      if (!result.success) {
        setError(result.error || 'Codigo incorrecto')
        setIsLoading(false)
        return
      }

      // Success - pass ID token to parent
      onVerified(result.idToken || '')
    },
    [confirmationResult, onVerified]
  )

  const handleResendOTP = useCallback(async () => {
    // Clear existing reCAPTCHA and start fresh
    clearRecaptcha()
    setConfirmationResult(null)
    setError('')
    await handleSendOTP()
  }, [handleSendOTP])

  // Ready state - show send button
  if (step === 'ready') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-text-secondary mb-2">
            Te enviaremos un codigo de verificacion por SMS a:
          </p>
          <p className="font-medium text-text-primary">
            {formatPhoneForDisplay(phoneNumber)}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          onClick={handleSendOTP}
          disabled={isLoading}
          className="btn btn-primary btn-lg w-full"
        >
          {isLoading ? (
            <>
              <Spinner />
              <span>Enviando...</span>
            </>
          ) : (
            'Enviar codigo SMS'
          )}
        </button>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-brand hover:underline text-sm w-full text-center"
          >
            Cambiar numero
          </button>
        )}
      </div>
    )
  }

  // Sending state
  if (step === 'sending') {
    return (
      <div className="flex flex-col items-center py-8">
        <Spinner className="spinner-lg" />
        <p className="text-text-secondary mt-4">Enviando codigo SMS...</p>
        {/* Hidden button for reCAPTCHA */}
        <button
          ref={buttonRef}
          id={buttonId}
          type="button"
          className="hidden"
          aria-hidden="true"
        />
      </div>
    )
  }

  // OTP verification state
  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-bold mb-1">Verifica tu numero</h2>
        <p className="text-sm text-text-tertiary">
          Ingresa el codigo SMS enviado a {formatPhoneForDisplay(phoneNumber)}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg text-center">
          {error}
        </div>
      )}

      <OTPInput
        onComplete={handleVerifyOTP}
        error={error}
        disabled={isLoading}
      />

      <div className="mt-6 text-center space-y-2">
        <button
          type="button"
          onClick={handleResendOTP}
          disabled={isLoading}
          className="text-brand hover:underline text-sm"
        >
          {isLoading ? 'Verificando...' : 'Reenviar codigo'}
        </button>
        {onBack && (
          <>
            <br />
            <button
              type="button"
              onClick={onBack}
              className="text-text-tertiary hover:underline text-sm"
            >
              Cambiar numero
            </button>
          </>
        )}
      </div>

      {/* Hidden button for reCAPTCHA */}
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
