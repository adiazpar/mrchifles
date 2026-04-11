import { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'brand'
    | 'success'
    | 'warning'
    | 'error'
    | 'yape'
    | 'pos'
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
    yape: 'badge-yape',
    pos: 'badge-pos',
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
