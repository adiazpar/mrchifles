import { ButtonHTMLAttributes, forwardRef } from 'react'
import { IconLoader } from '@/components/icons'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'cash' | 'yape' | 'plin'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon = false,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses: Record<string, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
      cash: 'btn-cash',
      yape: 'btn-yape',
      plin: 'btn-plin',
    }

    const sizeClasses: Record<string, string> = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    }

    const classes = [
      'btn',
      variantClasses[variant],
      sizeClasses[size],
      icon ? 'btn-icon' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <IconLoader className="w-5 h-5" />
            <span className="sr-only">Cargando...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
