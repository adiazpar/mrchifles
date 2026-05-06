'use client'

import { HubHome } from '@/components/hub/HubHome'
import { PageHeader } from './page-header'
import { NavigationErrorNotice } from './NavigationErrorNotice'

export function HubRoot() {
  return (
    <>
      <NavigationErrorNotice />
      <PageHeader variant="hub" />
      <HubHome />
    </>
  )
}
