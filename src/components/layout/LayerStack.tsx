'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMotionValue, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { getLayerStack, getLayerKey, type LayerDescriptor } from '@/lib/layer-stack'
import { Layer } from './Layer'
import { HubRoot } from './HubRoot'
import { BusinessRoot } from './BusinessRoot'
import { ProvidersDrilldown } from '@/components/providers/ProvidersDrilldown'
import { TeamDrilldown } from '@/components/team/TeamDrilldown'
import { ProviderDetailClient } from '@/components/providers/ProviderDetailClient'
import { AccountPage } from '@/components/account/AccountPage'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function renderDescriptor(d: LayerDescriptor): React.ReactNode {
  switch (d.kind) {
    case 'hub-root':         return <HubRoot />
    case 'business-root':    return <BusinessRoot businessId={d.businessId} activeTab={d.activeTab} />
    case 'providers':        return <ProvidersDrilldown businessId={d.businessId} />
    case 'team':             return <TeamDrilldown businessId={d.businessId} />
    case 'provider-detail':  return <ProviderDetailClient businessId={d.businessId} providerId={d.providerId} />
    case 'account':          return <AccountPage />
  }
}

export function LayerStack() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const t = useTranslations()
  const peelProgress = useMotionValue(0)
  const reducedMotion = prefersReducedMotion()

  // True only during the very first render after mount. After the first
  // useEffect commits, this stays false. Used so deep-link refresh on
  // /<biz>/providers/<id> shows all layers materialized in place
  // instead of three of them sliding in from the right.
  const firstPaintRef = useRef(true)
  useEffect(() => { firstPaintRef.current = false }, [])

  // Layer keys present in the previous render. Lets us decide which layers
  // in the new render are NEW (need slide-in) vs already-mounted (just
  // stayed put). When multiple new layers arrive in one render (e.g. a
  // navigate that jumps through multiple stack levels), only the topmost
  // slides in — anything beneath it appears in place. Without this, a
  // jump like / → /<biz>/providers/<id> would slide in 3 layers at once.
  const prevKeysRef = useRef<Set<string>>(new Set())
  const layers = useMemo(() => getLayerStack(pathname), [pathname])
  // Capture the prev set BEFORE updating the ref, so per-layer logic in
  // this render reads the previous-render keys.
  const prevKeys = prevKeysRef.current
  useEffect(() => {
    prevKeysRef.current = new Set(layers.map(getLayerKey))
  })

  return (
    <AnimatePresence initial={false} mode="sync">
      {layers.map((d, idx) => {
        const key = getLayerKey(d)
        const isTop = idx === layers.length - 1
        const isUnderlay = idx === layers.length - 2
        const wasInPrev = prevKeys.has(key)

        // Skip the open animation when:
        //   - This is the very first paint (deep-link refresh case).
        //   - The layer was already mounted in the previous render
        //     (its x is already 0; AnimatePresence kept it).
        //   - It's a non-top NEW layer (multi-level navigate jump):
        //     only the topmost newly-arrived layer slides in.
        const skipOpenAnimation =
          firstPaintRef.current || wasInPrev || !isTop

        return (
          <Layer
            key={key}
            index={idx}
            isTop={isTop}
            isUnderlay={isUnderlay}
            skipOpenAnimation={skipOpenAnimation}
            peelProgress={peelProgress}
            onPeelDismiss={() => router.back()}
            ariaLabel={t('common.detail')}
            reducedMotion={reducedMotion}
          >
            {renderDescriptor(d)}
          </Layer>
        )
      })}
    </AnimatePresence>
  )
}
