import type { ReactNode } from 'react'

interface FeatureCardProps {
  kicker?: ReactNode
  title: ReactNode
  description?: ReactNode
  primary?: boolean
  onClick?: () => void
  className?: string
  ariaLabel?: string
}

const ArrowIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="13 6 19 12 13 18" />
  </svg>
)

export function FeatureCard({
  kicker,
  title,
  description,
  primary,
  onClick,
  className,
  ariaLabel,
}: FeatureCardProps) {
  const cls = ['feature-card', primary ? 'feature-card--primary' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} onClick={onClick} aria-label={ariaLabel}>
      <span className="feature-card__body">
        {kicker ? <span className="feature-card__kicker">{kicker}</span> : null}
        <span className="feature-card__title">{title}</span>
        {description ? (
          <span className="feature-card__desc">{description}</span>
        ) : null}
      </span>
      <span className="feature-card__arrow">{ArrowIcon}</span>
    </button>
  )
}
