// src/components/ui/modal/ModalItem.tsx
'use client'

import type { ModalItemProps } from './types'

interface InternalItemProps extends ModalItemProps {
  _index?: number
}

export function ModalItem({ children, className = '' }: InternalItemProps) {
  // The .modal-step-item class is purely a marker for external consumers
  // (e.g. ProductForm.tsx). Step-content fade lives on the wrapper —
  // .modal-step-content-exit / .modal-step-content-enter — so individual
  // items no longer need their own animation-delay.
  return (
    <div className={`modal-step-item ${className}`}>
      {children}
    </div>
  )
}
