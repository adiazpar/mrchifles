'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { IconClose } from '@/components/icons'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Handle touch events for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
    const delta = currentY.current - startY.current

    // Only allow swiping down
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }

  const handleTouchEnd = () => {
    const delta = currentY.current - startY.current

    // If swiped more than 100px, close the sheet
    if (delta > 100) {
      onClose()
    } else if (sheetRef.current) {
      // Reset position
      sheetRef.current.style.transform = ''
    }

    startY.current = 0
    currentY.current = 0
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="bottom-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar for swipe gesture indicator */}
        <div className="bottom-sheet-handle">
          <div className="bottom-sheet-handle-bar" />
        </div>

        {/* Header */}
        {title && (
          <div className="bottom-sheet-header">
            <h3 className="bottom-sheet-title">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="bottom-sheet-close"
              aria-label="Cerrar"
            >
              <IconClose width={20} height={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  )
}
