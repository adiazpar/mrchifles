// src/components/ui/modal/ModalButtons.tsx
'use client'

import { useIntl } from 'react-intl';
import { useModalContext, useModal } from './ModalContext'
import type { ModalButtonProps } from './types'

export function ModalBackButton({ children, className = '', disabled, onClick }: ModalButtonProps) {
  const t = useIntl()
  const ctx = useModalContext()
  const { goBack, goToStep, isLocked, isTransitioning, isFirstStep, _currentStepBackStep } = ctx

  const handleClick = () => {
    onClick?.()
    // Respect the step's backStep prop if defined
    if (_currentStepBackStep !== undefined) {
      goToStep(_currentStepBackStep)
    } else {
      goBack()
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-secondary flex-1 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning || isFirstStep}
    >
      {children || t.formatMessage({
        id: 'common.back'
      })}
    </button>
  );
}

export function ModalNextButton({ children, className = '', disabled, onClick }: ModalButtonProps) {
  const t = useIntl()
  const { goNext, isLocked, isTransitioning, isLastStep } = useModal()

  const handleClick = () => {
    onClick?.()
    goNext()
  }

  return (
    <button
      type="button"
      className={`btn btn-primary flex-1 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning || isLastStep}
    >
      {children || t.formatMessage({
        id: 'common.next'
      })}
    </button>
  );
}

interface GoToStepButtonProps extends ModalButtonProps {
  step: number
  title?: string
}

export function ModalGoToStepButton({ children, className = '', disabled, step, onClick, title }: GoToStepButtonProps) {
  const { goToStep, isLocked, isTransitioning } = useModal()

  const handleClick = () => {
    onClick?.()
    goToStep(step)
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning}
      title={title}
    >
      {children}
    </button>
  )
}

interface CancelBackButtonProps extends ModalButtonProps {
  onCancel?: () => void
}

export function ModalCancelBackButton({
  children,
  className = '',
  disabled,
  onCancel,
  onClick,
}: CancelBackButtonProps) {
  const t = useIntl()
  const ctx = useModalContext()
  const { goBack, goToStep, isLocked, isTransitioning, isFirstStep, _currentStepBackStep, _currentStepOnBackStep } = ctx

  const handleClick = () => {
    if (isFirstStep) {
      if (onCancel) {
        onCancel()
      } else {
        ctx._onClose()
      }
    } else {
      // Call the step's onBackStep callback before navigating (e.g., to cancel operations)
      _currentStepOnBackStep?.()
      // Also call onClick if provided (for backwards compatibility)
      onClick?.()

      // Respect the step's backStep prop if defined
      if (_currentStepBackStep !== undefined) {
        goToStep(_currentStepBackStep)
      } else {
        goBack()
      }
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-secondary flex-1 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning}
    >
      {children || (isFirstStep ? t.formatMessage({
        id: 'common.cancel'
      }) : t.formatMessage({
        id: 'common.back'
      }))}
    </button>
  );
}
