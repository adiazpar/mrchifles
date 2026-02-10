import { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'brand'
    | 'success'
    | 'warning'
    | 'error'
    | 'cash'
    | 'yape'
    | 'plin'
}

export function Badge({
  variant = 'default',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variantClasses: Record<string, string> = {
    default: 'badge-default',
    brand: 'badge-brand',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    cash: 'badge-cash',
    yape: 'badge-yape',
    plin: 'badge-plin',
  }

  return (
    <span
      className={`badge ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
