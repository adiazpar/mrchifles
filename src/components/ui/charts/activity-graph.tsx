'use client'

export interface ActivityGraphProps {
  /** Array of activity values (0-4 intensity levels) for the last N days */
  data: number[]
  /** Number of columns (days) to show */
  columns?: number
  /** Size of each cell in pixels */
  cellSize?: number
  /** Gap between cells in pixels */
  gap?: number
  /** Color for the activity (uses opacity for intensity) */
  color?: string
  /** Additional CSS classes */
  className?: string
}

export function ActivityGraph({
  data,
  columns = 7,
  cellSize = 12,
  gap = 3,
  color = 'var(--color-brand)',
  className = '',
}: ActivityGraphProps) {
  // Ensure we have the right number of cells
  const cells = data.slice(-columns)
  while (cells.length < columns) {
    cells.unshift(0)
  }

  // Get intensity level (0-4) from value
  const getIntensity = (value: number): number => {
    if (value === 0) return 0
    const max = Math.max(...data)
    if (max === 0) return 0
    const normalized = value / max
    if (normalized <= 0.25) return 1
    if (normalized <= 0.5) return 2
    if (normalized <= 0.75) return 3
    return 4
  }

  const getOpacity = (intensity: number): number => {
    switch (intensity) {
      case 0: return 0.1
      case 1: return 0.25
      case 2: return 0.5
      case 3: return 0.75
      case 4: return 1
      default: return 0.1
    }
  }

  return (
    <div
      className={`inline-flex ${className}`}
      style={{ gap: `${gap}px` }}
      role="img"
      aria-label="Grafico de actividad"
    >
      {cells.map((value, index) => (
        <div
          key={index}
          className="rounded-sm transition-opacity"
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: color,
            opacity: getOpacity(getIntensity(value)),
          }}
          title={`${value}`}
        />
      ))}
    </div>
  )
}
