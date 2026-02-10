'use client'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  className?: string
  color?: string
  showArea?: boolean
}

export function Sparkline({
  data,
  width = 100,
  height = 32,
  className = '',
  color = 'var(--color-brand)',
  showArea = true,
}: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  // Normalize data points to SVG coordinates
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height * 0.9 - height * 0.05
    return `${x},${y}`
  })

  const linePath = points.join(' ')
  const areaPath = `M0,${height} L${linePath} L${width},${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      style={{ overflow: 'visible' }}
    >
      {showArea && (
        <path
          d={areaPath}
          fill={color}
          opacity="0.15"
        />
      )}
      <polyline
        points={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End point dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height * 0.9 - height * 0.05}
        r="3"
        fill={color}
      />
    </svg>
  )
}

// Mini variant for inline use
export function MiniSparkline({
  data,
  trend,
  className = '',
}: {
  data: number[]
  trend: 'up' | 'down' | 'neutral'
  className?: string
}) {
  const trendColors = {
    up: 'var(--color-success)',
    down: 'var(--color-error)',
    neutral: 'var(--color-text-tertiary)',
  }

  return (
    <Sparkline
      data={data}
      width={60}
      height={24}
      color={trendColors[trend]}
      showArea={false}
      className={className}
    />
  )
}
