'use client'

import { useState, useCallback } from 'react'
import { PhoneInput } from '@/components/auth/phone-input'
import { Spinner } from '@/components/ui'
import { IconCheck } from '@/components/icons'
import { isValidE164 } from '@/lib/countries'
import { useAuth } from '@/contexts/auth-context'
import type { InviteRole } from '@/types'

interface DirectInviteFormProps {
  code: string
  role: InviteRole
}

/**
 * Form to send invite directly via WhatsApp API
 */
export function DirectInviteForm({ code, role }: DirectInviteFormProps) {
  const { pb } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setSuccess(false)

      // Validate phone
      if (!phoneNumber || !isValidE164(phoneNumber)) {
        setError('Ingresa un numero de telefono valido')
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch('/api/invite/send-whatsapp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${pb.authStore.token}`,
          },
          body: JSON.stringify({
            phoneNumber,
            inviteCode: code,
            role,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Error al enviar la invitacion')
          return
        }

        setSuccess(true)
        // Reset after success
        setTimeout(() => {
          setPhoneNumber('')
          setSuccess(false)
        }, 3000)
      } catch {
        setError('Error de conexion. Intenta de nuevo.')
      } finally {
        setIsLoading(false)
      }
    },
    [phoneNumber, code, role, pb.authStore.token]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-text-secondary mb-2">
        Enviar invitacion por WhatsApp
      </div>

      <PhoneInput
        value={phoneNumber}
        onChange={setPhoneNumber}
        error={error}
        disabled={isLoading || success}
      />

      <button
        type="submit"
        disabled={isLoading || success || !phoneNumber}
        className="btn btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Spinner />
            <span>Enviando...</span>
          </>
        ) : success ? (
          <>
            <IconCheck className="w-4 h-4" />
            <span>Enviado</span>
          </>
        ) : (
          <span>Enviar por WhatsApp</span>
        )}
      </button>
    </form>
  )
}
