'use client'

import { useCallback } from 'react'
import { Crown, Building2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Modal, Spinner, useModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import type { UseJoinBusinessReturn, CodeType } from '@/hooks'

interface JoinBusinessModalProps {
  joinBusiness: UseJoinBusinessReturn
}

export function JoinBusinessModal({ joinBusiness }: JoinBusinessModalProps) {
  const t = useTranslations('joinBusiness')
  const tCommon = useTranslations('common')

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
      <Modal.Step title={t('modal_title')} hideBackButton>
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
            {tCommon('cancel')}
          </button>
          <ValidateButton
            code={code}
            isValidating={isValidating}
            onValidate={handleValidateCode}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Preview */}
      <Modal.Step title={codeType === 'transfer' ? t('accept_ownership_title') : t('join_business_title')}>
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
            {codeType === 'transfer' ? t('button_decline') : tCommon('cancel')}
          </button>
          <JoinButton
            codeType={codeType}
            isJoining={isJoining}
            onJoin={handleJoinOrAccept}
          />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Success */}
      <Modal.Step title={codeType === 'transfer' ? t('success_transfer_title') : t('success_join_title')} hideBackButton>
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
  const t = useTranslations('joinBusiness')

  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary text-center">
          {t('code_input_subtitle')}
        </p>
      </Modal.Item>
      <Modal.Item>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('code_placeholder')}
          maxLength={6}
          className="input text-center text-2xl tracking-widest font-mono"
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
              {t('try_again')}
            </button>
          </div>
        </Modal.Item>
      )}
      {isValidating && (
        <Modal.Item>
          <div className="flex items-center justify-center gap-2 text-text-secondary">
            <Spinner size="sm" />
            <span className="text-sm">{t('validating_code')}</span>
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
  const { goToStep } = useModal()
  const tCommon = useTranslations('common')

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
      {isValidating ? <Spinner size="sm" /> : tCommon('continue')}
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
  const t = useTranslations('joinBusiness')

  const formatRole = (r: string) => {
    if (r === 'partner') return t('role_partner')
    if (r === 'employee') return t('role_employee')
    return r
  }

  if (isJoining) {
    return (
      <Modal.Item>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Spinner size="lg" />
          <p className="text-text-secondary">
            {codeType === 'transfer' ? t('accepting_transfer') : t('joining_business')}
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
              <strong>{fromUser?.name || t('transfer_owner_fallback')}</strong>{' '}
              {t('transfer_wants_to_transfer')}
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              {t('transfer_you_will_become_owner')}
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
              {t('invite_you_will_join_as')} <strong>{formatRole(role || '')}</strong>
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
  const { goToStep } = useModal()
  const t = useTranslations('joinBusiness')

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
        t('button_accept_transfer')
      ) : (
        t('button_join_business')
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
  const t = useTranslations('joinBusiness')
  const businessName = business?.name || 'the business'

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
        {codeType === 'transfer' ? t('success_transfer_heading') : t('success_join_heading')}
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
        style={{ opacity: joinSuccess ? 1 : 0 }}
      >
        {codeType === 'transfer'
          ? t('success_transfer_description', { name: businessName })
          : t('success_join_description', { name: businessName })
        }
      </p>
      <p
        className="text-xs text-text-tertiary mt-3 transition-opacity duration-500 delay-300"
        style={{ opacity: joinSuccess ? 1 : 0 }}
      >
        {t('redirecting')}
      </p>
    </div>
  )
}
