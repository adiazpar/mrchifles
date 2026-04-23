import { HTMLAttributes, forwardRef } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered'
  padding?: 'none' | 'md' | 'lg'
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'default', padding = 'none', interactive = false, className = '', children, ...props },
    ref
  ) => {
    const variantClasses: Record<string, string> = {
      default: '',
      bordered: 'card-bordered',
    }

    const paddingClasses: Record<string, string> = {
      none: '',
      md: 'card-padding',
      lg: 'card-padding-lg',
    }

    const classes = [
      'card',
      variantClasses[variant],
      paddingClasses[padding],
      interactive ? 'card-interactive' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
