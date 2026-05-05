'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMotionValue } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  getLayerStack,
  getLayerKey,
  type LayerDescriptor,
} from '@/lib/layer-stack'
import { Layer } from './Layer'
import { HubRoot } from './HubRoot'
import { BusinessRoot } from './BusinessRoot'
import { ProvidersDrilldown } from '@/components/providers/ProvidersDrilldown'
import { TeamDrilldown } from '@/components/team/TeamDrilldown'
import { ProviderDetailClient } from '@/components/providers/ProviderDetailClient'
import { AccountPage } from '@/components/account/AccountPage'
import { usePageTransition } from '@/contexts/page-transition-context'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function renderDescriptor(d: LayerDescriptor): React.ReactNode {
  switch (d.kind) {
    case 'hub-root':
      return <HubRoot />
    case 'business-root':
      return <BusinessRoot businessId={d.businessId} activeTab={d.activeTab} />
    case 'providers':
      return <ProvidersDrilldown businessId={d.businessId} />
    case 'team':
      return <TeamDrilldown businessId={d.businessId} />
    case 'provider-detail':
      return (
        <ProviderDetailClient
          businessId={d.businessId}
          providerId={d.providerId}
        />
      )
    case 'account':
      return <AccountPage />
  }
}

// One ephemeral entry in the manually-managed stack. Hub is NOT in this
// list — it renders separately as a permanent base.
type Entry = {
  key: string
  descriptor: LayerDescriptor
  isExiting: boolean
}

/**
 * LayerStack: explicit, optimistic, URL-aware page stack.
 *
 * Source of truth: React state `entries` (ephemeral layers above hub).
 * URL is the navigation INPUT, not the renderer's source — we treat
 * `pendingHref || pathname` as the user's intent and sync entries to
 * match. This buys instant visual feedback on tap (the new layer slides
 * in before Next.js commits the route).
 *
 * Why manual stack instead of AnimatePresence:
 *   - Explicit lifecycle: each entry has isExiting; we control creation,
 *     exit-marking, and removal directly.
 *   - No hidden reconciliation: AnimatePresence's "kept child + exiting
 *     child" merging interacts badly with position:fixed siblings and
 *     transformed stacking contexts. Manual control sidesteps that.
 *   - Drag-dismiss can start the exit animation IMMEDIATELY (no round-
 *     trip through router → pathname → setEntries delay).
 *   - Single React children array preserves component identity through
 *     live → exiting transitions (refs survive, animations don't restart).
 */
