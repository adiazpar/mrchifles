import type { ReactNode } from 'react'

interface GroupLabelProps {
  children: ReactNode
  count?: number
  tone?: 'default' | 'danger'
  className?: string
}

export function GroupLabel({ children, count, tone = 'default', className }: GroupLabelProps) {
  const cls = [
    'group-label',
    tone === 'danger' ? 'group-label--danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      <span>{children}</span>
      {typeof count === 'number' ? (
        <span className="group-label__count">
          {count.toString().padStart(2, '0')}
        </span>
      ) : null}
    </div>
  )
}
