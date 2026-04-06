'use client'

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

interface TabProps {
  id: string
  children: ReactNode
}

interface TabContainerProps {
  activeTab: string
  children: ReactNode
}

/**
 * TabContainer renders all tabs stacked in the same grid cell.
 * Active tab is visible, inactive tabs are hidden but in the DOM.
 * The container sizes to the tallest tab automatically.
 *
 * Usage:
 * <TabContainer activeTab="details">
 *   <TabContainer.Tab id="details">
 *     {content}
 *   </TabContainer.Tab>
 *   <TabContainer.Tab id="barcode">
 *     {content}
 *   </TabContainer.Tab>
 * </TabContainer>
 */
function TabContainerRoot({ activeTab, children }: TabContainerProps) {
  const tabs = Children.toArray(children).filter(
    (child): child is ReactElement<TabProps> => isValidElement(child) && (child.type as { _isTab?: boolean })._isTab === true
  )

  return (
    <div className="grid min-w-0">
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
