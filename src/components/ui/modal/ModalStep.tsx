// src/components/ui/modal/ModalStep.tsx
'use client'

import { useEffect } from 'react'
import { useModalContext } from './ModalContext'
import type { ModalStepProps } from './types'

interface InternalStepProps extends ModalStepProps {
  _index: number
}

export function ModalStep({ children, title, _index }: InternalStepProps) {
  const { currentStep, phase, direction, _registerStep, _unregisterStep } = useModalContext()

  // Register this step on mount
  useEffect(() => {
    _registerStep(_index)
    return () => _unregisterStep(_index)
  }, [_index, _registerStep, _unregisterStep])

  const isCurrentStep = _index === currentStep
  const isExiting = isCurrentStep && phase === 'exiting'
  const isEntering = isCurrentStep && phase === 'entering'

  // Determine visibility for height animation
  const isVisible = isCurrentStep || phase === 'transitioning'

  // Animation classes based on direction
  const getContentClass = () => {
    if (isExiting) {
      return direction === 'forward' ? 'morph-content-exit' : 'morph-content-exit-back'
    }
    if (isEntering) {
      return direction === 'forward' ? 'morph-content-enter' : 'morph-content-enter-back'
    }
    return ''
  }

  // Hide during transitioning phase (content faded out, height animating)
  const hideContent = phase === 'transitioning' && isCurrentStep

  return (
    <div
      className={`morph-panel ${isVisible ? 'morph-panel-visible' : 'morph-panel-hidden'}`}
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
