'use client'

import { Children, isValidElement, useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { motion, type PanInfo } from 'framer-motion'

interface TabProps {
  id: string
  children: ReactNode
}

interface TabContainerProps {
  activeTab: string
  children: ReactNode
  /** Required when `swipeable` is true. Called with the next tab id when a swipe crosses the threshold. */
  onTabChange?: (id: string) => void
  /** Enable horizontal swipe-to-switch via framer-motion. */
  swipeable?: boolean
  /**
   * When true, the wrapper sizes to the active tab instead of the tallest tab.
   * Inactive tabs are positioned absolutely so they don't contribute to layout
   * height. Use this when tabs have very different heights and the empty space
   * below a short tab is undesirable (e.g. a list page). Default is false
   * (stable height = tallest), which is best for modals.
   */
  fitActiveHeight?: boolean
}

const SWIPE_OFFSET_THRESHOLD = 60
const SWIPE_VELOCITY_THRESHOLD = 400

/**
 * TabContainer renders all tabs stacked in the same grid cell so the container
 * always sizes to the tallest tab (no height jumps on switch). All tabs remain
 * mounted, preserving any local state inside them.
 *
 * When `swipeable` is true:
 *   - The wrapper is draggable horizontally (with elastic resistance), so the
 *     active tab visibly tracks the finger during the drag.
 *   - Each tab is positioned at `x: (index - activeIndex) * 100%` and has
 *     `opacity: 1` only when active. Inactive tabs are offscreen AND invisible,
 *     so no neighbor peeks in during the drag.
 *   - On release past threshold, `onTabChange` fires; framer animates each tab
 *     to its new slot, sliding the old tab out in the drag direction while the
 *     new tab slides in from the opposite side, mirroring the gesture. The same
 *     animation applies when `activeTab` is changed by tapping a tab button or
 *     any other external source — direction is derived from the index delta.
 *
 * When `swipeable` is false, falls back to a plain opacity cross-fade.
 *
 * On every tab change the closest scrollable ancestor is reset to scrollTop 0
 * so the new tab starts at its content origin.
 *
 * Usage:
 * <TabContainer activeTab={tab} onTabChange={setTab} swipeable>
 *   <TabContainer.Tab id="details">{content}</TabContainer.Tab>
 *   <TabContainer.Tab id="barcode">{content}</TabContainer.Tab>
 * </TabContainer>
 */
function TabContainerRoot({ activeTab, children, onTabChange, swipeable = false, fitActiveHeight = false }: TabContainerProps) {
  const tabs = Children.toArray(children).filter(
    (child): child is ReactElement<TabProps> => isValidElement(child) && (child.type as { _isTab?: boolean })._isTab === true
  )

  const tabIds = tabs.map((t) => t.props.id)
  const activeIndex = tabIds.indexOf(activeTab)

  // On tab change, reset the closest scrollable ancestor to the top so the new
  // tab starts at its content origin instead of inheriting the previous scroll.
  const wrapperRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const el = wrapperRef.current
    if (!el) return
    let parent: HTMLElement | null = el.parentElement
    while (parent) {
      const overflowY = getComputedStyle(parent).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        parent.scrollTop = 0
        break
      }
      parent = parent.parentElement
    }
  }, [activeTab])

  if (swipeable && onTabChange) {
    const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      if (activeIndex < 0) return
      const { offset, velocity } = info
      const passedOffset = Math.abs(offset.x) > SWIPE_OFFSET_THRESHOLD
      const passedVelocity = Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD
      if (!passedOffset && !passedVelocity) return
      // Swipe left (negative offset) → next tab; swipe right → previous
      const nextIndex = activeIndex + (offset.x < 0 ? 1 : -1)
      if (nextIndex < 0 || nextIndex >= tabIds.length) return
      onTabChange(tabIds[nextIndex])
    }

    const stackClass = fitActiveHeight ? 'relative' : 'grid'
    return (
      <div ref={wrapperRef} className="overflow-hidden min-w-0">
        <motion.div
          className={`${stackClass} min-w-0 touch-pan-y`}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          {tabs.map((tab, i) => {
            const relative = i - activeIndex
            const isActive = relative === 0
            const positionClass = fitActiveHeight
              ? isActive
                ? 'relative'
                : 'absolute inset-x-0 top-0'
              : 'col-start-1 row-start-1'
            return (
              <motion.div
                key={tab.props.id}
                className={`${positionClass} min-w-0 flex flex-col gap-4`}
                initial={false}
                animate={{ x: `${relative * 100}%`, opacity: isActive ? 1 : 0 }}
                transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                style={{ pointerEvents: isActive ? 'auto' : 'none' }}
                aria-hidden={!isActive}
              >
                {tab.props.children}
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    )
  }

  // Non-swipeable: original opacity cross-fade, all tabs kept mounted.
  return (
    <div ref={wrapperRef} className="grid min-w-0">
      {tabs.map((tab) => {
        const isActive = tab.props.id === activeTab
        return (
          <div
            key={tab.props.id}
            className="col-start-1 row-start-1 min-w-0 flex flex-col gap-4 transition-opacity duration-200"
            style={{
              visibility: isActive ? 'visible' : 'hidden',
              pointerEvents: isActive ? 'auto' : 'none',
              opacity: isActive ? 1 : 0,
            }}
            aria-hidden={!isActive}
          >
            {tab.props.children}
          </div>
        )
      })}
    </div>
  )
}

function Tab({ children }: TabProps) {
  return <>{children}</>
}

const TabWithMarker = Tab as typeof Tab & { _isTab: boolean }
TabWithMarker._isTab = true

export const TabContainer = Object.assign(TabContainerRoot, {
  Tab: TabWithMarker,
})
