'use client'

import { ChevronRight } from 'lucide-react'
import type { ComponentType } from 'react'

export interface SettingsRowProps {
  icon: ComponentType<{ className?: string }>
  label: string
  value?: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  hideChevron?: boolean
}

/**
 * Standard settings row: icon on the left, label in the middle, optional
 * current-value subtitle on the right, chevron to hint at a navigation
 * action. Tapping the row fires `onClick` (typically opens a modal).
 *
 * Variants:
 * - `danger` — red icon + label text for destructive actions
 * - `hideChevron` — hides the chevron (for rows that aren't navigation,
 *   like the language row where the OS picker is the interaction)
 */
export function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  disabled = false,
  danger = false,
  hideChevron = false,
}: SettingsRowProps) {
  const labelColor = danger ? 'text-error' : 'text-text-primary'
  const iconColor = danger ? 'text-error' : 'text-text-secondary'

  return (
    <button
      type="button"
      className="list-item-clickable list-item-flat w-full disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
      <span className={`flex-1 text-left text-base font-medium truncate ${labelColor}`}>
        {label}
      </span>
      {value && (
        <span className="text-sm text-text-tertiary truncate max-w-[10rem]">
          {value}
        </span>
      )}
      {!hideChevron && (
        <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      )}
    </button>
  )
}
