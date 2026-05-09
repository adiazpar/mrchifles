'use client'

import { Check } from 'lucide-react'

export interface RoleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

/**
 * Mercantile-vocab role card. Hairline frame on cream paper, Fraunces
 * italic role name, Geist body description, mono uppercase tick on the
 * trailing edge. Selected state pushes the border to terracotta and
 * tints the background brand-subtle.
 *
 * Used inside InviteRoleStep (and any future role-pick surface). Acts
 * as a visual radio button — `aria-pressed` carries the selected state
 * for assistive tech.
 */
export function RoleCard({ icon, title, description, selected, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="tm-invite__role-card"
    >
      <span className="tm-invite__role-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="tm-invite__role-body">
        <span className="tm-invite__role-name">{title}</span>
        <span className="tm-invite__role-desc">{description}</span>
      </span>
      <span className="tm-invite__role-tick" aria-hidden="true">
        <Check size={12} strokeWidth={3} />
      </span>
    </button>
  )
}
