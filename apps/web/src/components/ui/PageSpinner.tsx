import { IonSpinner } from '@ionic/react'

interface PageSpinnerProps {
  /** Glyph size. Defaults to md (32px). */
  size?: 'sm' | 'md' | 'lg'
  /** Optional className passthrough on the wrapping element. */
  className?: string
}

// Page-level loading spinner. Always centers within the nearest
// positioned ancestor via absolute + grid place-items, so it works
// regardless of whether the parent is a flex container, has a defined
// height, or is an IonContent inner scroll container.
//
// For inline / button spinners use <IonSpinner> directly — those have
// different layout needs (sit inline beside a label, no full-bleed
// centering).
export function PageSpinner({ size = 'md', className }: PageSpinnerProps) {
  const cls = ['page-spinner', `page-spinner--${size}`, className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      <IonSpinner name="crescent" />
    </div>
  )
}
