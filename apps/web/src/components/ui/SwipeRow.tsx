import {
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
} from '@ionic/react'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

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
const STAGGER_STEP = 0.10

// Per-chip lerp speed in [0,1]. Rightmost is fastest, leftmost is slowest;
// the speed gap is what produces the visible stagger when the user swipes
// fast enough that the ratio jumps from 0 to 1 in a single ionDrag tick.
// Lower speed = more lag = more visible right-to-left reveal.
const SPEED_RIGHTMOST = 0.45
const SPEED_STEP = 0.12

type DragDetail = { amount: number; ratio: number }

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

// Per-chip target scale from the live drag ratio. Right-to-left reveal:
// position 0 = leftmost, count-1 = rightmost. Rightmost uses the base
// threshold; each chip further left needs an extra STAGGER_STEP of drag
// before it starts scaling in.
function chipTarget(
  ratio: number,
  idx: number,
  count: number,
  threshold: number,
): number {
  const reverseIdx = count - 1 - idx
  const eff = threshold + reverseIdx * STAGGER_STEP
  if (eff >= 1) return 0
  return clamp01((ratio - eff) / (1 - eff))
}

export function SwipeRow({
  actions,
  threshold = 0.5,
  children,
}: SwipeRowProps) {
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null)
  const trimmed = actions.slice(0, MAX_ACTIONS)
  if (actions.length > MAX_ACTIONS && import.meta.env.DEV) {
    console.warn(
      `SwipeRow supports at most ${MAX_ACTIONS} actions; received ${actions.length}. Extras ignored.`,
    )
  }

  const count = trimmed.length
  const targetScales = useRef<number[]>([])
  const displayScales = useRef<number[]>([])
  const chipRefs = useRef<(HTMLSpanElement | null)[]>([])
  const rafRef = useRef<number | null>(null)

  // Keep buffers sized to the current action count without rebuilding state.
  if (targetScales.current.length !== count) {
    targetScales.current = new Array(count).fill(0)
    displayScales.current = new Array(count).fill(0)
    chipRefs.current = new Array(count).fill(null)
  }

  const writeChip = (i: number) => {
    const el = chipRefs.current[i]
    if (el) {
      el.style.setProperty('--swipe-scale', displayScales.current[i].toFixed(3))
    }
  }

  const tick = () => {
    let needsMore = false
    for (let i = 0; i < count; i++) {
      const target = targetScales.current[i]
      const current = displayScales.current[i]
      const reverseIdx = count - 1 - i
      const speed = SPEED_RIGHTMOST - reverseIdx * SPEED_STEP
      const delta = target - current
      if (Math.abs(delta) < 0.005) {
        displayScales.current[i] = target
      } else {
        displayScales.current[i] = current + delta * speed
        needsMore = true
      }
      writeChip(i)
    }
    rafRef.current = needsMore ? requestAnimationFrame(tick) : null
  }

  const kick = () => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  const onDrag = (e: CustomEvent<DragDetail>) => {
    const ratio = clamp01(Math.abs(e.detail.ratio))
    for (let i = 0; i < count; i++) {
      targetScales.current[i] = chipTarget(ratio, i, count, threshold)
    }
    kick()
  }

  // Ionic stamps .item-sliding-closing on the host for ~600ms while it
  // auto-animates the row back to 0, and stops emitting ionDrag during
  // that window. Watch for the class and drive every chip's target to 0
  // so the left-to-right close stagger plays via the per-chip speed gap.
  useEffect(() => {
    const host = slidingRef.current
    if (!host) return
    const observer = new MutationObserver(() => {
      if (host.classList.contains('item-sliding-closing')) {
        for (let i = 0; i < count; i++) {
          targetScales.current[i] = 0
        }
        kick()
      }
    })
    observer.observe(host, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
    // count is stable for the lifetime of a given action set; including
    // it in deps just makes the observer re-attach if the call site
    // swaps action arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <IonItemSliding
      ref={slidingRef}
      className="swipe-row"
      onIonDrag={onDrag}
    >
      {children}
      {count > 0 && (
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
              <span
                ref={(el) => { chipRefs.current[i] = el }}
                className="swipe-row__chip-wrap"
                aria-label={action.label}
              >
                <span className="swipe-row__chip">{action.icon}</span>
                <span className="swipe-row__label">{action.label}</span>
              </span>
            </IonItemOption>
          ))}
        </IonItemOptions>
      )}
    </IonItemSliding>
  )
}
