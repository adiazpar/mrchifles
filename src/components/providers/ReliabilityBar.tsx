interface ReliabilityBarProps {
  percent: number
  /** Visually-hidden label, e.g. "Reliability: 79 percent". */
  ariaLabel: string
}

export function ReliabilityBar({ percent, ariaLabel }: ReliabilityBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="w-full h-2 rounded-full overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-muted)' }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${clamped}%`,
          backgroundColor: 'var(--color-success)',
          transition: 'width var(--duration-slow, 300ms) ease-out',
        }}
      />
    </div>
  )
}
