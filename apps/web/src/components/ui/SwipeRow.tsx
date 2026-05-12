import {
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
} from '@ionic/react'
import type { CSSProperties, ReactNode } from 'react'
import { useRef } from 'react'

export type SwipeActionVariant = 'primary' | 'warning' | 'danger' | 'neutral'

export interface SwipeAction {
  id: string
  icon: ReactNode
  label: string
  variant?: SwipeActionVariant
  disabled?: boolean
  onClick: () => void
}

export interface SwipeRowProps {
  actions: SwipeAction[]
  threshold?: number
  children: ReactNode
}

const MAX_ACTIONS = 3

type DragDetail = { amount: number; ratio: number }

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

export function SwipeRow({
  actions,
  threshold = 0.5,
  children,
}: SwipeRowProps) {
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null)
  const rafToken = useRef<number | null>(null)
  const pendingRatio = useRef<number>(0)

  const trimmed = actions.slice(0, MAX_ACTIONS)
  if (actions.length > MAX_ACTIONS && import.meta.env.DEV) {
    console.warn(
      `SwipeRow supports at most ${MAX_ACTIONS} actions; received ${actions.length}. Extras ignored.`,
    )
  }

  const onDrag = (e: CustomEvent<DragDetail>) => {
    const host = e.currentTarget as HTMLElement | null
    if (!host) return
    pendingRatio.current = clamp01(Math.abs(e.detail.ratio))
    if (rafToken.current === null) {
      rafToken.current = requestAnimationFrame(() => {
        rafToken.current = null
        host.style.setProperty('--swipe-ratio', pendingRatio.current.toFixed(3))
      })
    }
  }

  return (
    <IonItemSliding
      ref={slidingRef}
      className="swipe-row"
      onIonDrag={onDrag}
      style={{ '--swipe-threshold': threshold } as CSSProperties}
    >
      {children}
      {trimmed.length > 0 && (
        <IonItemOptions side="end" className="swipe-row__options">
          {trimmed.map((action, i) => (
            <IonItemOption
              key={action.id}
              className={`swipe-row__option swipe-row__option--${action.variant ?? 'neutral'}`}
              style={{ '--swipe-idx': i } as CSSProperties}
              disabled={action.disabled}
              onClick={() => {
                if (action.disabled) return
                slidingRef.current?.close()
                action.onClick()
              }}
            >
              <span className="swipe-row__chip" aria-label={action.label}>
                {action.icon}
              </span>
            </IonItemOption>
          ))}
        </IonItemOptions>
      )}
    </IonItemSliding>
  )
}
