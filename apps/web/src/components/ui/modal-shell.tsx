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
  /** Body content. For Pattern 2 wizards, pass <IonNav root={...} /> here. */
  children: ReactNode
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
 *   - Pattern 2: pass `<IonNav root={() => <FirstStep />} />` as `children`.
 *     Each step component renders its own IonHeader/IonContent. Generally
 *     omit `title` here — IonNav stack handles its own headers per step.
 */
export function ModalShell({
  isOpen,
  onClose,
  title,
  variant = 'full',
  onBack,
  footer,
  children,
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
      keepContentsMounted
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
      <IonContent>{children}</IonContent>
      {footer && (
        <IonFooter>
          <IonToolbar>{footer}</IonToolbar>
        </IonFooter>
      )}
    </IonModal>
  )
}
