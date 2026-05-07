// src/components/ui/modal/types.ts
import { ReactNode } from 'react'

// Phase state machine
export type Phase = 'idle' | 'exiting' | 'transitioning' | 'entering'
export type Direction = 'forward' | 'backward'

// Step transitions inside the bottom drawer are instant — no fade, no
// stagger, no height tween. The phase machine still ticks (idle → exiting
// → transitioning → entering → idle) for backward compatibility with any
// consumer that subscribes to phase / isTransitioning, but each tick
// resolves on the next microtask so currentStep updates immediately.
export const TIMING = {
  STAGGER_DELAY: 0,
  EXIT_DURATION: 0,
  ENTER_DURATION: 0,
  HEIGHT_TRANSITION: 0,
} as const

// Internal state
export interface ModalState {
  currentStep: number
  targetStep: number
  phase: Phase
  direction: Direction
  isLocked: boolean
  stepCount: number
}

// Context value exposed to consumers
export interface ModalContextValue {
  // State
  currentStep: number
  targetStep: number
  stepCount: number
  isFirstStep: boolean
  isLastStep: boolean
  isLocked: boolean
  isTransitioning: boolean
  phase: Phase
  direction: Direction

  // Navigation
  goNext: () => void
  goBack: () => void
  goToStep: (step: number) => void

  // Lock control
  lock: () => void
  unlock: () => void

  // Internal (used by sub-components)
  _registerStep: (index: number) => void
  _unregisterStep: (index: number) => void
  _onClose: () => void
  _initialStep: number
  _currentStepHideBackButton: boolean
  _setCurrentStepHideBackButton: (hide: boolean) => void
  _currentStepBackStep: number | undefined
  _setCurrentStepBackStep: (step: number | undefined) => void
  _currentStepOnBackStep: (() => void) | undefined
  _setCurrentStepOnBackStep: (callback: (() => void) | undefined) => void
}

// Component props
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
  title?: string
  initialStep?: number
  children: ReactNode
}

export interface ModalStepProps {
  title: string
  children: ReactNode
  /** Hide the back button for this step (useful for terminal/completion steps) */
  hideBackButton?: boolean
  /** Override which step the back button navigates to (default: previous step) */
  backStep?: number
  /** Callback fired when navigating back from this step (before navigation) */
  onBackStep?: () => void
  /** Additional CSS class for the step container */
  className?: string
}

export interface ModalItemProps {
  children: ReactNode
  className?: string
}

export interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export interface ModalButtonProps {
  children?: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}

// Component type markers for child identification
// These are used to identify component types when iterating through children
export interface ModalComponentWithMarker {
  _isModalStep?: boolean
  _isModalItem?: boolean
  _isModalFooter?: boolean
}

// Type guard for accessing component markers
export function hasComponentMarker(
  type: unknown
): type is ModalComponentWithMarker {
  return typeof type === 'function' || typeof type === 'object'
}
