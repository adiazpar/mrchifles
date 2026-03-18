# MorphingModal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable multi-step modal component with smooth morphing transitions that replaces the existing Modal.

**Architecture:** Compound component pattern with context-based state management. The Modal orchestrates step transitions via a phase state machine, while sub-components (Step, Item, Footer, Buttons) provide the structure. Consumers control content and buttons; Modal handles animations.

**Tech Stack:** React 18, TypeScript, CSS Grid animations, React Context

**Spec:** `docs/superpowers/specs/2026-03-11-morphing-modal-design.md`

---

## File Structure

```
src/components/ui/modal/
├── index.ts              # Public exports
├── types.ts              # Shared types and constants
├── ModalContext.tsx      # Context + useMorphingModal hook
├── Modal.tsx             # Main component (orchestrator)
├── ModalStep.tsx         # Step wrapper
├── ModalItem.tsx         # Animated content item
├── ModalFooter.tsx       # Footer wrapper
└── ModalButtons.tsx      # BackButton, NextButton, CancelBackButton
```

**Files to modify:**
- `src/components/ui/index.ts` - Update exports
- `src/app/globals.css` - Add backward animation CSS

**Files to delete after migration:**
- `src/components/ui/modal.tsx` - Replaced by folder

**Files to migrate (footer prop → Modal.Footer):**
- `src/app/(dashboard)/productos/page.tsx` (5 modals)
- `src/app/(dashboard)/caja/page.tsx` (2 modals)
- `src/app/(dashboard)/ajustes/proveedores/page.tsx` (1 modal)
- `src/app/(dashboard)/ajustes/equipo/page.tsx` (1 modal)

**Files to refactor:**
- `src/components/caja/CloseDrawerModal.tsx` - Use new Modal instead of custom state machine

---

## Chunk 1: Foundation

### Task 1: Types and Constants

**Files:**
- Create: `src/components/ui/modal/types.ts`

- [ ] **Step 1: Create types file with all shared types**

```typescript
// src/components/ui/modal/types.ts
import { ReactNode } from 'react'

// Phase state machine
export type Phase = 'idle' | 'exiting' | 'transitioning' | 'entering'
export type Direction = 'forward' | 'backward'

// Timing constants (centralized per spec reviewer recommendation)
export const TIMING = {
  STAGGER_DELAY: 40,        // ms between each item animation
  EXIT_DURATION: 120,       // base exit animation duration
  ENTER_DURATION: 120,      // base enter animation duration
  HEIGHT_TRANSITION: 300,   // height collapse/expand duration
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
}

// Component props
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void
  title?: string
  size?: 'default' | 'large'
  initialStep?: number
  children: ReactNode
}

export interface ModalStepProps {
  title: string
  children: ReactNode
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/modal/types.ts
git commit -m "feat(modal): add types and timing constants"
```

---

### Task 2: Modal Context and Hook

**Files:**
- Create: `src/components/ui/modal/ModalContext.tsx`

- [ ] **Step 1: Create context with state machine logic**

