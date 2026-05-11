import { useIntl } from 'react-intl'
import Image from '@/lib/Image'
import type { MessageId } from '@/i18n/messageIds'
import {
  getBusinessInitials,
  pickBusinessMarkColor,
} from '@/lib/business-mark'

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

// Mapped to a typed lookup so the resulting message id stays inside
// the MessageId union — TypeScript can then verify each entry exists
// in en-US.json at compile time.
const BUSINESS_TYPE_LABEL = {
  food: 'createBusiness.business_type_food',
  retail: 'createBusiness.business_type_retail',
  services: 'createBusiness.business_type_services',
  wholesale: 'createBusiness.business_type_wholesale',
  manufacturing: 'createBusiness.business_type_manufacturing',
  other: 'createBusiness.business_type_other',
} as const satisfies Record<string, MessageId>

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

  const typeLabel =
    business.type && business.type in BUSINESS_TYPE_LABEL
      ? intl.formatMessage({
          id: BUSINESS_TYPE_LABEL[business.type as keyof typeof BUSINESS_TYPE_LABEL],
        })
      : null

  const cls = ['business-row', className].filter(Boolean).join(' ')

  return (
    <button type="button" className={cls} onClick={onClick} data-haptic>
      <span
        className="business-row__mark"
        style={{ background: pickBusinessMarkColor(business.id) }}
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
            {getBusinessInitials(business.name)}
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
