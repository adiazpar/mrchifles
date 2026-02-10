'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { IconX, IconCheckCircle, IconAlertCircle } from '@/components/icons'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, type, message }])

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[]
  onRemove: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast
  onRemove: (id: string) => void
}) {
  const typeClasses: Record<ToastType, string> = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: '',
  }

  const icons: Record<ToastType, ReactNode> = {
    success: <IconCheckCircle className="w-5 h-5 text-success flex-shrink-0" />,
    error: <IconAlertCircle className="w-5 h-5 text-error flex-shrink-0" />,
    warning: <IconAlertCircle className="w-5 h-5 text-warning flex-shrink-0" />,
    info: <IconAlertCircle className="w-5 h-5 text-brand flex-shrink-0" />,
  }

  return (
    <div className={`toast animate-slideInRight ${typeClasses[toast.type]}`}>
      {icons[toast.type]}
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm flex-shrink-0"
        onClick={() => onRemove(toast.id)}
        aria-label="Cerrar notificacion"
      >
        <IconX className="w-4 h-4" />
      </button>
    </div>
  )
}
