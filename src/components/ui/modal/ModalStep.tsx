// src/components/ui/modal/ModalStep.tsx
'use client'

import { useEffect } from 'react'
import { useModalContext } from './ModalContext'
import type { ModalStepProps } from './types'

interface InternalStepProps extends ModalStepProps {
  _index?: number // Optional - injected by Modal parent
}

export function ModalStep({ children, title, hideBackButton = false, backStep, onBackStep, className, _index = 0 }: InternalStepProps) {
  const {
    currentStep,
    _registerStep,
    _unregisterStep,
    _setCurrentStepHideBackButton,
    _setCurrentStepBackStep,
    _setCurrentStepOnBackStep,
  } = useModalContext()

  // Register this step on mount
  useEffect(() => {
    _registerStep(_index)
    return () => _unregisterStep(_index)
  }, [_index, _registerStep, _unregisterStep])

  // Report hideBackButton, backStep, and onBackStep when this step becomes current
  useEffect(() => {
    if (_index === currentStep) {
      _setCurrentStepHideBackButton(hideBackButton)
      _setCurrentStepBackStep(backStep)
      _setCurrentStepOnBackStep(onBackStep)
    }
  }, [_index, currentStep, hideBackButton, backStep, onBackStep, _setCurrentStepHideBackButton, _setCurrentStepBackStep, _setCurrentStepOnBackStep])

  // Step swaps are instant — no fades, no transitioning-phase visibility
  // gymnastics. With TIMING set to 0 the phase machine ticks through
  // synchronously and currentStep updates immediately.
  const isVisible = _index === currentStep

  return (
    <div
      className={`modal-step ${isVisible ? 'modal-step-visible' : 'modal-step-hidden'} ${className || ''}`}
      data-step-index={_index}
      data-step-title={title}
    >
      <div className="modal-step-inner">
        <div className="modal-step-content">
          {children}
        </div>
      </div>
    </div>
  )
}
