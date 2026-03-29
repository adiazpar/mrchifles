'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
      const res = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (data.valid) {
        setCodeType(data.type)
        setBusiness(data.business)

        if (data.type === 'invite') {
          setRole(data.role)
        } else if (data.type === 'transfer') {
          setFromUser(data.fromUser)
        }

        setIsValidating(false)
        return true
      } else {
        setError(data.error || 'Invalid code')
        setIsValidating(false)
        return false
      }
    } catch {
      setError('Failed to validate code')
      setIsValidating(false)
      return false
    }
  }, [code])

  const handleJoinOrAccept = useCallback(async (): Promise<boolean> => {
    setIsJoining(true)
    setError(null)

    try {
      const endpoint = codeType === 'transfer'
        ? '/api/transfer/accept'
        : '/api/invite/join'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      })

      const data = await res.json()

      if (data.success) {
        setJoinSuccess(true)
        // Redirect to the business after a brief delay
        setTimeout(() => {
          setIsOpen(false)
          router.push(`/${data.businessId}/home`)
        }, 1500)
        return true
      } else {
        setError(data.error || 'Failed to complete action')
        setIsJoining(false)
        return false
      }
    } catch {
      setError('Failed to complete action')
      setIsJoining(false)
      return false
    }
  }, [code, codeType, router])

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
