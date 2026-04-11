'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiPost, ApiError, ApiResponse } from '@/lib/api-client'
import { useApiMessage } from '@/hooks/useApiMessage'
import { hasMessageEnvelope } from '@/lib/api-messages'

interface ValidateCodeResponse extends ApiResponse {
  valid?: boolean
  type?: CodeType
  business?: BusinessInfo
  role?: string
  fromUser?: FromUserInfo
}

interface JoinOrAcceptResponse extends ApiResponse {
  businessId?: string
}

interface BusinessInfo {
  id: string
  name: string
}

interface FromUserInfo {
  name: string
}

export type CodeType = 'invite' | 'transfer'

export interface UseJoinBusinessReturn {
  // Modal state
  isOpen: boolean
  handleOpen: () => void
  handleClose: () => void
  handleExitComplete: () => void

  // Code input
  code: string
  setCode: (code: string) => void

  // Validation state
  isValidating: boolean
  codeType: CodeType | null
  business: BusinessInfo | null
  role: string | null
  fromUser: FromUserInfo | null
  error: string | null

  // Actions
  handleValidateCode: () => Promise<boolean>
  handleJoinOrAccept: () => Promise<boolean>
  handleTryAgain: () => void

  // Join state
  isJoining: boolean
  joinSuccess: boolean
}

export function useJoinBusiness(): UseJoinBusinessReturn {
  const router = useRouter()
  const t = useTranslations('joinBusiness')
  const translateApiMessage = useApiMessage()

  // Modal state
  const [isOpen, setIsOpen] = useState(false)

  // Code input
  const [code, setCode] = useState('')

  // Validation state
  const [isValidating, setIsValidating] = useState(false)
  const [codeType, setCodeType] = useState<CodeType | null>(null)
  const [business, setBusiness] = useState<BusinessInfo | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [fromUser, setFromUser] = useState<FromUserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Join state
  const [isJoining, setIsJoining] = useState(false)
  const [joinSuccess, setJoinSuccess] = useState(false)

  const resetState = useCallback(() => {
    setCode('')
    setCodeType(null)
    setBusiness(null)
    setRole(null)
    setFromUser(null)
    setError(null)
    setIsValidating(false)
    setIsJoining(false)
    setJoinSuccess(false)
  }, [])

  const handleOpen = useCallback(() => {
    resetState()
    setIsOpen(true)
  }, [resetState])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleExitComplete = useCallback(() => {
    resetState()
  }, [resetState])

  const handleValidateCode = useCallback(async (): Promise<boolean> => {
    if (!code.trim()) return false

    setIsValidating(true)
    setError(null)

    try {
      const data = await apiPost<ValidateCodeResponse>('/api/invite/validate', {
        code: code.trim().toUpperCase(),
      })

      if (data.valid) {
        setCodeType(data.type ?? null)
        setBusiness(data.business ?? null)

        if (data.type === 'invite') {
          setRole(data.role ?? null)
        } else if (data.type === 'transfer') {
          setFromUser(data.fromUser ?? null)
        }

        setIsValidating(false)
        return true
      } else {
        setError(
          hasMessageEnvelope(data)
            ? translateApiMessage(data)
            : t('error_invalid_code')
        )
        setIsValidating(false)
        return false
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_validate')
      )
      setIsValidating(false)
      return false
    }
  }, [code, t, translateApiMessage])

  const handleJoinOrAccept = useCallback(async (): Promise<boolean> => {
    setIsJoining(true)
    setError(null)

    try {
      const endpoint = codeType === 'transfer'
        ? '/api/transfer/accept'
        : '/api/invite/join'

      const data = await apiPost<JoinOrAcceptResponse>(endpoint, {
        code: code.toUpperCase(),
      })

      setJoinSuccess(true)
      // Redirect to the business after a brief delay
      setTimeout(() => {
        setIsOpen(false)
        router.push(`/${data.businessId}/home`)
      }, 1500)
      return true
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_complete')
      )
      setIsJoining(false)
      return false
    }
  }, [code, codeType, router, t, translateApiMessage])

  const handleTryAgain = useCallback(() => {
    setCode('')
    setCodeType(null)
    setBusiness(null)
    setRole(null)
    setFromUser(null)
    setError(null)
  }, [])

  return {
    // Modal state
    isOpen,
    handleOpen,
    handleClose,
    handleExitComplete,

    // Code input
    code,
    setCode,

    // Validation state
    isValidating,
    codeType,
    business,
    role,
    fromUser,
    error,

    // Actions
    handleValidateCode,
    handleJoinOrAccept,
    handleTryAgain,

    // Join state
    isJoining,
    joinSuccess,
  }
}
