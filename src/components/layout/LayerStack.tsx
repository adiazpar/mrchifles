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

  const layers = useMemo(() => getLayerStack(pathname), [pathname])

  // True only during the very first render after mount. After the first
  // useEffect commits, this stays false. Used so deep-link refresh on
  // /<biz>/providers/<id> shows all layers materialized in place
  // instead of three of them sliding in from the right.
  const firstPaintRef = useRef(true)
  useEffect(() => { firstPaintRef.current = false }, [])

  // Keys present in the previous render. Lets us decide which ephemeral
  // layers in the new render are NEW (need slide-in) vs already-mounted.
  // When multiple new layers arrive in one render (e.g. a navigate that
  // jumps through multiple stack levels), only the topmost slides in —
  // anything beneath it appears in place.
  const prevKeysRef = useRef<Set<string>>(new Set())
  // Capture the prev set BEFORE updating the ref, so per-layer logic in
  // this render reads the previous-render keys.
  const prevKeys = prevKeysRef.current
  useEffect(() => {
    prevKeysRef.current = new Set(layers.map(getLayerKey))
  })

  // The hub-root is the permanent base. It is ALWAYS at depth 0 across
  // every URL (see getLayerStack). Rendering it OUTSIDE AnimatePresence
  // guarantees it never participates in the enter/exit reconciliation
  // dance — so its DOM and React state survive every transition without
  // any chance of mount/remount artifacts.
  //
  // Above it, only the ephemeral layers (business, drill-downs, account)
  // animate in and out under AnimatePresence.
  const ephemeralLayers = layers.slice(1)
  const hubIsTop = layers.length === 1
  // The immediate underlay for the topmost ephemeral layer is hub when
  // there's exactly one ephemeral, or the layer below when there are
  // multiple ephemerals. Hub itself is the underlay only in the former.
  const hubIsUnderlay = ephemeralLayers.length === 1

  return (
    <>
      <Layer
        key="hub-root"
        index={0}
        isTop={hubIsTop}
        isUnderlay={hubIsUnderlay}
        skipOpenAnimation
        peelProgress={peelProgress}
        onPeelDismiss={() => router.back()}
        ariaLabel={t('common.detail')}
        reducedMotion={reducedMotion}
      >
        <HubRoot />
      </Layer>

      <AnimatePresence initial={false} mode="sync">
        {ephemeralLayers.map((d, idxOffset) => {
          const idx = idxOffset + 1 // global index (hub is 0)
          const key = getLayerKey(d)
          const isTop = idx === layers.length - 1
          const isUnderlay = idx === layers.length - 2
          const wasInPrev = prevKeys.has(key)

          // Skip the open animation when:
          //   - This is the very first paint (deep-link refresh case).
          //   - The layer was already mounted in the previous render.
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
    </>
  )
}
