'use client'

export interface ProgressRingProps {
  /** Progress value (0-100) */
  value: number
  /** Size of the ring in pixels */
  size?: number
  /** Thickness of the ring stroke */
  strokeWidth?: number
  /** Color of the progress stroke */
  color?: string
  /** Background track color */
  trackColor?: string
  /** Content to display in the center */
  children?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = 'var(--color-brand)',
  trackColor = 'var(--color-bg-muted)',
  children,
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(100, Math.max(0, value))
  const strokeDashoffset = circumference - (progress / 100) * circumference

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
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
