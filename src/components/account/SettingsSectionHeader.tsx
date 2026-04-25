export interface SettingsSectionHeaderProps {
  label: string
  danger?: boolean
  noTopMargin?: boolean
}

/**
 * Small uppercase label above a settings section. Use the `danger`
 * variant for the Danger Zone grouping (red-tinted text). Set
 * `noTopMargin` for the first section on a page so it sits flush
 * with the page content's top padding.
 */
export function SettingsSectionHeader({
  label,
  danger = false,
  noTopMargin = false,
}: SettingsSectionHeaderProps) {
  const topMargin = noTopMargin ? 'mt-0' : 'mt-6'
  return (
    <h2
      className={`text-xs font-medium uppercase tracking-wider px-1 ${topMargin} mb-2 ${
        danger ? 'text-error' : 'text-text-tertiary'
      }`}
    >
      {label}
    </h2>
  )
}
