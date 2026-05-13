'use client'

import { useIntl } from 'react-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'

interface WeekTrendCardProps {
  isLoading: boolean
  dailyRevenue: { date: string; total: number }[] | null
  thisWeekTotal: number | null
  previousWeekTotal: number | null
  thisWeekSpend: number | null
}

/**
 * "This week" trend card — the third surface in the Home tab, between
 * the Today 2-up grid and the Alerts list. Mirrors the visual vocabulary
 * of RevenueCard (mono eyebrow row, Fraunces italic headline, hairline
 * card on paper) and adds two pieces of new chrome:
 *
 *   1. An inline-SVG sparkline drawn with a Catmull-Rom smoothed curve.
 *      The smoothed line reads as "trend" at this small scale where a
 *      polyline would look angular. Area is filled with a terracotta
 *      wash via color-mix so the curve sits on a tonal halo, not a hard
 *      polygon. Last data point gets a paper-ringed disc so it reads as
 *      "you are here" against the gradient.
 *
 *   2. A mono micro-row beneath the sparkline that pairs an earned
 *      (moss) and an optional spent (ink-2) figure separated by " · ".
 *      Earned is the celebration tone; spent is intentionally neutral
 *      so necessary cost doesn't read as a regression.
 *
 * The single distinctiveness move vs. RevenueCard is a hairline rule
 * between the headline and the sparkline — a printed-edge echo of the
 * card's box-shadow that doubles as a baseline anchor for the curve.
 *
 * Purely presentational — all data is wired in HomeView (Task D).
 */
