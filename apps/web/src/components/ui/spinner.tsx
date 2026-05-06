'use client'

import { useIntl } from 'react-intl';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const t = useIntl()

  const sizeClasses: Record<string, string> = {
    sm: '',
    md: '',
    lg: 'spinner-lg',
  }

  return (
    <div
      className={`spinner ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={t.formatMessage({
        id: 'ui.spinner.loading'
      })}
    >
      <span className="sr-only">{t.formatMessage({
        id: 'ui.spinner.loading'
      })}</span>
    </div>
  );
}
