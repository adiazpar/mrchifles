'use client'

import { useIntl } from 'react-intl';
import { useState, useEffect, useCallback } from 'react'
import { Crown, Building2 } from 'lucide-react'
import { ModalShell, Spinner } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import type { UseJoinBusinessReturn, CodeType } from '@/hooks'

type JoinStep = 'code' | 'preview' | 'success'

interface JoinBusinessModalProps {
  joinBusiness: UseJoinBusinessReturn
}

export function JoinBusinessModal({ joinBusiness }: JoinBusinessModalProps) {
  const t = useIntl()

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

  const [step, setStep] = useState<JoinStep>('code')

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setStep('code'), 250)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleValidate = useCallback(async () => {
    const success = await handleValidateCode()
    if (success) {
      setStep('preview')
    }
  }, [handleValidateCode])

  const handleJoin = useCallback(async () => {
    const success = await handleJoinOrAccept()
    if (success) {
      setStep('success')
    }
  }, [handleJoinOrAccept])

  const onClose = useCallback(() => {
    handleClose()
    handleExitComplete()
  }, [handleClose, handleExitComplete])

  const onBack = step === 'preview' ? () => setStep('code') : undefined

  const title =
    step === 'code'
      ? t.formatMessage({ id: 'joinBusiness.modal_title' })
      : step === 'preview'
        ? codeType === 'transfer'
          ? t.formatMessage({ id: 'joinBusiness.accept_ownership_title' })
          : t.formatMessage({ id: 'joinBusiness.join_business_title' })
        : codeType === 'transfer'
          ? t.formatMessage({ id: 'joinBusiness.success_transfer_title' })
          : t.formatMessage({ id: 'joinBusiness.success_join_title' })

  const footer =
    step === 'code' ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary flex-1"
          disabled={isValidating}
        >
          {t.formatMessage({ id: 'common.cancel' })}
        </button>
        <button
          type="button"
          onClick={handleValidate}
          disabled={code.length < 6 || isValidating}
          className="btn btn-primary flex-1"
        >
          {isValidating ? <Spinner size="sm" /> : t.formatMessage({ id: 'common.continue' })}
        </button>
      </>
    ) : step === 'preview' ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary flex-1"
          disabled={isJoining}
        >
          {codeType === 'transfer'
            ? t.formatMessage({ id: 'joinBusiness.button_decline' })
            : t.formatMessage({ id: 'common.cancel' })}
        </button>
        <button
          type="button"
          onClick={handleJoin}
          disabled={isJoining}
          className="btn btn-primary flex-1"
        >
          {isJoining ? (
            <Spinner size="sm" />
          ) : codeType === 'transfer' ? (
            t.formatMessage({ id: 'joinBusiness.button_accept_transfer' })
          ) : (
            t.formatMessage({ id: 'joinBusiness.button_join_business' })
          )}
        </button>
      </>
    ) : undefined

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onBack={onBack}
      footer={footer}
    >
      {step === 'code' && (
        <CodeInputContent
          code={code}
          setCode={setCode}
          isValidating={isValidating}
          error={error}
          onValidate={handleValidateCode}
          onTryAgain={handleTryAgain}
        />
      )}
      {step === 'preview' && (
        <PreviewContent
          codeType={codeType}
          business={business}
          role={role}
          fromUser={fromUser}
          isJoining={isJoining}
        />
      )}
      {step === 'success' && (
        <div className="modal-step--centered">
          <SuccessContent
            codeType={codeType}
            business={business}
            joinSuccess={joinSuccess}
          />
        </div>
      )}
    </ModalShell>
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
  const t = useIntl()

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-text-secondary text-center">
        {t.formatMessage({ id: 'joinBusiness.code_input_subtitle' })}
      </p>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={t.formatMessage({ id: 'joinBusiness.code_placeholder' })}
        maxLength={6}
        className="input text-center text-2xl tracking-widest font-mono"
        autoComplete="off"
        autoCapitalize="characters"
        disabled={isValidating}
      />
      {error && (
        <div className="p-3 bg-error-subtle text-error text-sm rounded-lg text-center">
          {error}
          <button
            type="button"
            onClick={onTryAgain}
            className="block w-full mt-2 text-error font-medium underline"
          >
            {t.formatMessage({ id: 'joinBusiness.try_again' })}
          </button>
        </div>
      )}
      {isValidating && (
        <div className="flex items-center justify-center gap-2 text-text-secondary">
          <Spinner size="sm" />
          <span className="text-sm">{t.formatMessage({ id: 'joinBusiness.validating_code' })}</span>
        </div>
      )}
    </div>
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
  const t = useIntl()

  const formatRole = (r: string) => {
    if (r === 'partner') return t.formatMessage({ id: 'joinBusiness.role_partner' })
    if (r === 'employee') return t.formatMessage({ id: 'joinBusiness.role_employee' })
    return r
  }

  if (isJoining) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 p-4">
        <Spinner size="lg" />
        <p className="text-text-secondary">
          {codeType === 'transfer'
            ? t.formatMessage({ id: 'joinBusiness.accepting_transfer' })
            : t.formatMessage({ id: 'joinBusiness.joining_business' })}
        </p>
      </div>
    )
  }

  if (codeType === 'transfer' && business) {
    return (
      <div className="flex flex-col items-center text-center py-4 p-4">
        <div className="w-16 h-16 rounded-2xl bg-warning-subtle text-warning flex items-center justify-center mb-4">
          <Crown className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">{business.name}</h3>
        <p className="text-sm text-text-secondary mt-2">
          <strong>{fromUser?.name || t.formatMessage({ id: 'joinBusiness.transfer_owner_fallback' })}</strong>{' '}
          {t.formatMessage({ id: 'joinBusiness.transfer_wants_to_transfer' })}
        </p>
        <p className="text-xs text-text-tertiary mt-2">
          {t.formatMessage({ id: 'joinBusiness.transfer_you_will_become_owner' })}
        </p>
      </div>
    )
  }

  if (codeType === 'invite' && business) {
    return (
      <div className="flex flex-col items-center text-center py-4 p-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-subtle text-brand flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">{business.name}</h3>
        <p className="text-sm text-text-secondary mt-2">
          {t.formatMessage({ id: 'joinBusiness.invite_you_will_join_as' })}{' '}
          <strong>{formatRole(role || '')}</strong>
        </p>
      </div>
    )
  }

  return null
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
  const t = useIntl()
  const businessName = business?.name || 'the business'

  return (
    <div className="flex flex-col items-center text-center py-4 p-4">
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
        {codeType === 'transfer'
          ? t.formatMessage({ id: 'joinBusiness.success_transfer_heading' })
          : t.formatMessage({ id: 'joinBusiness.success_join_heading' })}
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
        style={{ opacity: joinSuccess ? 1 : 0 }}
      >
        {codeType === 'transfer'
          ? t.formatMessage({ id: 'joinBusiness.success_transfer_description' }, { name: businessName })
          : t.formatMessage({ id: 'joinBusiness.success_join_description' }, { name: businessName })}
      </p>
      <p
        className="text-xs text-text-tertiary mt-3 transition-opacity duration-500 delay-300"
        style={{ opacity: joinSuccess ? 1 : 0 }}
      >
        {t.formatMessage({ id: 'joinBusiness.redirecting' })}
      </p>
    </div>
  )
}
