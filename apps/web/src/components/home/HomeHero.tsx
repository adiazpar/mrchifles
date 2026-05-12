'use client'

import { useIntl } from 'react-intl'
import { useMemo } from 'react'
import { useBusiness } from '@/contexts/business-context'

export function HomeHero() {
  const intl = useIntl()
  const { business } = useBusiness()

  const dateLabel = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat(business?.locale ?? 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      return fmt
        .format(new Date())
        .replace(/,\s+/g, ' · ')
        .toUpperCase()
    } catch {
      return ''
    }
  }, [business?.locale])

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'home.page_title' })
    const emphasis = intl.formatMessage({ id: 'home.page_title_emphasis' })
    const idx = full.indexOf(emphasis)
    if (!emphasis || idx === -1) return <>{full}</>
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [intl])

  return (
    <header className="page-hero">
      {dateLabel ? <div className="page-hero__eyebrow">{dateLabel}</div> : null}
      <h1 className="page-hero__title">{titleNode}</h1>
    </header>
  )
}
