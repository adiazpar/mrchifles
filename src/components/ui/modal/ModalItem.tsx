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