export function WeekTrendCard({
  isLoading,
  dailyRevenue,
  thisWeekTotal,
  previousWeekTotal,
  thisWeekSpend,
}: WeekTrendCardProps) {
  const intl = useIntl()
  const { business } = useBusiness()
  const { formatCurrency } = useBusinessFormat()

  // Mono eyebrow range ("MAY 6 — MAY 12"). Uses the business locale so
  // the calendar convention matches the currency below. The end date is
  // anchored on the last point of dailyRevenue when present so the
  // eyebrow stays accurate if the upstream window is offset; otherwise
  // we fall back to "today" minus six days.
  const dateRange = useMemo(() => {
    try {
      const locale = business?.locale ?? 'en-US'
      const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
      const end =
        dailyRevenue && dailyRevenue.length > 0
          ? new Date(dailyRevenue[dailyRevenue.length - 1]!.date)
          : new Date()
      const start = new Date(end)
      start.setDate(end.getDate() - 6)
      return `${fmt.format(start).toUpperCase()} — ${fmt.format(end).toUpperCase()}`
    } catch {
      return ''
    }
  }, [business?.locale, dailyRevenue])

  // Locale-aware day label for the scrub chip. Mirrors the eyebrow's
  // uppercase + " · " convention (line ~60) so the two surfaces stay
  // typographically consistent. Memo so we don't rebuild the formatter
  // on every pointermove-driven re-render.
  const formatDayLabel = useMemo(() => {
    const locale = business?.locale ?? 'en-US'
    const fmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    return (isoDate: string) => {
      try {
        return fmt.format(new Date(isoDate)).toUpperCase().replace(', ', ' · ')
      } catch {
        return ''
      }
    }
  }, [business?.locale])

  const values = useMemo(
    () => (dailyRevenue ? dailyRevenue.map((d) => d.total) : []),
    [dailyRevenue],
  )
  const hasAnyValue = values.some((v) => v > 0)
  const { line, area, lastPoint, samples } = useMemo(
    () => computeSparklinePath(values),
    [values],
  )

  const showDelta =
    !isLoading &&
    previousWeekTotal !== null &&
    previousWeekTotal > 0 &&
    thisWeekTotal !== null

  const deltaPct = showDelta
    ? ((thisWeekTotal! - previousWeekTotal!) / previousWeekTotal!) * 100
    : 0

  const showSpend = !isLoading && thisWeekSpend !== null && thisWeekSpend > 0

  return (
    <div className="home-trend">
      <div className="home-trend__eyebrow-row">
        <span className="home-trend__eyebrow">
          {intl.formatMessage({ id: 'home.trend_eyebrow' }, { dateRange })}
        </span>
        {showDelta ? <DeltaChip percent={deltaPct} /> : null}
      </div>

      {isLoading || thisWeekTotal === null ? (
        <div className="home-trend__skeleton" aria-hidden="true" />
      ) : (
        <p className="home-trend__amount">{formatCurrency(thisWeekTotal)}</p>
      )}

      <hr className="home-trend__rule" aria-hidden="true" />

      {isLoading || dailyRevenue === null ? (
        <div className="home-trend__sparkline-skeleton" aria-hidden="true" />
      ) : (
        <Sparkline
          line={line}
          area={area}
          lastPoint={lastPoint}
          hasData={hasAnyValue}
          emptyLabel={intl.formatMessage({ id: 'home.trend_empty' })}
          dailyRevenue={dailyRevenue ?? []}
          samples={samples}
          formatCurrency={formatCurrency}
          formatDayLabel={formatDayLabel}
        />
      )}

      {isLoading ? (
        <div className="home-trend__flow-skeleton" aria-hidden="true" />
      ) : (
        <div className="home-trend__flow">
          {thisWeekTotal !== null ? (
            <span className="home-trend__flow-cell home-trend__flow-cell--earned">
              <TrendingUp className="home-trend__flow-icon" size={12} strokeWidth={2.25} />
              {intl.formatMessage(
                { id: 'home.trend_earned' },
                { amount: formatCurrency(thisWeekTotal) },
              )}
            </span>
          ) : null}
          {showSpend ? (
            <>
              <span className="home-trend__flow-divider" aria-hidden="true">
                ·
              </span>
              <span className="home-trend__flow-cell home-trend__flow-cell--spent">
                <TrendingDown className="home-trend__flow-icon" size={12} strokeWidth={2.25} />
                {intl.formatMessage(
                  { id: 'home.trend_spent' },
                  { amount: formatCurrency(thisWeekSpend!) },
                )}
              </span>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ---------- Sparkline ---------------------------------------------------

interface SparklineProps {
  line: string
  area: string
  lastPoint: { x: number; y: number } | null
  hasData: boolean
  emptyLabel: string
  /** Per-day rows for the scrub chip. Same array passed to the card. */
  dailyRevenue: { date: string; total: number }[]
  /** Curve samples in viewBox space for pointer-x → curve-y lookup. */
  samples: { x: number; y: number }[]
  /** Locale-aware currency formatter (passed from useBusinessFormat). */
  formatCurrency: (n: number) => string
  /** Locale-aware day label, e.g. "WED · MAY 8". */
  formatDayLabel: (isoDate: string) => string
}

/**
 * Inline-SVG sparkline. Lives in the same module as WeekTrendCard
 * because it's small (<40 lines) and has no other consumer — splitting
 * would be ceremony, not separation.
 *
 * Renders:
 *   - A flat baseline rule when there's no data (preserves the card
 *     height so layout doesn't jump when the week is empty) plus an
 *     inline empty-state label.
 *   - The area fill (paint order matters — drawn first so the line and
 *     dot sit on top).
 *   - The smoothed curve.
 *   - A "you are here" disc at the last data point with a paper ring
 *     for separation from the area gradient.
 */
function Sparkline({
  line,
  area,
  lastPoint,
  hasData,
  emptyLabel,
  dailyRevenue,
  samples,
  formatCurrency,
  formatDayLabel,
}: SparklineProps) {
  // Continuous x ratio (0..1) for the dot; snapped index for the chip.
  const [selection, setSelection] = useState<{
    x: number
    index: number
  } | null>(null)

  // Ref to the .home-trend__sparkline-wrap div — used for
  // getBoundingClientRect and the dismiss-on-tap-outside check.
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // True while a pointer capture is active. The dismiss listener gates
  // on this so a mid-drag scroll event doesn't dismiss our own selection.
  const activeDragRef = useRef(false)

  // Pending gesture start point — set on pointerdown, consumed on
  // pointermove once the threshold is met (or on pointerup if not).
  const gestureStartRef = useRef<{
    pointerId: number
    x0: number
    y0: number
    rect: DOMRect
  } | null>(null)

  const SCRUB_THRESHOLD_PX = 6
  const valuesCount = dailyRevenue.length

  const commitSelection = (clientX: number, rect: DOMRect) => {
    const xRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const index = Math.max(
      0,
      Math.min(valuesCount - 1, Math.round(xRatio * Math.max(valuesCount - 1, 1))),
    )
    setSelection({ x: xRatio, index })
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return
    if (valuesCount === 0) return
    // Record the start; do NOT engage yet. We wait for movement that
    // crosses the threshold so vertical page scroll keeps working when a
    // user starts a vertical pull on the sparkline.
    gestureStartRef.current = {
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      rect: e.currentTarget.getBoundingClientRect(),
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDragRef.current) {
      // Already scrubbing — just update.
      const rect = e.currentTarget.getBoundingClientRect()
      commitSelection(e.clientX, rect)
      return
    }
    const start = gestureStartRef.current
    if (!start || start.pointerId !== e.pointerId) return
    const dx = e.clientX - start.x0
    const dy = e.clientY - start.y0
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    if (absDx < SCRUB_THRESHOLD_PX && absDy < SCRUB_THRESHOLD_PX) return
    if (absDy > absDx) {
      // Vertical-dominant — abandon, let page scroll happen.
      gestureStartRef.current = null
      return
    }
    // Horizontal-dominant past threshold — claim the gesture.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Some browsers (rare) throw if the pointer is no longer active.
    }
    activeDragRef.current = true
    commitSelection(e.clientX, start.rect)
  }

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gestureStartRef.current?.pointerId === e.pointerId) {
      gestureStartRef.current = null
    }
    if (!activeDragRef.current) return
    activeDragRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Already released.
    }
    // Leave `selection` as-is — that's the sticky state.
  }

  // Dot position. When the user has a selection, the dot rides the
  // curve at the continuous x. Otherwise it sits at the last data
  // point as before.
  const dotPosition = (() => {
    if (selection) {
      const xPct = selection.x * 100
      const yPct = (lookupSampleY(samples, xPct) / 32) * 100
      return { xPct, yPct }
    }
    if (lastPoint) {
      return { xPct: lastPoint.x, yPct: (lastPoint.y / 32) * 100 }
    }
    return null
  })()

  if (!hasData) {
    return (
      <div className="home-trend__sparkline-empty">
        <svg
          className="home-trend__sparkline"
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          role="img"
          aria-hidden="true"
        >
          <line x1="0" y1="28" x2="100" y2="28" className="home-trend__sparkline-axis" />
        </svg>
        <span className="home-trend__sparkline-empty-label">{emptyLabel}</span>
      </div>
    )
  }

  return (
    <div
      className="home-trend__sparkline-wrap"
      ref={wrapperRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <svg
        className="home-trend__sparkline"
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="home-trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="home-trend__sparkline-stop home-trend__sparkline-stop--top" />
            <stop
              offset="100%"
              className="home-trend__sparkline-stop home-trend__sparkline-stop--bottom"
            />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#home-trend-area)" />
        <path d={line} className="home-trend__sparkline-line" />
      </svg>
      {/* Last-point dot lives in HTML, not inside the SVG, because the
       * SVG uses preserveAspectRatio="none" to stretch the curve across
       * the card width — that stretches an SVG circle into an ellipse.
       * Positioning via percentages on a separately-sized HTML element
       * gives a visually circular dot at every container size. */}
      {dotPosition ? (
        <span
          className="home-trend__sparkline-dot"
          style={{
            left: `${dotPosition.xPct}%`,
            top: `${dotPosition.yPct}%`,
          }}
          aria-hidden="true"
        />
      ) : null}
      {selection && dailyRevenue[selection.index] ? (
        <div
          className="home-trend__sparkline-chip"
          style={{
            left: `${selection.x * 100}%`,
            // 0..0.15 → snap left, 0.85..1 → snap right, else center.
            // Thresholds keep a ~110px chip from clipping a ~320px-min card.
            ['--chip-shift' as string]:
              selection.x < 0.15 ? '0%' :
              selection.x > 0.85 ? '-100%' :
              '-50%',
          }}
          aria-hidden="true"
        >
          <span className="home-trend__sparkline-chip-day">
            {formatDayLabel(dailyRevenue[selection.index]!.date)}
          </span>
          <span className="home-trend__sparkline-chip-amount">
            {formatCurrency(dailyRevenue[selection.index]!.total)}
          </span>
        </div>
      ) : null}
    </div>
  )
}

// ---------- Delta chip --------------------------------------------------

function DeltaChip({ percent }: { percent: number }) {
  const intl = useIntl()
  const isUp = percent >= 0
  // Match RevenueCard's rounding so the two chips read the same way.
  const display = Math.round(Math.abs(percent)).toString()
  return (
    <span className={`home-trend__delta home-trend__delta--${isUp ? 'up' : 'down'}`}>
      {intl.formatMessage(
        { id: isUp ? 'home.trend_delta_up' : 'home.trend_delta_down' },
        { percent: isUp ? display : `-${display}` },
      )}
    </span>
  )
}

// ---------- Sparkline math ---------------------------------------------

interface SparklineGeometry {
  line: string
  area: string
  lastPoint: { x: number; y: number } | null
  /** Points evaluated along the bezier curve, in viewBox space
   *  (x in [0, 100], y in [0, height]). Strictly non-decreasing in x. */
  samples: { x: number; y: number }[]
}

/**
 * Maps a series of daily totals to an SVG path string. Uses a
 * Catmull-Rom-to-cubic-Bezier conversion so the curve reads as a
 * continuous trend rather than a 6-segment polyline. Tension 0.5
 * (the canonical Catmull-Rom value) avoids the loops a tighter
 * tension would introduce on a steep single-day spike.
 *
 *   - Width 100 / height 32 / vertical padding 4 means the chart sits
 *     in 4..28 vertically, leaving 4px of breathing room top and
 *     bottom for the dot and gradient.
 *   - Baseline is always min=0 so a flat-zero day reads as the bottom
 *     of the chart, not the middle (which would look like a negative
 *     trend).
 *   - When max=0 we collapse to a centered flat line; the parent
 *     component renders the empty-state label instead.
 */
function computeSparklinePath(
  values: number[],
  width = 100,
  height = 32,
  padY = 4,
): SparklineGeometry {
  if (values.length === 0) {
    return { line: '', area: '', lastPoint: null, samples: [] }
  }

  const max = Math.max(...values, 0)
  const min = 0
  const xStep = width / Math.max(values.length - 1, 1)
  const usableH = height - padY * 2

  const points = values.map((v, i) => {
    const x = i * xStep
    const y =
      max > min ? padY + (1 - (v - min) / (max - min)) * usableH : height / 2
    return { x, y }
  })

  // Catmull-Rom-to-Bezier. For each segment p1->p2 we compute control
  // points from the neighbouring points (p0, p3). Endpoints duplicate
  // themselves so the curve doesn't overshoot.
  const SAMPLES_PER_SEGMENT = 32
  const samples: { x: number; y: number }[] = [{ x: points[0]!.x, y: points[0]!.y }]
  const tension = 0.5
  let line = `M ${round(points[0]!.x)} ${round(points[0]!.y)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2
    line += ` C ${round(cp1x)} ${round(cp1y)}, ${round(cp2x)} ${round(cp2y)}, ${round(p2.x)} ${round(p2.y)}`
    // Evaluate the cubic at t = 1/N..1 (skipping t=0 since the previous
    // segment's endpoint already covers it). Standard Bernstein basis.
    for (let s = 1; s <= SAMPLES_PER_SEGMENT; s++) {
      const t = s / SAMPLES_PER_SEGMENT
      const u = 1 - t
      const x =
        u * u * u * p1.x +
        3 * u * u * t * cp1x +
        3 * u * t * t * cp2x +
        t * t * t * p2.x
      const y =
        u * u * u * p1.y +
        3 * u * u * t * cp1y +
        3 * u * t * t * cp2y +
        t * t * t * p2.y
      samples.push({ x, y })
    }
  }

  // Area closes the curve back to the baseline. Drop straight down to
  // the bottom-right corner, run along the bottom, and up to the
  // start — the gradient stops do the visual fade.
  const area = `${line} L ${round(width)} ${round(height)} L 0 ${round(height)} Z`

  return {
    line,
    area,
    lastPoint: points[points.length - 1] ?? null,
    samples,
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Look up the bezier curve's y at a given viewBox x. Samples must be
 * sorted by x ascending (which they are by construction in
 * computeSparklinePath). Returns 0 for an empty samples array and
 * clamps to the first/last sample's y outside the sampled range.
 */
function lookupSampleY(
  samples: { x: number; y: number }[],
  xViewBox: number,
): number {
  if (samples.length === 0) return 0
  if (xViewBox <= samples[0]!.x) return samples[0]!.y
  const last = samples[samples.length - 1]!
  if (xViewBox >= last.x) return last.y
  // Binary search for the segment that contains xViewBox.
  let lo = 0
  let hi = samples.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1
    if (samples[mid]!.x <= xViewBox) lo = mid
    else hi = mid
  }
  const a = samples[lo]!
  const b = samples[hi]!
  // Linear interpolate between the two nearest samples. With ~32
  // samples per segment the spacing is small enough that a linear
  // interp visually matches the curve.
  const t = (xViewBox - a.x) / (b.x - a.x)
  return a.y + (b.y - a.y) * t
}
