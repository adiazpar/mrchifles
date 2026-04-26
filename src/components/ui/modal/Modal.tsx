// src/components/ui/modal/Modal.tsx
//
// IMPORTANT: Modal.Footer Placement Rule
// =======================================
// Modal.Footer MUST be a DIRECT child of Modal.Step for proper extraction.
//
// The separateFooter() function scans step.props.children looking for Modal.Footer.
// It can only detect Modal.Footer when it's a direct child - NOT when it's returned
// from a sub-component, because React hasn't rendered the sub-component yet at
// scan time.
//
// CORRECT - Footer is direct child, gets extracted and rendered outside modal-body:
// ```tsx
// <Modal.Step title="Example">
//   <MyContentComponent />        // Returns only Modal.Item elements
//   <Modal.Footer>                // Direct child - EXTRACTED properly
//     <button>Save</button>
//   </Modal.Footer>
// </Modal.Step>
// ```
//
// WRONG - Footer inside sub-component, stays in modal-body with extra padding:
// ```tsx
// <Modal.Step title="Example">
//   <MyStepComponent />           // Returns <><Modal.Item>...</Modal.Item><Modal.Footer>...</Modal.Footer></>
// </Modal.Step>                   // Footer NOT extracted - renders inside modal-body!
// ```
//
// When creating multi-step modals with reusable content:
// 1. Create content-only components that return ONLY Modal.Item elements
// 2. If footer buttons need useModal(), create separate button components
// 3. Place Modal.Footer as direct child of Modal.Step in the modal JSX
//
// VISUAL: this component renders as a bottom drawer (slides up from below,
// leaves a 48px dimmed gap at the top). Open/close, drag-to-dismiss, footer
// in/out, and step content fade are driven by framer-motion. The phase
// state machine in ModalContext.tsx still ticks; ModalStep.tsx applies the
// opacity-only `modal-step-content-exit` / `modal-step-content-enter` classes.
//
'use client'

