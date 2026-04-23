export interface SettingsSectionHeaderProps {
  label: string
  danger?: boolean
}

/**
 * Small uppercase label above a settings section. Use the `danger`
 * variant for the Danger Zone grouping (red-tinted text).
 */
export function SettingsSectionHeader({ label, danger = false }: SettingsSectionHeaderProps) {
  return (
    <h2
      className={`text-xs font-medium uppercase tracking-wider px-1 mt-6 mb-2 ${
        danger ? 'text-error' : 'text-text-tertiary'
      }`}
    >
      {label}
    </h2>
  )
}
