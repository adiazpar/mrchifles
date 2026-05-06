'use client'

import { useIntl } from 'react-intl';
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

// Drag-to-dismiss thresholds — same shape as the modal drawer system so the
// behavior feels uniform across the app.
const DRAG_DISTANCE_RATIO = 0.30
const DRAG_VELOCITY_PX_S = 600

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && <BottomSheetInner onClose={onClose} title={title}>{children}</BottomSheetInner>}
    </AnimatePresence>,
    document.body,
  )
}

function BottomSheetInner({
  onClose,
  title,
  children,
}: {
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  const t = useIntl()
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Drag is initiated only by the handle / header pointer-down (not the body).
  // Buttons inside the header stop propagation so taps don't initiate drags.
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    dragControls.start(e)
  }

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const sheetHeight = sheetRef.current?.offsetHeight ?? window.innerHeight
    const shouldClose =
      info.offset.y > sheetHeight * DRAG_DISTANCE_RATIO ||
      info.velocity.y > DRAG_VELOCITY_PX_S
    if (shouldClose) onClose()
    // Otherwise framer-motion springs y back to 0.
  }

  return (
    <motion.div
      className="bottom-sheet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        ref={sheetRef}
        className="bottom-sheet"
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
        <div className="bottom-sheet-handle" onPointerDown={handleHeaderPointerDown}>
          <div className="bottom-sheet-handle-bar" />
        </div>

        {title && (
          <div className="bottom-sheet-header" onPointerDown={handleHeaderPointerDown}>
            <h3 className="bottom-sheet-title">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="bottom-sheet-close"
              aria-label={t.formatMessage({
                id: 'common.close'
              })}
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="bottom-sheet-content">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
