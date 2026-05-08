import { type ReactNode } from 'react'
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
}: ModalShellProps) {
  const breakpoints = variant === 'full' ? [0, 1] : [0, 0.5, 1]
  const initialBreakpoint = variant === 'full' ? 1 : 0.5

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      breakpoints={breakpoints}
      initialBreakpoint={initialBreakpoint}
      handle
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
      {rawContent ? children : <IonContent>{children}</IonContent>}
      {footer && (
        <IonFooter>
          <IonToolbar>{footer}</IonToolbar>
        </IonFooter>
      )}
    </IonModal>
  )
}
