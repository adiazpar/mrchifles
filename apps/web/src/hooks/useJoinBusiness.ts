'use client'

import { useIntl } from 'react-intl';
import { useState, useCallback } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { apiPost, ApiError, ApiResponse } from '@/lib/api-client'
import { useApiMessage } from '@/hooks/useApiMessage'
import { hasMessageEnvelope } from '@kasero/shared/api-messages'

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
  /**
   * Called when the user dismisses the success step. Closes the modal and
   * routes to the joined/transferred business. Never called automatically —
   * Lottie success states must wait for the user to tap Done.
   */
  handleSuccessDone: () => void

  // Join state
  isJoining: boolean
  joinSuccess: boolean
}

export function useJoinBusiness(): UseJoinBusinessReturn {
  const router = useRouter()
  const t = useIntl()
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
  const [joinedBusinessId, setJoinedBusinessId] = useState<string | null>(null)

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
    setJoinedBusinessId(null)
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
            : t.formatMessage({
            id: 'joinBusiness.error_invalid_code'
          })
        )
        setIsValidating(false)
        return false
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t.formatMessage({
          id: 'joinBusiness.error_failed_to_validate'
        })
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
      setJoinedBusinessId(data.businessId ?? null)
      return true
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t.formatMessage({
          id: 'joinBusiness.error_failed_to_complete'
        })
      )
      setIsJoining(false)
      return false
    }
  }, [code, codeType, t, translateApiMessage])

  const handleSuccessDone = useCallback(() => {
    setIsOpen(false)
    if (joinedBusinessId) {
      router.push(`/${joinedBusinessId}/home`)
    }
  }, [joinedBusinessId, router])

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
    handleSuccessDone,

    // Join state
    isJoining,
    joinSuccess,
  }
}
