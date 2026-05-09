import { useMemo, type ReactNode } from 'react'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close, chevronBack } from 'ionicons/icons'

interface ModalShellProps {
  isOpen: boolean
  onClose: () => void
  /** Header title text. Omit for chromeless modals (rare). */
  title?: string
  /** Drawer height variant. 'full' = [0,1] initial 1; 'half' = [0,0.5,1] initial 0.5. Default 'full'. */
  variant?: 'full' | 'half'
  /** When set, renders a back arrow in the toolbar's start slot. */
  onBack?: () => void
  /** When set, renders inside an IonFooter at the bottom of the modal. */
  footer?: ReactNode
  /**
   * Body content. For Pattern 2 wizards, pass `<IonNav root={...} />` here
   * and also set `rawContent` so IonNav is NOT wrapped in an extra IonContent.
   */
  children: ReactNode
  /**
   * When true, children are rendered directly inside IonModal without an
   * IonContent wrapper. Required for Pattern 2 (IonNav) — IonNav manages its
   * own IonContent per step, and nesting it inside IonContent breaks the layout.
   */
  rawContent?: boolean
  /**
   * Disables sheet swipe-to-dismiss. Drops the `0` snap point from the
   * breakpoints array and removes the drag handle so the modal can ONLY be
   * dismissed via an explicit close/cancel/done button. Required for any
   * Pattern 1 modal that contains an IonInput AND a Lottie/celebration
   * success step — when iOS dismisses the keyboard mid-step-transition,
   * the resulting visualViewport resize can make Ionic's sheet gesture
   * snap to the `0` breakpoint and auto-dismiss the modal, leaving the
   * backdrop attached and the app feeling bricked. See ionic-team/ionic-framework
   * issues #23878, #25245, #30144.
   */
  noSwipeDismiss?: boolean
  /**
   * Skip the default `.modal-content` horizontal/vertical inset on the
   * auto-rendered IonContent. Use for list-style sheets where each row
   * already paints edge-to-edge with its own padding (UserMenu, action
   * sheets) — adding `.modal-content` on top would double the inset and
   * leave the items floating narrowly inside the sheet.
   */
  flushContent?: boolean
}

/**
 * ModalShell — the only wrapper used for IonModal in this app. Standardizes
 * the chrome (header + toolbar + close button + breakpoints + drag handle)
 * across all ~30 modals in the app. Multi-step flows live in the consumer:
 *
 *   - Pattern 0: pass a single body via `children`.
 *   - Pattern 1: own a `step` state in the consumer; conditionally render
 *     different bodies; pass `onBack` to surface a back button when not on
 *     the first step.
 *   - Pattern 2: pass `<IonNav swipeGesture={false} root={StepComponent} />`
 *     as `children` and set `rawContent`. The `swipeGesture={false}` is
 *     CRITICAL: IonNav installs its own swipe-back gesture by default, which
 *     fights IonModal's sheet-drag gesture for every touchstart. With both
 *     active, the drag gesture wins and swallows all taps inside the modal.
 *     Disabling IonNav's swipe-back keeps the modal's drag-down-to-dismiss
 *     working. In-stack back navigation uses the IonBackButton instead.
 */
export function ModalShell({
  isOpen,
  onClose,
  title,
  variant = 'full',
  onBack,
  footer,
  children,
  rawContent = false,
  noSwipeDismiss = false,
  flushContent = false,
}: ModalShellProps) {
  // Sheet-mode is a property of `breakpoints` AND `initialBreakpoint` BOTH being
  // defined — see @ionic/core modal.js: `isSheetModal = breakpoints !== undefined
  // && initialBreakpoint !== undefined`. When sheet-mode is on, IonModal attaches
  // a `KEYBOARD_DID_OPEN` listener (modal.js:474) that briefly disables the sheet
  // gesture to work around a webview-resize bug — but the matching keyboard-DOWN
  // path leaves the gesture in "free-scroll" mode, which on iOS makes the sheet
  // snap-to-0 (dismiss) when an IonInput unmounts mid-step transition. The result
  // is the modal auto-dismisses while a Lottie success step is rendering, and the
  // backdrop can stick → app feels bricked.
  //
  // To kill this entirely, `noSwipeDismiss` makes BOTH breakpoints AND
  // initialBreakpoint undefined, which flips `isSheetModal` to false. The modal
  // becomes a regular IonModal: iOS-style fullscreen card animation, no sheet
  // gesture, no keyboard-coupled gesture handler. Pattern 2 (`rawContent` +
  // IonNav) is non-sheet for the same reason — IonNav owns its own per-step
  // layout. Pattern 0 / 1 modals without `noSwipeDismiss` keep the sheet.
  //
  // The breakpoints array is memoized so passing a fresh reference on every
  // parent render doesn't make IonModal re-evaluate its gesture mid-animation.
  const breakpoints = useMemo<number[] | undefined>(() => {
    if (rawContent || noSwipeDismiss) return undefined
    return variant === 'full' ? [0, 1] : [0, 0.5, 1]
  }, [rawContent, variant, noSwipeDismiss])
  const initialBreakpoint =
    rawContent || noSwipeDismiss
      ? undefined
      : variant === 'full'
        ? 1
        : 0.5
  // Suppress the drag handle when swipe-dismiss is disabled — the handle
  // implies draggability and is misleading if the user can't drag away.
  const showHandle = !rawContent && !noSwipeDismiss

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      breakpoints={breakpoints}
      initialBreakpoint={initialBreakpoint}
      handle={showHandle}
    >
      {title !== undefined && (
        <IonHeader>
          <IonToolbar>
            {onBack && (
              <IonButtons slot="start">
                <IonButton onClick={onBack} aria-label="Back">
                  <IonIcon icon={chevronBack} />
                </IonButton>
              </IonButtons>
            )}
            <IonTitle>{title}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose} aria-label="Close">
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
      )}
      {/* The .modal-content class on the auto-rendered IonContent gives
          every Pattern 0/1 modal the same --page-padding inset + a touch
          of vertical breathing room (CSS in app.css). Pattern 2 wizards
          opt out via rawContent — they manage padding via .wizard-step
          on their own per-step IonContent. List-style sheets (UserMenu,
          action lists where each row paints edge-to-edge) opt out via
          flushContent so the per-item padding isn't doubled. */}
      {rawContent
        ? children
        : (
          <IonContent className={flushContent ? undefined : 'modal-content'}>
            {children}
          </IonContent>
        )}
      {footer && (
        <IonFooter>
          <IonToolbar>
            {/* The .modal-footer wrapper standardises layout for single
                or multi-button footers — see app.css. Children laid out
                in a flex row with equal width, 50px height, pill radius,
                consistent gap. Per-modal layouts that want something
                different can opt out by passing their own wrapper as the
                footer prop. */}
            <div className="modal-footer">{footer}</div>
          </IonToolbar>
        </IonFooter>
      )}
    </IonModal>
  )
}
