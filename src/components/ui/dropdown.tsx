'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  position?: 'top' | 'bottom'
  className?: string
  // Controlled mode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Dropdown({
  trigger,
  children,
  align = 'left',
  position = 'bottom',
  className = '',
  isOpen: controlledIsOpen,
  onOpenChange,
}: DropdownProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Use controlled or uncontrolled state
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const setIsOpen = (open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open)
    } else {
      setInternalIsOpen(open)
    }
  }

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isControlled])

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="dropdown-trigger">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`dropdown-content position-${position} align-${align}`}
          role="menu"
        >
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
