'use client'

export interface DonutSegment {
  value: number
  color: string
  label: string
}

export interface DonutChartProps {
  /** Array of segments */
  segments: DonutSegment[]
  /** Size of the chart in pixels */
  size?: number
  /** Thickness of the donut stroke */
  strokeWidth?: number
  /** Content to display in the center */
  children?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 20,
  children,
  className = '',
}: DonutChartProps) {
  if (!segments || segments.length === 0) {
    return null
  }

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)

  let accumulatedOffset = 0

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-muted)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {segments.map((segment, index) => {
          const percentage = total > 0 ? segment.value / total : 0
          const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`
          const strokeDashoffset = -accumulatedOffset * circumference

          accumulatedOffset += percentage

          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 ease-out"
            />
          )
        })}
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
