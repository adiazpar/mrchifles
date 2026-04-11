'use client'

import { useTranslations } from 'next-intl'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const t = useTranslations('ui.spinner')

  const sizeClasses: Record<string, string> = {
    sm: 'spinner-sm',
    md: '',
    lg: 'spinner-lg',
  }

  return (
    <div
      className={`spinner ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={t('loading')}
    >
      <span className="sr-only">{t('loading')}</span>
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  )
}