export function LayerStack() {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const t = useTranslations()
  const { pendingHref } = usePageTransition()
  const peelProgress = useMotionValue(0)
  const reducedMotion = prefersReducedMotion()

  // Optimistic effective path. Tap → setPendingHref → effectivePath flips
  // → entries sync → new layer mounts THIS render. URL catches up later.
  const effectivePath = pendingHref || pathname
  const targetLayers = useMemo(
    () => getLayerStack(effectivePath),
    [effectivePath],
  )

  // Hub descriptor is always at index 0 of targetLayers (see getLayerStack).
  // Render hub separately as a permanent base; it never enters/exits.
  const hubDescriptor =
    targetLayers[0]?.kind === 'hub-root' ? targetLayers[0] : null
  const targetEphemerals = useMemo(
    () => targetLayers.filter((d) => d.kind !== 'hub-root'),
    [targetLayers],
  )
  const targetEphemeralKeys = useMemo(
    () => targetEphemerals.map(getLayerKey),
    [targetEphemerals],
  )

  // Manually-managed stack of ephemeral entries.
  const [entries, setEntries] = useState<Entry[]>(() =>
    targetEphemerals.map((d) => ({
      key: getLayerKey(d),
      descriptor: d,
      isExiting: false,
    })),
  )

  // Keys that have already mounted with their entry animation. Prevents
  // re-animating on subsequent renders. Initialized to keys present at
  // first paint so deep-link refresh doesn't slide-in everything.
  const enteredKeysRef = useRef<Set<string>>(new Set(targetEphemeralKeys))
  // First-paint flag flips false after first sync useEffect.
  const firstPaintRef = useRef(true)

  // Sync entries to targetEphemerals whenever the URL-derived target
  // changes. New keys appear as live; gone keys flip to isExiting; kept
  // keys keep their identity (and their internal refs).
  useEffect(() => {
    setEntries((prev) => {
      const targetKeys = new Set(targetEphemeralKeys)
      const prevByKey = new Map(prev.map((e) => [e.key, e]))

      // Live entries in target order. Reuse prev entry if it exists
      // (preserves identity through React reconciliation), reviving
      // exiting entries that came back into target.
      const live: Entry[] = targetEphemerals.map((d) => {
        const key = getLayerKey(d)
        const existing = prevByKey.get(key)
        if (existing) {
          return { key, descriptor: d, isExiting: false }
        }
        return { key, descriptor: d, isExiting: false }
      })

      // Carry over entries from prev that are no longer in target —
      // mark them isExiting so the Layer's animateOut effect fires.
      // (Skip ones already isExiting that are still in target — those
      // were revived above.)
      const exiting: Entry[] = []
      for (const e of prev) {
        if (!targetKeys.has(e.key)) {
          exiting.push({ ...e, isExiting: true })
        }
      }

      return [...live, ...exiting]
    })
    if (firstPaintRef.current) firstPaintRef.current = false
  }, [targetEphemerals, targetEphemeralKeys])

  const handleExitComplete = useCallback((key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key))
    enteredKeysRef.current.delete(key)
  }, [])

  const handleEntered = useCallback((key: string) => {
    enteredKeysRef.current.add(key)
  }, [])

  const handlePeelDismiss = useCallback(() => {
    router.back()
  }, [router])

  const ariaLabel = t('common.detail')

  // Pre-compute live count so per-entry props can determine isTop /
  // isUnderlay during the single render pass.
  const liveCount = entries.reduce((n, e) => (e.isExiting ? n : n + 1), 0)

  // Hub state. Hub is the underlay only if there's exactly one live
  // ephemeral above it. With 2+ live, the underlay role is filled by
  // the layer immediately below the top.
  const hubIsTop = liveCount === 0
  const hubIsUnderlay = liveCount === 1

  return (
    <>
      {hubDescriptor && (
        <Layer
          key="hub-root"
          index={0}
          isTop={hubIsTop}
          isUnderlay={hubIsUnderlay}
          animateIn={false}
          animateOut={false}
          peelable={false}
          peelProgress={peelProgress}
          onPeelDismiss={handlePeelDismiss}
          ariaLabel={ariaLabel}
          reducedMotion={reducedMotion}
        >
          <HubRoot />
        </Layer>
      )}

      {/* Single .map preserves React identity through live → exiting
          transitions. Exiting entries are placed AFTER live (higher
          z-index) so they slide off ON TOP of the revealed underlay. */}
      {entries.map((entry, idx) => {
        const isLive = !entry.isExiting
        // For live entries, idx into the entries list is also the live-
        // section index (since all live come before all exiting per the
        // setEntries shape).
        const isLiveTop = isLive && idx === liveCount - 1
        const isLiveUnderlay = isLive && liveCount >= 2 && idx === liveCount - 2

        // Animate in only the topmost newly-mounted live layer. Multi-
        // level navigate jumps thus materialize deeper layers in place
        // and only animate the topmost.
        const animateIn =
          isLive &&
          !firstPaintRef.current &&
          !enteredKeysRef.current.has(entry.key) &&
          isLiveTop

        return (
          <Layer
            key={entry.key}
            index={idx + 1} // hub is 0
            isTop={isLiveTop}
            isUnderlay={isLiveUnderlay}
            animateIn={animateIn}
            animateOut={!isLive}
            peelable={isLiveTop}
            peelProgress={peelProgress}
            onPeelDismiss={handlePeelDismiss}
            onEntered={() => handleEntered(entry.key)}
            onExitComplete={() => handleExitComplete(entry.key)}
            ariaLabel={ariaLabel}
            reducedMotion={reducedMotion}
          >
            {renderDescriptor(entry.descriptor)}
          </Layer>
        )
      })}
    </>
  )
}
