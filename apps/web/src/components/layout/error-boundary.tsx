'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  /** Renders when a descendant throws. Receives the error and a reset fn. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  /** Fired when an error is caught — useful for telemetry. */
  onError?: (error: Error, info: ErrorInfo) => void
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Top-level guard. Without this, a render-time throw anywhere in the tree
 * unmounts the whole app — and any IonModal portals attached to <body> get
 * orphaned with their backdrop still painted, which presents as "blank screen
 * + bricked taps" on iOS Safari.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
    this.props.onError?.(error, info)
    this.cleanupOrphanedOverlays()
  }

  /**
   * iOS Safari can leave Ionic overlay nodes (ion-modal, ion-backdrop, etc.)
   * attached to <body> after a tree unmount, which keeps the screen looking
   * dimmed and blocks taps. Strip them so the fallback is actually usable.
   */
  cleanupOrphanedOverlays() {
    if (typeof document === 'undefined') return
    document
      .querySelectorAll(
        'ion-modal, ion-backdrop, ion-popover, ion-action-sheet, ion-alert',
      )
      .forEach((el) => el.remove())
    document.body.classList.remove('backdrop-no-scroll')
    document.body.style.removeProperty('overflow')
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      const { fallback } = this.props
      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset)
      }
      if (fallback !== undefined) return fallback
      return <DefaultFallback error={this.state.error} onReset={this.reset} />
    }
    return this.props.children
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
        background: 'var(--color-bg-base, #fff)',
        color: 'var(--color-text-primary, #111)',
      }}
    >
      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
        Something went wrong
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary, #555)',
          maxWidth: '32ch',
        }}
      >
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--color-border, #ddd)',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'var(--color-brand, #0a84ff)',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    </div>
  )
}