```typescript
// src/components/ui/modal/ModalContext.tsx
'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import type { ModalContextValue, Phase, Direction } from './types'
import { TIMING } from './types'

const ModalContext = createContext<ModalContextValue | null>(null)

export function useModalContext(): ModalContextValue {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('Modal compound components must be used within a Modal')
  }
  return context
}

export function useMorphingModal(): Omit<ModalContextValue, '_registerStep' | '_unregisterStep' | '_onClose'> {
  const ctx = useModalContext()
  const { _registerStep, _unregisterStep, _onClose, ...publicApi } = ctx
  return publicApi
}

interface ModalProviderProps {
  children: ReactNode
  initialStep: number
  onClose: () => void
  isOpen: boolean
}

export function ModalProvider({ children, initialStep, onClose, isOpen }: ModalProviderProps) {
  // Track registered steps
  const stepsRef = useRef<Set<number>>(new Set())
  const [stepCount, setStepCount] = useState(0)

  // Core state
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [targetStep, setTargetStep] = useState(initialStep)
  const [phase, setPhase] = useState<Phase>('idle')
  const [direction, setDirection] = useState<Direction>('forward')
  const [isLocked, setIsLocked] = useState(false)

  // Reset state when modal opens
  const prevIsOpen = useRef(isOpen)
  if (isOpen && !prevIsOpen.current) {
    // Modal just opened - reset to initial state
    setCurrentStep(initialStep)
    setTargetStep(initialStep)
    setPhase('idle')
    setDirection('forward')
    setIsLocked(false)
  }
  prevIsOpen.current = isOpen

  // Step registration (called by Modal.Step)
  const _registerStep = useCallback((index: number) => {
    stepsRef.current.add(index)
    setStepCount(stepsRef.current.size)
  }, [])

  const _unregisterStep = useCallback((index: number) => {
    stepsRef.current.delete(index)
    setStepCount(stepsRef.current.size)
  }, [])

  // Calculate item count for timing (rough estimate, actual items animate via CSS)
  const getExitDuration = useCallback(() => {
    // Assume ~4 items average, can be refined if needed
    const itemCount = 4
    return TIMING.EXIT_DURATION + (itemCount - 1) * TIMING.STAGGER_DELAY
  }, [])

  const getEnterDuration = useCallback(() => {
    const itemCount = 4
    return TIMING.ENTER_DURATION + (itemCount - 1) * TIMING.STAGGER_DELAY
  }, [])

  // Navigation
  const goToStep = useCallback((step: number) => {
    if (isLocked || phase !== 'idle') return

    // Clamp to valid range
    const clampedStep = Math.max(0, Math.min(step, stepCount - 1))
    if (clampedStep === currentStep) return

    const newDirection: Direction = clampedStep > currentStep ? 'forward' : 'backward'
    setDirection(newDirection)
    setTargetStep(clampedStep)
    setPhase('exiting')

    // Phase transitions
    const exitDuration = getExitDuration()

    setTimeout(() => {
      setPhase('transitioning')

      setTimeout(() => {
        setCurrentStep(clampedStep)
        setPhase('entering')

        const enterDuration = getEnterDuration()
        setTimeout(() => {
          setPhase('idle')
        }, enterDuration)
      }, TIMING.HEIGHT_TRANSITION)
    }, exitDuration)
  }, [isLocked, phase, stepCount, currentStep, getExitDuration, getEnterDuration])

  const goNext = useCallback(() => {
    if (currentStep < stepCount - 1) {
      goToStep(currentStep + 1)
    }
  }, [currentStep, stepCount, goToStep])

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1)
    }
  }, [currentStep, goToStep])

  // Lock control
  const lock = useCallback(() => setIsLocked(true), [])
  const unlock = useCallback(() => setIsLocked(false), [])

  // Close handler
  const _onClose = useCallback(() => {
    if (isLocked || phase !== 'idle') return
    onClose()
  }, [isLocked, phase, onClose])

  const value: ModalContextValue = {
    currentStep,
    stepCount,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === stepCount - 1,
    isLocked,
    isTransitioning: phase !== 'idle',
    phase,
    direction,
    goNext,
    goBack,
    goToStep,
    lock,
    unlock,
    _registerStep,
    _unregisterStep,
    _onClose,
  }

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/modal/ModalContext.tsx
git commit -m "feat(modal): add context and useMorphingModal hook"
```

---

## Chunk 2: Core Components

### Task 3: ModalStep Component

**Files:**
- Create: `src/components/ui/modal/ModalStep.tsx`

- [ ] **Step 1: Create ModalStep component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/modal/ModalStep.tsx
git commit -m "feat(modal): add ModalStep component"
```

---

### Task 4: ModalItem Component

**Files:**
- Create: `src/components/ui/modal/ModalItem.tsx`

- [ ] **Step 1: Create ModalItem component**

```typescript
// src/components/ui/modal/ModalItem.tsx
'use client'

import type { ModalItemProps } from './types'
import { TIMING } from './types'

