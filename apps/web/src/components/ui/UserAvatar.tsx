import type { ReactNode } from 'react'

// Pulls 1–2 letters from a name. Spaces, then first letters; falls back
// to the first two letters of a single-word name; returns "?" for empty.
function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase() || '?'
}

interface UserAvatarProps {
  name: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  ariaLabel?: string
  badge?: ReactNode
  className?: string
}

export function UserAvatar({
  name,
  size = 'md',
  onClick,
  ariaLabel,
  badge,
  className,
}: UserAvatarProps) {
  const initials = getInitials(name)
  const sizeClass = `user-avatar--${size}`
  const cls = ['user-avatar', sizeClass, onClick ? 'user-avatar--button' : '', className]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      <span aria-hidden="true">{initials}</span>
      {badge ? <span className="user-avatar__badge">{badge}</span> : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} aria-label={ariaLabel}>
        {inner}
      </button>
    )
  }

  return <span className={cls}>{inner}</span>
}
