'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { hashPin, verifyPin } from '@/lib/auth'
import { IconCheck } from '@/components/icons'

type Step = 'verify' | 'new' | 'confirm' | 'success'

export default function ChangePinPage() {
  const router = useRouter()
  const { user, pb } = useAuth()

  const [step, setStep] = useState<Step>('verify')
  const [error, setError] = useState('')
  const [newPin, setNewPin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleVerifyCurrentPin = useCallback(async (pin: string) => {
    if (!user?.pin) {
      setError('No se encontro PIN actual')
      return
    }

    setError('')

    try {
      const isValid = await verifyPin(pin, user.pin)
      if (isValid) {
        setStep('new')
      } else {
        setError('PIN incorrecto')
      }
    } catch {
      setError('Error al verificar PIN')
    }
  }, [user])

  const handleNewPin = useCallback((pin: string) => {
    setError('')
    setNewPin(pin)
    setStep('confirm')
  }, [])

  const handleConfirmPin = useCallback(async (pin: string) => {
    if (!user) return

    setError('')

    if (pin !== newPin) {
      setError('Los PINs no coinciden')
      setNewPin('')
      setStep('new')
      return
    }

    setIsSubmitting(true)

    try {
      const pinHash = await hashPin(pin)
      await pb.collection('users').update(user.id, { pin: pinHash })
      setStep('success')
    } catch {
      setError('Error al actualizar PIN')
      setIsSubmitting(false)
    }
  }, [user, newPin, pb])

  const handleInputClear = useCallback(() => {
    // Clear error when user starts typing new PIN
    if (error) {
      setError('')
    }
  }, [error])

  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  const getStepTitle = () => {
    switch (step) {
      case 'verify':
        return 'Ingresa tu PIN actual'
      case 'new':
        return 'Ingresa tu nuevo PIN'
      case 'confirm':
        return 'Confirma tu nuevo PIN'
      case 'success':
        return 'PIN actualizado'
    }
  }

  const getStepSubtitle = () => {
    switch (step) {
      case 'verify':
        return 'Verifica tu identidad'
      case 'new':
        return '4 digitos'
      case 'confirm':
        return 'Ingresa el mismo PIN'
      case 'success':
        return 'Tu PIN ha sido cambiado exitosamente'
    }
  }

  return (
    <>
      <PageHeader title="Cambiar PIN" />

      <main className="main-content">
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
          {step === 'success' ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-success-subtle flex items-center justify-center mx-auto"
                style={{ backgroundColor: 'var(--color-success-subtle)' }}>
                <IconCheck
                  className="w-10 h-10"
                  style={{ color: 'var(--color-success)' }}
                />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold mb-2">{getStepTitle()}</h2>
                <p className="text-text-secondary">{getStepSubtitle()}</p>
              </div>
              <button
                type="button"
                onClick={handleGoBack}
                className="btn btn-primary"
              >
                Volver
              </button>
            </div>
          ) : (
            <div className="text-center space-y-8">
              <div>
                <h2 className="text-2xl font-display font-bold mb-2">{getStepTitle()}</h2>
                <p className="text-text-secondary">{getStepSubtitle()}</p>
              </div>

              <PinPad
                onComplete={
                  step === 'verify'
                    ? handleVerifyCurrentPin
                    : step === 'new'
                    ? handleNewPin
                    : handleConfirmPin
                }
                onInput={handleInputClear}
                disabled={isSubmitting}
                error={error}
              />

              {step !== 'verify' && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'confirm') {
                      setNewPin('')
                      setStep('new')
                    } else {
                      setStep('verify')
                    }
                    setError('')
                  }}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  disabled={isSubmitting}
                >
                  Volver al paso anterior
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
