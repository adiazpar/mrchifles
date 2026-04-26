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
    targetStep,
    phase,
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

  const isCurrentStep = _index === currentStep
  const isTargetStep = _index === targetStep
  const isExiting = isCurrentStep && phase === 'exiting'
  const isEntering = isCurrentStep && phase === 'entering'

  // FIX: Proper visibility during transitions
  // - During idle: only current step is visible
  // - During exiting: current step visible (fading out)
  // - During transitioning: target step visible (for height measurement), current hidden
  // - During entering: current step visible (fading in) - note: currentStep has updated to target
  const getVisibility = () => {
    if (phase === 'idle') {
      return isCurrentStep
    }
    if (phase === 'exiting') {
      // Old step is still visible (fading out)
      return isCurrentStep
    }
    if (phase === 'transitioning') {
      // Key fix: Show TARGET step (expanding), hide current step (collapsing)
      return isTargetStep
    }
    if (phase === 'entering') {
      // currentStep has been updated to target, show it
      return isCurrentStep
    }
    return isCurrentStep
  }

  const isVisible = getVisibility()

  // Animation classes — direction-agnostic opacity-only fade. The drawer is a
  // fixed-height surface; old direction-aware translate animations are gone.
  const getContentClass = () => {
    if (isExiting) return 'morph-content-exit'
    if (isEntering) return 'morph-content-enter'
    return ''
  }

  // Hide content during transitioning phase (content faded out, height animating)
  const hideContent = phase === 'transitioning'

  return (
    <div
      className={`morph-panel ${isVisible ? 'morph-panel-visible' : 'morph-panel-hidden'} ${className || ''}`}
      data-step-index={_index}
      data-step-title={title}
    >
      <div className="morph-panel-inner">
        <div
          className={`morph-content ${getContentClass()}`}
          style={{ opacity: hideContent ? 0 : undefined }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
