'use client'

export interface RoleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

export function RoleCard({ icon, title, description, selected, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left w-full ${
        selected
          ? 'border-brand bg-bg-elevated'
          : 'border-border hover:border-brand-300'
      }`}
    >
      <div className="product-list-image">
        <span className={selected ? 'text-brand' : 'text-text-tertiary'}>
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="block font-semibold text-text-primary">{title}</span>
        <span className="block text-sm text-text-tertiary leading-tight mt-0.5">
          {description}
        </span>
      </div>
    </button>
  )
}
