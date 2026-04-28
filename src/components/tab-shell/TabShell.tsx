'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import { TAB_IDS, getActiveTab, type TabId } from '@/lib/tab-routing'
import { useIdleMount } from '@/hooks/useIdleMount'
import { HomeView } from './views/HomeView'
import { ProductsView } from './views/ProductsView'
import { SalesView } from './views/SalesView'
import { ProvidersView } from './views/ProvidersView'
import { TeamView } from './views/TeamView'
import { ManageView } from './views/ManageView'

const VIEW_COMPONENTS: Record<TabId, React.ComponentType> = {
  home: HomeView,
  products: ProductsView,
  sales: SalesView,
  providers: ProvidersView,
  team: TeamView,
  manage: ManageView,
}

// TabShell — single mount, all 6 tab views rendered persistently inside.
// Active tab is derived from pathname; switching tabs is a CSS class flip,
// not a React mount/unmount. Inactive tabs mount on idle-time after the
// active tab has painted, so the first business entry stays fast and
// subsequent tab taps are instant.
//
// Mount this with key={businessId} (the parent layout does this) so that
// switching businesses cleanly resets the per-business mount tracking and
// scroll positions.
export function TabShell() {
  const pathname = usePathname()
  const params = useParams<{ businessId: string }>()
  const businessId = params?.businessId ?? ''
  const activeTab = getActiveTab(pathname, businessId)

  // Set of tabs that are currently mounted in the DOM. Starts with just
  // the active one; expands as idle-mount fires.
  const [mounted, setMounted] = useState<Set<TabId>>(() => new Set<TabId>([activeTab]))

  // Per-tab scroll positions. The browser preserves scrollTop on
  // opacity:0 elements that stay in the DOM, but we capture+restore
  // manually as a safety net for any browser that doesn't.
  const scrollPositions = useRef<Map<TabId, number>>(new Map())
  const containerRefs = useRef<Map<TabId, HTMLDivElement | null>>(new Map())
  const previousActiveRef = useRef<TabId>(activeTab)

  // If the user navigates directly to a tab that isn't yet in mounted
  // (e.g. a deep-link to /<biz>/sales when they entered via /home and
  // sales hasn't idle-mounted yet), add it immediately so it renders.
  useEffect(() => {
    if (!mounted.has(activeTab)) {
      setMounted(prev => {
        const next = new Set(prev)
        next.add(activeTab)
        return next
      })
    }
  }, [activeTab, mounted])

  // Capture previous active's scroll, restore new active's scroll. Use
  // useLayoutEffect so the restore happens before paint — no flicker.
  useLayoutEffect(() => {
    const previousActive = previousActiveRef.current
    if (previousActive === activeTab) return
    const prevContainer = containerRefs.current.get(previousActive)
    if (prevContainer) {
      scrollPositions.current.set(previousActive, prevContainer.scrollTop)
    }
    const newContainer = containerRefs.current.get(activeTab)
    const savedScroll = scrollPositions.current.get(activeTab)
    if (newContainer && savedScroll !== undefined) {
      newContainer.scrollTop = savedScroll
    }
    previousActiveRef.current = activeTab
  }, [activeTab])

  // Find the next tab that hasn't been mounted yet (in TAB_IDS order).
  const nextUnmounted = TAB_IDS.find(id => !mounted.has(id)) ?? null

  // Schedule the next mount during idle time. When that fires, the next
  // unmounted tab gets added to the set; the effect re-runs because
  // `mounted` changed; nextUnmounted is recomputed; useIdleMount sees a
  // new shouldMount and queues the next idle mount. This naturally
  // sequences mounts one-per-idle-tick instead of all at once.
  const mountNext = useCallback(() => {
    if (nextUnmounted === null) return
    setMounted(prev => {
      if (prev.has(nextUnmounted)) return prev
      const next = new Set(prev)
      next.add(nextUnmounted)
      return next
    })
  }, [nextUnmounted])

  useIdleMount(nextUnmounted !== null, mountNext)

  return (
    <div className="tab-shell">
      {TAB_IDS.map(tabId => {
        if (!mounted.has(tabId)) return null
        const View = VIEW_COMPONENTS[tabId]
        const isActive = tabId === activeTab
        return (
          <div
            key={tabId}
            ref={el => { containerRefs.current.set(tabId, el) }}
            className={`tab-shell-view ${isActive ? 'is-active' : ''}`}
            aria-hidden={!isActive}
          >
            <View />
          </div>
        )
      })}
    </div>
  )
}
