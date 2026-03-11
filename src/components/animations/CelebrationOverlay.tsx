'use client'

import { useEffect, useState } from 'react'
import { LottiePlayer } from './LottiePlayer'

interface CelebrationOverlayProps {
  isVisible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  stats?: Array<{ label: string; value: string }>
}

export function CelebrationOverlay({
  isVisible,
  onClose,
  title,
  subtitle,
  stats
}: CelebrationOverlayProps) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isVisible) {
      // Slight delay before showing content for better animation
      const timer = setTimeout(() => setShowContent(true), 300)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className="celebration-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      {/* Confetti animation in background - plays once */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-hidden="true"
      >
        <LottiePlayer
          src="/animations/confetti-celebration.json"
          loop={false}
          autoplay={true}
          speed={1}
          style={{ width: '100%', height: '100%', maxWidth: '600px' }}
        />
      </div>

      {/* Content card */}
      {showContent && (
        <div className="celebration-content" onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-2)' }} aria-hidden="true">
            &#127881;
          </div>
          <h2
            id="celebration-title"
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              margin: 'var(--space-2) 0 0 0'
            }}>
              {subtitle}
            </p>
          )}
          {stats && stats.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
              gap: 'var(--space-4)',
              marginTop: 'var(--space-6)',
              padding: 'var(--space-4)',
              background: 'var(--color-bg-muted)',
              borderRadius: 'var(--radius-lg)',
              width: '100%'
            }}>
              {stats.map((stat, idx) => (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-text-primary)'
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    marginTop: 'var(--space-1)'
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            className="btn btn-primary btn-lg"
            onClick={onClose}
            style={{ marginTop: 'var(--space-6)', minWidth: '200px' }}
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  )
}
