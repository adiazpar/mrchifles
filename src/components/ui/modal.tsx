'use client'

import { Fragment, ReactNode } from 'react'
import { IconX } from '@/components/icons'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  if (!isOpen) return null

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="modal-backdrop animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`modal ${sizeClasses[size]} pointer-events-auto animate-scaleIn`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {title && (
            <div className="modal-header">
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="modal-body">{children}</div>

          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </Fragment>
  )
}