import React, { useState, useEffect, useRef, Children, isValidElement, ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion'
import { ModalProvider, useModalContext } from './ModalContext'
import { ModalStep } from './ModalStep'
import { ModalItem } from './ModalItem'
import { ModalFooter } from './ModalFooter'
import { ModalBackButton, ModalNextButton, ModalCancelBackButton, ModalGoToStepButton } from './ModalButtons'
import type { ModalProps, ModalStepProps } from './types'
import { hasComponentMarker } from './types'

// Drag-to-dismiss thresholds. Either condition triggers close on dragEnd.
const DRAG_DISTANCE_RATIO = 0.30  // close if dragged > 30% of drawer height
const DRAG_VELOCITY_PX_S = 600    // close if released with > 600 px/s downward fling

// Internal header component (needs context). Renders the notch row + button row.
// The entire header is the drag surface; buttons stop pointerdown propagation.
function ModalHeader({
  title,
  singleStepTitle,
  onPointerDown,
}: {
  title?: string
  singleStepTitle?: string
  onPointerDown: (e: React.PointerEvent) => void
}) {
  const t = useTranslations('ui.modal')
  const ctx = useModalContext()
  const {
    isFirstStep,
    isLocked,
    isTransitioning,
    goBack,
    goToStep,
    _onClose,
    _currentStepHideBackButton,
    _currentStepBackStep,
    _currentStepOnBackStep,
  } = ctx

  const displayTitle = singleStepTitle || title || ''

  // Show back button if: multi-step modal, not first step, and step doesn't hide it
  const showBackIcon = !singleStepTitle && !isFirstStep && !_currentStepHideBackButton

  // Handle back navigation - call onBackStep callback first, then navigate
  const handleBack = () => {
    _currentStepOnBackStep?.()
    if (_currentStepBackStep !== undefined) {
      goToStep(_currentStepBackStep)
    } else {
      goBack()
    }
  }

  // Buttons must not initiate the header drag.
  const stopHeaderDrag = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <div className="modal-header" onPointerDown={onPointerDown}>
      <div className="modal-notch" aria-hidden />
      <div className="modal-header-bar">
        {/* Back-button slot — always reserved (44px wide) so the title stays
            perfectly centered. The button itself fades in/out via the
            .modal-back-hidden modifier. */}
        <div className="modal-back-slot">
          <button
            type="button"
            onClick={handleBack}
            onPointerDown={stopHeaderDrag}
            className={`modal-back ${showBackIcon ? '' : 'modal-back-hidden'}`}
            aria-label={t('go_back')}
            aria-hidden={!showBackIcon}
            tabIndex={showBackIcon ? 0 : -1}
            disabled={isLocked || isTransitioning || !showBackIcon}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <h2 className="modal-title">{displayTitle}</h2>
        <button
          type="button"
          onClick={_onClose}
          onPointerDown={stopHeaderDrag}
          className="modal-close"
          aria-label={t('close')}
          disabled={isLocked || isTransitioning}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// Helper to separate footer from other children
function separateFooter(children: React.ReactNode): { content: React.ReactNode; footer: React.ReactNode } {
  let footer: React.ReactNode = null
  const content: React.ReactNode[] = []

  Children.forEach(children, (child) => {
    if (isValidElement(child) && hasComponentMarker(child.type) && child.type._isModalFooter) {
      footer = child
    } else {
      content.push(child)
    }
  })

  return { content, footer }
}

// Internal body component — extracts current-step title and footer.
// Footer extraction reads currentStep only (no targetStep switch); the visual
// swap is owned by AnimatePresence in ModalInner.
function ModalBody({
  children,
  isSingleStep,
  setCurrentTitle,
  setCurrentFooter,
}: {
  children: React.ReactNode
  isSingleStep: boolean
  setCurrentTitle: (title: string) => void
  setCurrentFooter: (footer: React.ReactNode) => void
}) {
  const { currentStep } = useModalContext()

  useEffect(() => {
    if (isSingleStep) {
      const { footer } = separateFooter(children)
      setCurrentFooter(footer)
      return
    }

    const steps = Children.toArray(children).filter(
      (child): child is ReactElement<ModalStepProps> =>
        isValidElement(child) && hasComponentMarker(child.type) && child.type._isModalStep === true
    )

    if (steps[currentStep]) {
      setCurrentTitle(steps[currentStep].props.title)
      const { footer } = separateFooter(steps[currentStep].props.children)
      setCurrentFooter(footer)
    }
  }, [children, currentStep, isSingleStep, setCurrentTitle, setCurrentFooter])

  if (isSingleStep) {
    const { content } = separateFooter(children)
    return (
      <div className="modal-body">
        <div className="modal-step modal-step-visible">
          <div className="modal-step-inner">
            <div className="modal-step-content">
              {content}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const steps = Children.toArray(children).filter(
    (child): child is ReactElement<ModalStepProps> =>
      isValidElement(child) && hasComponentMarker(child.type) && child.type._isModalStep === true
  )

  return (
    <div className="modal-body">
      {steps.map((step, index) => {
        const { content } = separateFooter(step.props.children)
        return (
          <ModalStep key={index} {...step.props} _index={index}>
            {injectItemIndices(content)}
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
    if (isValidElement(child) && hasComponentMarker(child.type)) {
      if (child.type._isModalItem) {
        const cloned = React.cloneElement(
          child as ReactElement<{ _index?: number }>,
          { _index: itemIndex },
        )
        itemIndex++
        return cloned
      }
      if (child.type._isModalFooter) {
        return child
      }
    }
    return child
  })
}

// Backdrop — owns the dim overlay below the safe-area-inset-top. The drawer
// fills the remainder of the viewport, so there's no separate tap-zone.
function ModalBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </motion.div>
  )
}

// Inner component that renders the drawer card itself.
function ModalInner({
  children,
  title,
  singleStepTitle,
  isSingleStep,
  setCurrentTitle,
  currentFooter,
  setCurrentFooter,
}: {
  children: React.ReactNode
  title?: string
  singleStepTitle?: string
  isSingleStep: boolean
  setCurrentTitle: (title: string) => void
  currentFooter: React.ReactNode
  setCurrentFooter: (footer: React.ReactNode) => void
}) {
  const ctx = useModalContext()
  const { _onClose } = ctx
  const dragControls = useDragControls()
  const drawerRef = useRef<HTMLDivElement>(null)

  // ESC key handler — depend on _onClose (stable per phase/lock change) instead
  // of the whole context value to avoid re-attaching the listener on every
  // phase tick during step transitions.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        _onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [_onClose])

  // Drag is initiated only by .modal-header onPointerDown (not the drawer body).
  // dragListener={false} on the motion.div disables the default global pointer
  // listener; we manually start drag with the controls when the header is touched.
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (ctx.isLocked || ctx.isTransitioning) return
    dragControls.start(e)
  }

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (ctx.isLocked || ctx.isTransitioning) return
    const drawerHeight = drawerRef.current?.offsetHeight ?? window.innerHeight
    const shouldClose =
      info.offset.y > drawerHeight * DRAG_DISTANCE_RATIO ||
      info.velocity.y > DRAG_VELOCITY_PX_S
    if (shouldClose) {
      ctx._onClose()
    }
    // Otherwise framer-motion springs y back to 0 automatically.
  }

  return (
    <motion.div
      className="modal"
      ref={drawerRef}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 35, stiffness: 300 }}
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.2 }}
      onDragEnd={handleDragEnd}
      onClick={(e) => e.stopPropagation()}
    >
      <ModalHeader
        title={title}
        singleStepTitle={singleStepTitle}
        onPointerDown={handleHeaderPointerDown}
      />
      <ModalBody
        isSingleStep={isSingleStep}
        setCurrentTitle={setCurrentTitle}
        setCurrentFooter={setCurrentFooter}
      >
        {children}
      </ModalBody>
      {/* Footer animated by AnimatePresence keyed on currentStep. When the
          current step provides no <Modal.Footer>, currentFooter is null and
          the AnimatePresence child is absent — exit animation runs. */}
      <AnimatePresence mode="wait">
        {currentFooter && (
          <motion.div
            key={`modal-footer-${ctx.currentStep}`}
            className="modal-footer-wrapper"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            {currentFooter}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Main Modal component
function ModalRoot({
  isOpen,
  onClose,
  onExitComplete,
  title,
  initialStep = 0,
  children,
}: ModalProps) {
  const [currentTitle, setCurrentTitle] = useState('')
  const [currentFooter, setCurrentFooter] = useState<React.ReactNode>(null)

  // Ref for onExitComplete to avoid stale closure when parent re-renders mid-exit.
  const onExitCompleteRef = useRef(onExitComplete)
  onExitCompleteRef.current = onExitComplete

  const steps = Children.toArray(children).filter(
    (child): child is ReactElement<ModalStepProps> =>
      isValidElement(child) && hasComponentMarker(child.type) && child.type._isModalStep === true
  )
  const isSingleStep = steps.length === 0

  // Portal to document.body so the backdrop + drawer are outside any
  // scroll container or stacking context created by page layouts (e.g.
  // main-scroll-container's overflow, PageTransition's opacity).
  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence onExitComplete={() => onExitCompleteRef.current?.()}>
      {isOpen && (
        <ModalProvider initialStep={initialStep} onClose={onClose} isOpen={isOpen}>
          <ModalBackdrop>
            <ModalInner
              title={isSingleStep ? title : currentTitle}
              singleStepTitle={isSingleStep ? title : undefined}
              isSingleStep={isSingleStep}
              setCurrentTitle={setCurrentTitle}
              currentFooter={currentFooter}
              setCurrentFooter={setCurrentFooter}
            >
              {children}
            </ModalInner>
          </ModalBackdrop>
        </ModalProvider>
      )}
    </AnimatePresence>,
    document.body,
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
  GoToStepButton: ModalGoToStepButton,
})
