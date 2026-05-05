'use client'

import { useMemo, useRef, useEffect } from 'react'
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
  const firstPaintRef = useRef(true)
  useEffect(() => { firstPaintRef.current = false }, [])

  // Recompute the stack on every pathname change. sessionStorage reads
  // inside getLayerStack are sync; safe to call during useMemo.
  const layers = useMemo(() => getLayerStack(pathname), [pathname])

  // The new root key. If a layer's key matches this, it's the (current or
  // newly-installed) root. If a layer is exiting AND it was a root AND a
  // different root is now in place, its exit goes left (root-swap). All
  // other exits go right (normal pop).
  const newRootKey = layers[0] ? getLayerKey(layers[0]) : null

  return (
    <AnimatePresence initial={false} mode="sync">
      {layers.map((d, idx) => {
        const isTop = idx === layers.length - 1
        const isUnderlay = idx === layers.length - 2
        const isRoot = idx === 0
        // Only suppress slide-in on the very first paint of the app (page load).
        // After that, even root swaps animate (old root exits left, new root enters right).
        const isInitialMount = isRoot && firstPaintRef.current
        // A root layer's exit goes left iff it has been replaced by a different root.
        // For non-root layers (drill-downs), exit always goes right (normal pop).
        const exitDirection: 'left' | 'right' =
          isRoot && newRootKey !== null && getLayerKey(d) !== newRootKey ? 'left' : 'right'

        return (
          <Layer
            key={getLayerKey(d)}
            index={idx}
            isTop={isTop}
            isInitialMount={isInitialMount}
            exitDirection={exitDirection}
            isUnderlay={isUnderlay}
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
