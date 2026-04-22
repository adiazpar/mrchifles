'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import type { Business } from '@/contexts/business-context'
import { BUSINESS_TYPE_ICONS } from '@/components/businesses/shared'

export interface BusinessHeaderCardProps {
  business: Business
  onTap?: () => void
}

export function BusinessHeaderCard({ business, onTap }: BusinessHeaderCardProps) {
  const t = useTranslations('createBusiness')
  const typeLabel = business.type ? t(`business_type_${business.type}`) : ''
  const isImageLogo = !!business.icon && business.icon.startsWith('data:image')
  const TypeIcon = business.type ? BUSINESS_TYPE_ICONS[business.type] : null

  const content = (
    <div className="flex items-center gap-4 p-4">
      <div className="w-14 h-14 rounded-2xl bg-bg-base flex items-center justify-center overflow-hidden flex-shrink-0">
        {isImageLogo ? (
          <Image
            src={business.icon!}
            alt={business.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : TypeIcon ? (
          <TypeIcon className="w-8 h-8 text-brand" />
        ) : (
          <span className="text-2xl">{business.icon ?? ''}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h1 className="text-lg font-semibold text-text-primary truncate">{business.name}</h1>
        <p className="text-sm text-text-secondary truncate">
          {typeLabel && <span>{typeLabel} · </span>}
          {business.locale} · {business.currency}
        </p>
      </div>
      {onTap && (
        <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      )}
    </div>
  )

  if (!onTap) {
    return <div className="bg-bg-surface rounded-xl">{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onTap}
      data-tap-feedback
      className="bg-bg-surface rounded-xl card-interactive w-full text-left data-[pressed='true']:bg-bg-muted"
    >
      {content}
    </button>
  )
}
