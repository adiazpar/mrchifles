import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
} from '@ionic/react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'

import { TeamDrilldown } from '@/components/team/TeamDrilldown'

/**
 * Team drill-down tab — members list, invite-code management, and the
 * per-member modal that gates role changes, status toggles, and ownership
 * transfer (rendered inside `UserDetailsStep`).
 *
 * Mounted at `/<businessId>/team` from BusinessTabsLayout's
 * IonRouterOutlet. Reached via the Manage tab's "Team" shortcut, which
 * animates as a native iOS-style push.
 *
 * Pattern choice (mirrors `ProvidersTab`):
 *   - We REUSE `<TeamDrilldown businessId=... />` verbatim. The
 *     `IonHeader` + `IonBackButton` here is the only chrome.
 *   - The view consumes `AuthContext` and the `useTeamManagement`
 *     hook (which fetches `/team` and owns invite/role/remove flows).
 *     `BusinessContext` is mounted by `BusinessTabsLayout`.
 *   - The "+ Invite" CTA stays inline in the body rather than promoted
 *     to `<IonButtons slot="end">`. The legacy UX places it adjacent
 *     to the member-count chip in the members card; surfacing it in
 *     the toolbar would lose that context and gate it behind
 *     `canManageTeam` separately.
 *   - The `IonBackButton` defaults to `/<businessId>/manage` so a
 *     deep-link entry (no in-app history) lands on the parent page.
 *     With history present, Ionic uses the actual stack.
 */
export function TeamTab() {
  const { businessId } = useParams<{ businessId: string }>()
  const intl = useIntl()
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/${businessId}/manage`} />
          </IonButtons>
          <IonTitle>{intl.formatMessage({ id: 'navigation.team' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <TeamDrilldown businessId={businessId} />
      </IonContent>
    </IonPage>
  )
}
