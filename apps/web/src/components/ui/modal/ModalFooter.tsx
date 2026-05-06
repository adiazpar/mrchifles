// src/components/ui/modal/ModalFooter.tsx
'use client'

import type { ModalFooterProps } from './types'

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`modal-footer-row ${className}`}>
      {children}
    </div>
  )
}