interface InternalItemProps extends ModalItemProps {
  _index?: number
}

export function ModalItem({ children, className = '', _index = 0 }: InternalItemProps) {
  // Apply stagger delay via inline style
  const delay = _index * TIMING.STAGGER_DELAY

  return (
    <div
      className={`morph-item ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/modal/ModalItem.tsx
git commit -m "feat(modal): add ModalItem component"
```

---

### Task 5: ModalFooter Component

**Files:**
- Create: `src/components/ui/modal/ModalFooter.tsx`

- [ ] **Step 1: Create ModalFooter component**

```typescript
// src/components/ui/modal/ModalFooter.tsx
'use client'

import type { ModalFooterProps } from './types'

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`morph-footer ${className}`}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/modal/ModalFooter.tsx
git commit -m "feat(modal): add ModalFooter component"
```

---

### Task 6: ModalButtons Components

**Files:**
- Create: `src/components/ui/modal/ModalButtons.tsx`

- [ ] **Step 1: Create button components**

```typescript
// src/components/ui/modal/ModalButtons.tsx
'use client'

import { useContext } from 'react'
import { useModalContext, useMorphingModal } from './ModalContext'
import type { ModalButtonProps } from './types'

export function ModalBackButton({ children, className = '', disabled, onClick }: ModalButtonProps) {
  const { goBack, isLocked, isTransitioning, isFirstStep } = useMorphingModal()

  const handleClick = () => {
    if (onClick) {
      onClick()
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
      {children || 'Atras'}
    </button>
  )
}

export function ModalNextButton({ children, className = '', disabled, onClick }: ModalButtonProps) {
  const { goNext, isLocked, isTransitioning, isLastStep } = useMorphingModal()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      goNext()
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-primary flex-1 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning || isLastStep}
    >
      {children || 'Siguiente'}
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
}: CancelBackButtonProps) {
  const ctx = useModalContext()
  const { goBack, isLocked, isTransitioning, isFirstStep } = ctx

  const handleClick = () => {
    if (isFirstStep) {
      if (onCancel) {
        onCancel()
      } else {
        ctx._onClose()
      }
    } else {
      goBack()
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-secondary flex-1 ${className}`}
      onClick={handleClick}
      disabled={disabled || isLocked || isTransitioning}
    >
      {children || (isFirstStep ? 'Cancelar' : 'Atras')}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/modal/ModalButtons.tsx
git commit -m "feat(modal): add BackButton, NextButton, CancelBackButton"
```

---

### Task 7: Main Modal Component

**Files:**
- Create: `src/components/ui/modal/Modal.tsx`

- [ ] **Step 1: Create Modal component with compound component pattern**

```typescript
// src/components/ui/modal/Modal.tsx
'use client'

import React, { useState, useEffect, Children, isValidElement, ReactElement } from 'react'
import { IconClose, IconArrowLeft } from '@/components/icons'
import { ModalProvider, useModalContext } from './ModalContext'
import { ModalStep } from './ModalStep'
import { ModalItem } from './ModalItem'
import { ModalFooter } from './ModalFooter'
import { ModalBackButton, ModalNextButton, ModalCancelBackButton } from './ModalButtons'
import type { ModalProps, ModalStepProps, ModalItemProps } from './types'

// Internal header component (needs context)
function ModalHeader({ title, singleStepTitle }: { title?: string; singleStepTitle?: string }) {
  const ctx = useModalContext()
  const { currentStep, isFirstStep, isLocked, isTransitioning, goBack, _onClose } = ctx

  // For single-step modals, use the prop title
  // For multi-step, find the current step's title from DOM (set via data attribute)
  const displayTitle = singleStepTitle || title || ''

  const showBackIcon = !singleStepTitle && !isFirstStep

  return (
    <div className="modal-header">
      {showBackIcon && (
        <button
          type="button"
          onClick={goBack}
          className="modal-back"
          aria-label="Volver"
          disabled={isLocked || isTransitioning}
        >
          <IconArrowLeft className="w-5 h-5" />
        </button>
      )}
      <h2 className="modal-title">{displayTitle}</h2>
      <button
        type="button"
        onClick={_onClose}
        className="modal-close"
        aria-label="Cerrar"
        disabled={isLocked || isTransitioning}
      >
        <IconClose className="w-5 h-5" />
      </button>
    </div>
  )
}

// Internal body component that handles step title extraction
function ModalBody({
  children,
  isSingleStep,
  setCurrentTitle,
}: {
  children: React.ReactNode
  isSingleStep: boolean
  setCurrentTitle: (title: string) => void
}) {
  const { currentStep } = useModalContext()

  // Extract titles from Step children
  useEffect(() => {
    if (isSingleStep) return

    const steps = Children.toArray(children).filter(
      (child): child is ReactElement<ModalStepProps> =>
        isValidElement(child) && (child.type as any)._isModalStep
    )

    if (steps[currentStep]) {
      setCurrentTitle(steps[currentStep].props.title)
    }
  }, [children, currentStep, isSingleStep, setCurrentTitle])

  if (isSingleStep) {
    // Single-step: wrap content in morph classes for consistency
    return (
      <div className="modal-body">
        <div className="morph-panel morph-panel-visible">
          <div className="morph-panel-inner">
            <div className="morph-content">
              {children}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Multi-step: children are Modal.Step components
  const steps = Children.toArray(children).filter(
    (child): child is ReactElement<ModalStepProps> =>
      isValidElement(child) && (child.type as any)._isModalStep
  )

  return (
    <div className="modal-body">
      {steps.map((step, index) => {
        // Clone with internal _index prop
        return (
          <ModalStep key={index} {...step.props} _index={index}>
            {injectItemIndices(step.props.children)}
          </ModalStep>
        )
      })}
    </div>
  )
}

// Helper to inject _index into ModalItem children
function injectItemIndices(children: React.ReactNode): React.ReactNode {
  let itemIndex = 0

  return Children.map(children, (child) => {
    if (isValidElement(child)) {
      // Check if it's a ModalItem - use React.cloneElement for proper cloning
      if ((child.type as any)._isModalItem) {
        const cloned = React.cloneElement(child, { _index: itemIndex })
        itemIndex++
        return cloned
      }
      // ModalFooter passes through unchanged
      if ((child.type as any)._isModalFooter) {
        return child
      }
    }
    return child
  })
}

// Main Modal component
function ModalRoot({
  isOpen,
  onClose,
  onExitComplete,
  title,
  size = 'default',
  initialStep = 0,
  children,
}: ModalProps) {
  const [render, setRender] = useState(false)
  const [closing, setClosing] = useState(false)
  const [currentTitle, setCurrentTitle] = useState('')

  // Check if this is a single-step modal (no Modal.Step children)
  const steps = Children.toArray(children).filter(
    (child): child is ReactElement<ModalStepProps> =>
      isValidElement(child) && (child.type as any)._isModalStep
  )
  const isSingleStep = steps.length === 0

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setRender(true)
      setClosing(false)
    } else if (render) {
      setClosing(true)
      const timer = setTimeout(() => {
        setRender(false)
        setClosing(false)
        onExitComplete?.()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen, render, onExitComplete])

  if (!render) return null

  return (
    <ModalProvider initialStep={initialStep} onClose={onClose} isOpen={isOpen}>
      <div
        className={`modal-backdrop ${closing ? 'modal-backdrop-exit' : 'modal-backdrop-animated'}`}
        role="dialog"
        aria-modal="true"
      >
        <ModalInner
          closing={closing}
          size={size}
          title={isSingleStep ? title : currentTitle}
          singleStepTitle={isSingleStep ? title : undefined}
          isSingleStep={isSingleStep}
          setCurrentTitle={setCurrentTitle}
          onClose={onClose}
        >
          {children}
        </ModalInner>
      </div>
    </ModalProvider>
  )
}

// Inner component that has access to context
function ModalInner({
  children,
  closing,
  size,
  title,
  singleStepTitle,
  isSingleStep,
  setCurrentTitle,
  onClose,
}: {
  children: React.ReactNode
  closing: boolean
  size: 'default' | 'large'
  title?: string
  singleStepTitle?: string
  isSingleStep: boolean
  setCurrentTitle: (title: string) => void
  onClose: () => void
}) {
  const ctx = useModalContext()

  // Handle backdrop click
  const handleBackdropClick = () => {
    ctx._onClose()
  }

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ctx._onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [ctx])

  return (
    <>
      {/* Invisible backdrop click handler */}
      <div
        className="absolute inset-0"
        onClick={handleBackdropClick}
      />
      <div
        className={`modal ${size === 'large' ? 'modal-lg' : ''} ${closing ? 'modal-exit' : 'modal-animated'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title={title} singleStepTitle={singleStepTitle} />
        <ModalBody isSingleStep={isSingleStep} setCurrentTitle={setCurrentTitle}>
          {children}
        </ModalBody>
      </div>
    </>
  )
}

// Mark sub-components for identification
const ModalStepWithMarker = ModalStep as typeof ModalStep & { _isModalStep: boolean }
ModalStepWithMarker._isModalStep = true

const ModalItemWithMarker = ModalItem as typeof ModalItem & { _isModalItem: boolean }
ModalItemWithMarker._isModalItem = true

const ModalFooterWithMarker = ModalFooter as typeof ModalFooter & { _isModalFooter: boolean }
ModalFooterWithMarker._isModalFooter = true

// Compound component exports
export const Modal = Object.assign(ModalRoot, {
  Step: ModalStepWithMarker,
  Item: ModalItemWithMarker,
  Footer: ModalFooterWithMarker,
  BackButton: ModalBackButton,
  NextButton: ModalNextButton,
  CancelBackButton: ModalCancelBackButton,
})
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/modal/Modal.tsx
git commit -m "feat(modal): add main Modal component with compound pattern"
```

---

### Task 8: Index Exports

**Files:**
- Create: `src/components/ui/modal/index.ts`

- [ ] **Step 1: Create index file with all exports**

```typescript
// src/components/ui/modal/index.ts
export { Modal } from './Modal'
export { useMorphingModal } from './ModalContext'
export type {
  ModalProps,
  ModalStepProps,
  ModalItemProps,
  ModalFooterProps,
  ModalButtonProps,
  ModalContextValue,
  Phase,
  Direction,
} from './types'
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/modal/index.ts
git commit -m "feat(modal): add index exports"
```

---

## Chunk 3: CSS and Integration

### Task 9: Add Backward Animation CSS

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add backward animation classes after existing morph animations**

Find the section with `.morph-content-exit` and `.morph-content-enter` (around line 3696) and add after the `@keyframes morph-item-enter`:

```css
/* Backward exit animation - fade out downward */
.morph-content-exit-back > .morph-item {
  animation: morph-item-exit-back var(--duration-fast) ease-in forwards;
}

.morph-content-exit-back > .morph-item:nth-child(1) { animation-delay: 0ms; }
.morph-content-exit-back > .morph-item:nth-child(2) { animation-delay: 40ms; }
.morph-content-exit-back > .morph-item:nth-child(3) { animation-delay: 80ms; }
.morph-content-exit-back > .morph-item:nth-child(4) { animation-delay: 120ms; }
.morph-content-exit-back > .morph-item:nth-child(5) { animation-delay: 160ms; }

/* Backward enter animation - fade in from above */
.morph-content-enter-back > .morph-item {
  animation: morph-item-enter-back var(--duration-fast) ease-out forwards;
  opacity: 0;
}

.morph-content-enter-back > .morph-item:nth-child(1) { animation-delay: 0ms; }
.morph-content-enter-back > .morph-item:nth-child(2) { animation-delay: 40ms; }
.morph-content-enter-back > .morph-item:nth-child(3) { animation-delay: 80ms; }
.morph-content-enter-back > .morph-item:nth-child(4) { animation-delay: 120ms; }
.morph-content-enter-back > .morph-item:nth-child(5) { animation-delay: 160ms; }

@keyframes morph-item-exit-back {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes morph-item-enter-back {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Modal back button in header */
.modal-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  transition: color var(--duration-fast), background var(--duration-fast);
  margin-right: var(--space-2);
}

.modal-back:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-bg-muted);
}

.modal-back:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(modal): add backward animation CSS and modal-back button styles"
```

---

### Task 10: Check for IconArrowLeft

**Files:**
- Check: `src/components/icons/index.tsx`

- [ ] **Step 1: Verify IconArrowLeft exists or add it**

Check if `IconArrowLeft` exists in the icons file. If not, add it:

```typescript
export function IconArrowLeft({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}
```

- [ ] **Step 2: Commit if changes made**

```bash
git add src/components/icons/index.tsx
git commit -m "feat(icons): add IconArrowLeft"
```

---

### Task 11: Update UI Index Exports

**Files:**
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Update exports to use new modal folder**

```typescript
// Change these lines:
// export { Modal } from './modal'
// export type { ModalProps } from './modal'

// To:
export { Modal, useMorphingModal } from './modal'
export type { ModalProps } from './modal'
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/index.ts
git commit -m "feat(modal): update UI exports to use new modal folder"
```

---

## Chunk 4: Migration

### Task 12: Migrate Caja Page Modals

**Files:**
- Modify: `src/app/(dashboard)/caja/page.tsx`

- [ ] **Step 1: Update imports**

No import changes needed - Modal is already imported from `@/components/ui`.

- [ ] **Step 2: Migrate open drawer modal (around line 607)**

Change from:

```tsx
<Modal
  isOpen={isOpenDrawerModalOpen}
  onClose={() => !isOpening && setIsOpenDrawerModalOpen(false)}
  title="Abrir caja"
  footer={
    <div className="flex gap-3 w-full">
      <button ... >Cancelar</button>
      <button ... >Abrir</button>
    </div>
  }
>
  {/* content */}
</Modal>
```

To:

```tsx
<Modal
  isOpen={isOpenDrawerModalOpen}
  onClose={() => !isOpening && setIsOpenDrawerModalOpen(false)}
  title="Abrir caja"
>
  {/* content */}
  <Modal.Footer>
    <button ... >Cancelar</button>
    <button ... >Abrir</button>
  </Modal.Footer>
</Modal>
```

- [ ] **Step 3: Migrate movement modal (around line 677)**

Same pattern - move `footer` prop content into `<Modal.Footer>` child.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/caja/page.tsx
git commit -m "refactor(caja): migrate modals to use Modal.Footer"
```

---

### Task 13: Migrate Productos Page Modals

**Files:**
- Modify: `src/app/(dashboard)/productos/page.tsx`

- [ ] **Step 1: Migrate all 5 modals**

For each modal using `footer={...}` prop, move the footer content into `<Modal.Footer>` children.

Modals to migrate:
1. Product edit modal (line ~1413)
2. Inventory adjustment modal (line ~1624)
3. Order modal (line ~1799)
4. Receive order modal (line ~2056)
5. Order detail modal (line ~2159)

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/productos/page.tsx
git commit -m "refactor(productos): migrate modals to use Modal.Footer"
```

---

### Task 14: Migrate Proveedores Page Modal

**Files:**
- Modify: `src/app/(dashboard)/ajustes/proveedores/page.tsx`

- [ ] **Step 1: Migrate provider modal (around line 247)**

Move `footer` prop to `<Modal.Footer>` child.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/ajustes/proveedores/page.tsx
git commit -m "refactor(proveedores): migrate modal to use Modal.Footer"
```

---

### Task 15: Migrate Equipo Page Modal

**Files:**
- Modify: `src/app/(dashboard)/ajustes/equipo/page.tsx`

- [ ] **Step 1: Migrate team member modal (around line 646)**

Move `footer` prop to `<Modal.Footer>` child.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/ajustes/equipo/page.tsx
git commit -m "refactor(equipo): migrate modal to use Modal.Footer"
```

---

### Task 16: Delete Old Modal File

**Files:**
- Delete: `src/components/ui/modal.tsx`

- [ ] **Step 1: Delete old modal file**

```bash
rm src/components/ui/modal.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor(modal): remove old modal.tsx, replaced by modal/ folder"
```

---

## Chunk 5: CloseDrawerModal Refactor

### Task 17: Refactor CloseDrawerModal to Use New Modal

**Files:**
- Modify: `src/components/caja/CloseDrawerModal.tsx`

- [ ] **Step 1: Replace internal state machine with Modal component**

The CloseDrawerModal currently has its own phase state machine. Refactor to use the new Modal:

```tsx
// src/components/caja/CloseDrawerModal.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayer } from '@/components/animations/LottiePlayer'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency } from '@/lib/utils'
import type { CashSession, CashMovement } from '@/types'

interface CloseDrawerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentSession: CashSession | null
  movements: CashMovement[]
}

// Inner component that uses the modal context
function CloseDrawerForm({
  currentSession,
  movements,
  onSuccess,
  isOpen,
}: Omit<CloseDrawerModalProps, 'onClose'>) {
  const { user, pb } = useAuth()
  const { goNext, lock, unlock, isLocked, currentStep } = useMorphingModal()

  const [closingBalance, setClosingBalance] = useState('')
  const [discrepancyNote, setDiscrepancyNote] = useState('')
  const [celebrationStats, setCelebrationStats] = useState<{ label: string; value: string }[]>([])

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen && currentStep === 0) {
      setClosingBalance('')
      setDiscrepancyNote('')
      setCelebrationStats([])
    }
  }, [isOpen, currentStep])

  // Calculate expected balance
  const expectedBalance = useMemo(() => {
    if (!currentSession) return 0
    const ingresos = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0)
    const retiros = movements.filter(m => m.type === 'retiro').reduce((sum, m) => sum + m.amount, 0)
    return currentSession.openingBalance + ingresos - retiros
  }, [currentSession, movements])

  // Calculate discrepancy
  const closingDiscrepancy = useMemo(() => {
    const actual = parseFloat(closingBalance)
    if (isNaN(actual)) return 0
    return actual - expectedBalance
  }, [closingBalance, expectedBalance])

  const handleSubmit = async () => {
    if (!user || !currentSession) return

    const actualBalance = parseFloat(closingBalance)
    if (isNaN(actualBalance) || actualBalance < 0) return

    lock()

    try {
      const now = new Date().toISOString()

      const totalIngresos = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0)
      const totalRetiros = movements.filter(m => m.type === 'retiro').reduce((sum, m) => sum + m.amount, 0)

      await pb.collection('cash_sessions').update(currentSession.id, {
        closedAt: now,
        closedBy: user.id,
        closingBalance: actualBalance,
        expectedBalance: expectedBalance,
        discrepancy: closingDiscrepancy,
        discrepancyNote: discrepancyNote.trim() || null,
      })

      setCelebrationStats([
        { label: 'Movimientos', value: String(movements.length) },
        { label: 'Ingresos', value: formatCurrency(totalIngresos) },
        { label: 'Retiros', value: formatCurrency(totalRetiros) },
      ])

      goNext() // Transition to celebration step
    } catch (err) {
      console.error('Error closing drawer:', err)
      alert('Error al cerrar la caja')
      unlock()
    }
  }

  return (
    <>
      <Modal.Step title="Cerrar caja">
        <Modal.Item>
          <div className="p-3 rounded-lg bg-bg-muted">
            <div className="text-sm text-text-secondary">Saldo esperado</div>
            <div className="text-xl font-display font-bold text-text-primary mt-1">
              {formatCurrency(expectedBalance)}
            </div>
          </div>
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="closing-balance" className="label">Saldo real (S/)</label>
          <input
            id="closing-balance"
            type="number"
            inputMode="decimal"
            value={closingBalance}
            onChange={(e) => setClosingBalance(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
            autoFocus
            disabled={isLocked}
          />
        </Modal.Item>

        {closingBalance && (
          <Modal.Item>
            <div
              className={`p-3 rounded-lg ${
                closingDiscrepancy === 0
                  ? 'bg-success-subtle'
                  : closingDiscrepancy > 0
                    ? 'bg-warning-subtle'
                    : 'bg-error-subtle'
              }`}
            >
              <div className="text-sm text-text-secondary">Diferencia</div>
              <div
                className={`text-xl font-display font-bold mt-1 ${
                  closingDiscrepancy === 0
                    ? 'text-success'
                    : closingDiscrepancy > 0
                      ? 'text-warning'
                      : 'text-error'
                }`}
              >
                {closingDiscrepancy > 0 ? '+' : ''}{formatCurrency(closingDiscrepancy)}
              </div>
            </div>
          </Modal.Item>
        )}

        {closingBalance && closingDiscrepancy !== 0 && (
          <Modal.Item>
            <label htmlFor="discrepancy-note" className="label">Nota (opcional)</label>
            <textarea
              id="discrepancy-note"
              value={discrepancyNote}
              onChange={(e) => setDiscrepancyNote(e.target.value)}
              className="input"
              placeholder="Explica la diferencia..."
              rows={2}
              disabled={isLocked}
            />
          </Modal.Item>
        )}

        <Modal.Footer>
          <Modal.CancelBackButton disabled={isLocked} />
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-primary flex-1"
            disabled={isLocked || !closingBalance || parseFloat(closingBalance) < 0}
          >
            {isLocked ? <Spinner /> : 'Cerrar'}
          </button>
        </Modal.Footer>
      </Modal.Step>

      <Modal.Step title="Caja cerrada">
        <Modal.Item>
          <div className="flex flex-col items-center text-center">
            <div className="mb-6" style={{ width: 200, height: 200 }}>
              <LottiePlayer
                src="/animations/trophy.json"
                loop={false}
                autoplay={true}
                style={{ width: 200, height: 200 }}
              />
            </div>
          </div>
        </Modal.Item>

        <Modal.Item>
          <div className="w-full p-4 bg-bg-muted rounded-lg">
            <p className="text-text-secondary text-center mb-4">
              Buen trabajo hoy!
            </p>
            {celebrationStats.length > 0 && (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(celebrationStats.length, 3)}, 1fr)` }}
              >
                {celebrationStats.map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-xl font-bold font-display text-text-primary">
                      {stat.value}
                    </div>
                    <div className="text-sm text-text-secondary mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            className="btn btn-primary flex-1"
            onClick={onSuccess}
          >
            Continuar
          </button>
        </Modal.Footer>
      </Modal.Step>
    </>
  )
}

export function CloseDrawerModal({
  isOpen,
  onClose,
  onSuccess,
  currentSession,
  movements,
}: CloseDrawerModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <CloseDrawerForm
        isOpen={isOpen}
        currentSession={currentSession}
        movements={movements}
        onSuccess={() => {
          onSuccess()
          onClose()
        }}
      />
    </Modal>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/caja/CloseDrawerModal.tsx
git commit -m "refactor(caja): CloseDrawerModal uses new Modal with morphing"
```

---

### Task 18: Final Verification

- [ ] **Step 1: Run type check**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 2: Test in browser**

1. Open http://100.113.9.34:3000/caja
2. Test open drawer modal - should work as before
3. Test close drawer modal - should morph between steps
4. Test backward navigation (if applicable)
5. Open http://100.113.9.34:3000/productos
6. Test product modals - should work with Modal.Footer

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any issues found during verification"
```

---

## Summary

| Chunk | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-2 | Types, constants, context, hook |
| 2 | 3-8 | Step, Item, Footer, Buttons, Modal, exports |
| 3 | 9-11 | CSS animations, icons, UI exports |
| 4 | 12-16 | Migrate all existing modal usages |
| 5 | 17-18 | Refactor CloseDrawerModal, verify |

**Total commits:** ~18
**Estimated time:** Implementation by subagents
