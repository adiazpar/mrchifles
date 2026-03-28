'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, UserPlus, AlertCircle, CheckCircle2, Crown } from 'lucide-react'
import { Spinner } from '@/components/ui'

interface BusinessInfo {
  id: string
  name: string
}

interface FromUserInfo {
  name: string
}

type CodeType = 'invite' | 'transfer'
type JoinState = 'input' | 'validating' | 'preview' | 'joining' | 'success' | 'error'

/**
 * Join page - allows authenticated users to join a business using a code.
 * Handles both invite codes (join as employee/partner) and transfer codes (accept ownership).
 * Supports QR code flow: /join?code=ABC123
 */
export default function JoinPage() {
  return (
    <Suspense fallback={<JoinPageLoading />}>
      <JoinPageContent />
    </Suspense>
  )
}

function JoinPageLoading() {
  return (
    <main className="page-loading">
      <Spinner className="spinner-lg" />
    </main>
  )
}

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCode = searchParams.get('code') || ''

  const [code, setCode] = useState(initialCode)
  const [state, setState] = useState<JoinState>(initialCode ? 'validating' : 'input')
  const [codeType, setCodeType] = useState<CodeType | null>(null)
  const [business, setBusiness] = useState<BusinessInfo | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [fromUser, setFromUser] = useState<FromUserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateCode = async (codeToValidate: string) => {
    setState('validating')
    setError(null)

    try {
      const res = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToValidate }),
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

        setState('preview')
      } else {
        setError(data.error || 'Invalid code')
        setState('error')
      }
    } catch {
      setError('Failed to validate code')
      setState('error')
    }
  }

  // Auto-validate if code is in URL (runs once on mount)
  useEffect(() => {
    if (initialCode) {
      validateCode(initialCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      validateCode(code.trim().toUpperCase())
    }
  }

  const handleJoinOrAccept = async () => {
    setState('joining')
    setError(null)

    try {
      // Use different endpoint based on code type
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
        setState('success')
        // Redirect to the business after a brief delay
        setTimeout(() => {
          router.push(`/${data.businessId}/home`)
        }, 1500)
      } else {
        setError(data.error || 'Failed to complete action')
        setState('error')
      }
    } catch {
      setError('Failed to complete action')
      setState('error')
    }
  }

  const handleTryAgain = () => {
    setCode('')
    setCodeType(null)
    setBusiness(null)
    setRole(null)
    setFromUser(null)
    setError(null)
    setState('input')
  }

  const handleCancel = () => {
    router.push('/')
  }

  const formatRole = (r: string) => {
    if (r === 'partner') return 'Partner'
    if (r === 'employee') return 'Employee'
    return r
  }

  return (
    <main className="page-loading">
      <div className="join-container">
        {/* Input State */}
        {state === 'input' && (
          <form onSubmit={handleSubmitCode} className="join-form">
            <div className="join-icon">
              <UserPlus className="w-12 h-12 text-brand" />
            </div>
            <h2 className="join-title">Join a Business</h2>
            <p className="join-description">
              Enter the 6-character code to join a business or accept ownership
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="join-input"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
            />
            <div className="join-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={code.length < 6}
                className="btn btn-primary flex-1"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Validating State */}
        {state === 'validating' && (
          <div className="join-loading">
            <Spinner className="spinner-lg" />
            <p className="join-loading-text">Validating code...</p>
          </div>
        )}

        {/* Preview State - Invite */}
        {state === 'preview' && codeType === 'invite' && business && (
          <div className="join-preview">
            <div className="join-business-card">
              <div className="join-business-icon">
                <Building2 className="w-8 h-8" />
              </div>
              <h2 className="join-business-name">{business.name}</h2>
              <p className="join-business-role">
                You will join as: <strong>{formatRole(role || '')}</strong>
              </p>
            </div>
            <div className="join-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleJoinOrAccept}
                className="btn btn-primary flex-1"
              >
                Join Business
              </button>
            </div>
          </div>
        )}

        {/* Preview State - Transfer */}
        {state === 'preview' && codeType === 'transfer' && business && (
          <div className="join-preview">
            <div className="join-business-card join-business-card--transfer">
              <div className="join-business-icon join-business-icon--transfer">
                <Crown className="w-8 h-8" />
              </div>
              <h2 className="join-business-name">{business.name}</h2>
              <p className="join-transfer-info">
                <strong>{fromUser?.name || 'The current owner'}</strong> wants to transfer ownership of this business to you.
              </p>
              <p className="join-transfer-note">
                You will become the new owner.
              </p>
            </div>
            <div className="join-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary flex-1"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleJoinOrAccept}
                className="btn btn-primary flex-1"
              >
                Accept Transfer
              </button>
            </div>
          </div>
        )}

        {/* Joining State */}
        {state === 'joining' && (
          <div className="join-loading">
            <Spinner className="spinner-lg" />
            <p className="join-loading-text">
              {codeType === 'transfer' ? 'Accepting transfer...' : 'Joining business...'}
            </p>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && business && (
          <div className="join-success">
            <div className="join-success-icon">
              <CheckCircle2 className="w-16 h-16 text-success" />
            </div>
            <h2 className="join-title">
              {codeType === 'transfer' ? 'Transfer Accepted!' : 'Welcome!'}
            </h2>
            <p className="join-description">
              {codeType === 'transfer'
                ? `You are now the owner of ${business.name}. The current owner will need to confirm the transfer.`
                : `You have joined ${business.name}`
              }
            </p>
            <p className="join-redirect-text">Redirecting...</p>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="join-error">
            <div className="join-error-icon">
              <AlertCircle className="w-16 h-16 text-error" />
            </div>
            <h2 className="join-title">Unable to Continue</h2>
            <p className="join-description">{error}</p>
            <div className="join-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary flex-1"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleTryAgain}
                className="btn btn-primary flex-1"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
