import { useIntl } from 'react-intl'
import Image from '@/lib/Image'

const ChevronRight = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
)

// Stable colour palette for business marks. Keyed off business id so a
// given business always renders the same hue across sessions.
const MARK_COLORS = [
  '#B5471F', // terracotta
  '#2F4F3C', // moss
  '#2C334D', // indigo
  '#5C5824', // olive
  '#7A3D52', // mulberry
] as const

function pickMarkColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return MARK_COLORS[Math.abs(hash) % MARK_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase() || '?'
}

const KNOWN_BUSINESS_TYPES = new Set([
  'food',
  'retail',
  'services',
  'wholesale',
  'manufacturing',
  'other',
])

interface BusinessRowData {
  id: string
  name: string
  memberCount: number
  type?: string | null
  icon?: string | null
}

interface BusinessRowProps {
  business: BusinessRowData
  onClick?: () => void
  className?: string
}

export function BusinessRow({ business, onClick, className }: BusinessRowProps) {
  const intl = useIntl()

  const typeLabel = business.type && KNOWN_BUSINESS_TYPES.has(business.type)
    ? intl.formatMessage({ id: `createBusiness.business_type_${business.type}` })
    : null

  const cls = ['business-row', className].filter(Boolean).join(' ')

  return (
    <button type="button" className={cls} onClick={onClick}>
      <span
        className="business-row__mark"
        style={{ background: pickMarkColor(business.id) }}
      >
        {business.icon && business.icon.startsWith('data:') ? (
          <Image
            src={business.icon}
            alt=""
            width={44}
            height={44}
            className="business-row__mark-img"
            unoptimized
          />
        ) : business.icon ? (
          <span className="business-row__mark-emoji">{business.icon}</span>
        ) : (
          <span className="business-row__mark-initials">
            {getInitials(business.name)}
          </span>
        )}
      </span>
      <span className="business-row__body">
        <span className="business-row__name">{business.name}</span>
        <span className="business-row__meta">
          <span>
            {intl.formatMessage(
              { id: 'hub.member_count' },
              { count: business.memberCount }
            )}
          </span>
          {typeLabel ? (
            <>
              <span className="business-row__dot" aria-hidden="true" />
              <span>{typeLabel}</span>
            </>
          ) : null}
        </span>
      </span>
      <span className="business-row__chev">{ChevronRight}</span>
    </button>
  )
}
