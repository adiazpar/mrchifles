'use client'

import { LottiePlayer } from './LottiePlayer'

interface EmptyStateAnimationProps {
  className?: string
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyStateAnimation({
  className = '',
  title,
  description,
  action
}: EmptyStateAnimationProps) {
  return (
    <div className={`empty-state-animated ${className}`} role="status">
      <div className="empty-state-lottie" aria-hidden="true">
        <LottiePlayer
          src="/animations/empty-box.json"
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action}
    </div>
  )
}
