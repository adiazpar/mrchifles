import { createContext, useCallback, useContext, useRef } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { UseCreateBusinessReturn } from '@/hooks'
import { NameStep } from './steps/NameStep'

// ---------------------------------------------------------------------------
// Nav ref context — steps call navRef.current?.push / .pop to navigate.
// ---------------------------------------------------------------------------

export const NavRefContext = createContext<React.RefObject<HTMLIonNavElement | null> | null>(null)

export function useNavRef(): React.RefObject<HTMLIonNavElement | null> {
  const ctx = useContext(NavRefContext)
  if (!ctx) throw new Error('useNavRef must be used inside CreateBusinessModal')
  return ctx
}

// ---------------------------------------------------------------------------
// createBusiness prop context — all form state and actions live here.
// ---------------------------------------------------------------------------

export const CreateBusinessContext = createContext<UseCreateBusinessReturn | null>(null)

export function useCreateBusinessCtx(): UseCreateBusinessReturn {
  const ctx = useContext(CreateBusinessContext)
  if (!ctx) throw new Error('useCreateBusinessCtx must be used inside CreateBusinessModal')
  return ctx
}

// ---------------------------------------------------------------------------
// Modal root
// ---------------------------------------------------------------------------

interface CreateBusinessModalProps {
  createBusiness: UseCreateBusinessReturn
}

export function CreateBusinessModal({ createBusiness }: CreateBusinessModalProps) {
  const { isOpen, handleClose, handleExitComplete } = createBusiness
  const navRef = useRef<HTMLIonNavElement>(null)

  // Combine close + exit-complete so ModalShell's single onClose covers both.
  // IonModal fires onDidDismiss (mapped to onClose) after the dismiss animation,
  // so state reset happens at the right moment.
  const onClose = useCallback(() => {
    handleClose()
    handleExitComplete()
  }, [handleClose, handleExitComplete])

  // Stable root thunk — useCallback with [] so IonNav never remounts the step
  // stack due to a new function reference produced on every parent render.
  const nameStepRoot = useCallback(() => <NameStep />, [])

  return (
    <CreateBusinessContext.Provider value={createBusiness}>
      <NavRefContext.Provider value={navRef}>
        <ModalShell isOpen={isOpen} onClose={onClose} rawContent>
          <IonNav ref={navRef} root={nameStepRoot} swipeGesture={false} />
        </ModalShell>
      </NavRefContext.Provider>
    </CreateBusinessContext.Provider>
  )
}
