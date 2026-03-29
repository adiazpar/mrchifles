'use client'

import { useCallback } from 'react'
import { Building2, Crown } from 'lucide-react'
import { Modal, Spinner, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import type { UseJoinBusinessReturn, CodeType } from '@/hooks'

interface JoinBusinessModalProps {
  joinBusiness: UseJoinBusinessReturn
}

export function JoinBusinessModal({ joinBusiness }: JoinBusinessModalProps) {
  const {
    isOpen,
    handleClose,
    handleExitComplete,
    code,
    setCode,
    isValidating,
    codeType,
    business,
    role,
    fromUser,
    error,
    handleValidateCode,
    handleJoinOrAccept,
    handleTryAgain,
    isJoining,
    joinSuccess,
  } = joinBusiness

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onExitComplete={handleExitComplete}
    >
      {/* Step 0: Code Input */}
      <Modal.Step title="Join a Business" hideBackButton>
        <CodeInputContent
          code={code}
          setCode={setCode}
          isValidating={isValidating}
          error={error}
          onValidate={handleValidateCode}
          onTryAgain={handleTryAgain}
        />
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary flex-1"
            disabled={isValidating}
          >
            Cancel
          </button>
          <ValidateButton
            code={code}
            isValidating={isValidating}
            onValidate={handleValidateCode}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Preview */}
      <Modal.Step title={codeType === 'transfer' ? 'Accept Ownership' : 'Join Business'}>
        <PreviewContent
          codeType={codeType}
          business={business}
          role={role}
          fromUser={fromUser}
          isJoining={isJoining}
        />
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary flex-1"
            disabled={isJoining}
          >
            {codeType === 'transfer' ? 'Decline' : 'Cancel'}
          </button>
          <JoinButton
            codeType={codeType}
            isJoining={isJoining}
            onJoin={handleJoinOrAccept}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Success */}
      <Modal.Step title={codeType === 'transfer' ? 'Transfer Accepted' : 'Welcome!'} hideBackButton>
        <Modal.Item>
          <SuccessContent
            codeType={codeType}
            business={business}
            joinSuccess={joinSuccess}
          />
        </Modal.Item>
      </Modal.Step>
    </Modal>
  )
}

// ============================================
// CODE INPUT CONTENT
// ============================================

interface CodeInputContentProps {
  code: string
  setCode: (code: string) => void
  isValidating: boolean
  error: string | null
  onValidate: () => Promise<boolean>
  onTryAgain: () => void
}

function CodeInputContent({
  code,
  setCode,
  isValidating,
  error,
  onTryAgain,
}: CodeInputContentProps) {
  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary text-center">
          Enter the 6-character code to join a business or accept ownership
        </p>
      </Modal.Item>
      <Modal.Item>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          className="input text-center text-2xl tracking-widest font-mono"
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          disabled={isValidating}
        />
      </Modal.Item>
      {error && (
        <Modal.Item>
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg text-center">
            {error}
            <button
              type="button"
              onClick={onTryAgain}
              className="block w-full mt-2 text-error font-medium underline"
            >
              Try again
            </button>
          </div>
        </Modal.Item>
      )}
      {isValidating && (
        <Modal.Item>
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <Spinner size="sm" />
            <span className="text-sm">Validating code...</span>
          </div>
        </Modal.Item>
      )}
    </>
  )
}

// ============================================
// VALIDATE BUTTON
// ============================================

interface ValidateButtonProps {
  code: string
  isValidating: boolean
  onValidate: () => Promise<boolean>
}

function ValidateButton({ code, isValidating, onValidate }: ValidateButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleClick = useCallback(async () => {
    const success = await onValidate()
    if (success) {
      goToStep(1)
    }
  }, [onValidate, goToStep])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={code.length < 6 || isValidating}
      className="btn btn-primary flex-1"
    >
      {isValidating ? <Spinner size="sm" /> : 'Continue'}
    </button>
  )
}

// ============================================
// PREVIEW CONTENT
// ============================================

interface PreviewContentProps {
  codeType: CodeType | null
  business: { id: string; name: string } | null
  role: string | null
  fromUser: { name: string } | null
  isJoining: boolean
}

function PreviewContent({ codeType, business, role, fromUser, isJoining }: PreviewContentProps) {
  const formatRole = (r: string) => {
    if (r === 'partner') return 'Partner'
    if (r === 'employee') return 'Employee'
    return r
  }

  if (isJoining) {
    return (
      <Modal.Item>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Spinner size="lg" />
          <p className="text-text-secondary">
            {codeType === 'transfer' ? 'Accepting transfer...' : 'Joining business...'}
          </p>
        </div>
      </Modal.Item>
    )
  }

  if (codeType === 'transfer' && business) {
    return (
      <>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-warning-subtle text-warning flex items-center justify-center mb-4">
              <Crown className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{business.name}</h3>
            <p className="text-sm text-text-secondary mt-2">
              <strong>{fromUser?.name || 'The current owner'}</strong> wants to transfer ownership of this business to you.
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              You will become the new owner.
            </p>
          </div>
        </Modal.Item>
      </>
    )
  }

  if (codeType === 'invite' && business) {
    return (
      <>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-subtle text-brand flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{business.name}</h3>
            <p className="text-sm text-text-secondary mt-2">
              You will join as: <strong>{formatRole(role || '')}</strong>
            </p>
          </div>
        </Modal.Item>
      </>
    )
  }

  return null
}

// ============================================
// JOIN BUTTON
// ============================================

interface JoinButtonProps {
  codeType: CodeType | null
  isJoining: boolean
  onJoin: () => Promise<boolean>
}

function JoinButton({ codeType, isJoining, onJoin }: JoinButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleClick = useCallback(async () => {
    const success = await onJoin()
    if (success) {
      goToStep(2)
    }
  }, [onJoin, goToStep])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isJoining}
      className="btn btn-primary flex-1"
    >
      {isJoining ? (
        <Spinner size="sm" />
      ) : codeType === 'transfer' ? (
        'Accept Transfer'
      ) : (
        'Join Business'
      )}
    </button>
  )
}

// ============================================
// SUCCESS CONTENT
// ============================================

interface SuccessContentProps {
  codeType: CodeType | null
  business: { id: string; name: string } | null
  joinSuccess: boolean
}

function SuccessContent({ codeType, business, joinSuccess }: SuccessContentProps) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div style={{ width: 160, height: 160 }}>
        {joinSuccess && (
          <LottiePlayer
            src="/animations/success.json"
            loop={false}
            autoplay={true}
            delay={500}
            style={{ width: 160, height: 160 }}
          />
        )}
      </div>
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
        style={{ opacity: joinSuccess ? 1 : 0 }}
      >
        {codeType === 'transfer' ? 'Transfer Accepted!' : 'Welcome!'}
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
        style={{ opacity: joinSuccess ? 1 : 0 }}
      >
        {codeType === 'transfer'
          ? `You are now the owner of ${business?.name || 'the business'}`
          : `You have joined ${business?.name || 'the business'}`
        }
      </p>
      <p
        className="text-xs text-text-tertiary mt-3 transition-opacity duration-500 delay-300"
        style={{ opacity: joinSuccess ? 1 : 0 }}
      >
        Redirecting...
      </p>
    </div>
  )
}
