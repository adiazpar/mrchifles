'use client'

export interface SparklineProps {
  /** Array of numeric values to plot */
  data: number[]
  /** Width of the sparkline in pixels */
  width?: number
  /** Height of the sparkline in pixels */
  height?: number
  /** Line color (CSS color value) */
  strokeColor?: string
  /** Fill color for area under the line */
  fillColor?: string
  /** Line stroke width */
  strokeWidth?: number
  /** Whether to show the area fill */
  showFill?: boolean
  /** Additional CSS classes */
  className?: string
}

export function Sparkline({
  data,
  width = 100,
  height = 32,
  strokeColor = 'var(--color-brand)',
  fillColor = 'var(--color-brand)',
  strokeWidth = 2,
  showFill = true,
  className = '',
}: SparklineProps) {
  if (!data || data.length === 0) {
    return null
  }

  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  // Generate points for the polyline
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return `${x},${y}`
  })

  const polylinePoints = points.join(' ')

  // Generate path for the filled area
  const areaPath = `M${padding},${padding + chartHeight} L${points.join(' L')} L${padding + chartWidth},${padding + chartHeight} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: '100%', height }}
      aria-hidden="true"
    >
      {showFill && (
        <path
          d={areaPath}
          fill={fillColor}
          opacity={0.15}
        />
      )}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
