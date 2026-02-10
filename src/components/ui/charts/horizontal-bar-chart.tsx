'use client'

export interface BarData {
  label: string
  value: number
  color?: string
}

export interface HorizontalBarChartProps {
  /** Array of bar data */
  data: BarData[]
  /** Whether to show values on the right */
  showValues?: boolean
  /** Format function for values */
  formatValue?: (value: number) => string
  /** Height of each bar in pixels */
  barHeight?: number
  /** Gap between bars in pixels */
  gap?: number
  /** Additional CSS classes */
  className?: string
}

export function HorizontalBarChart({
  data,
  showValues = true,
  formatValue = (v) => v.toString(),
  barHeight = 24,
  gap = 12,
  className = '',
}: HorizontalBarChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className={`flex flex-col ${className}`} style={{ gap: `${gap}px` }}>
      {data.map((item, index) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
        const barColor = item.color || 'var(--color-brand)'

        return (
          <div key={index} className="flex items-center gap-3">
            <div className="w-20 text-sm text-text-secondary truncate flex-shrink-0">
              {item.label}
            </div>
            <div
              className="flex-1 rounded overflow-hidden"
              style={{
                height: `${barHeight}px`,
                background: 'var(--color-bg-muted)',
              }}
            >
              <div
                className="h-full rounded transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  background: barColor,
                }}
              />
            </div>
            {showValues && (
              <div className="w-16 text-sm font-semibold text-text-primary text-right flex-shrink-0">
                {formatValue(item.value)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
