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

export function CardHeader({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-header ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-body ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-footer ${className}`} {...props}>
      {children}
    </div>
  )
}
