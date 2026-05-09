import { Redirect, Route, useRouteMatch } from 'react-router-dom'
import {
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react'
import { Home, ShoppingCart, Package, Settings } from 'lucide-react'
import { useIntl } from 'react-intl'

import { HomeTab } from '@/routes/tabs/HomeTab'
import { ManageTab } from '@/routes/tabs/ManageTab'
import { ProductsTab } from '@/routes/tabs/ProductsTab'
import { ProviderDetailPage } from '@/routes/tabs/ProviderDetailPage'
import { ProvidersTab } from '@/routes/tabs/ProvidersTab'
import { SalesTab } from '@/routes/tabs/SalesTab'
import { TeamTab } from '@/routes/tabs/TeamTab'

const BUSINESS_PATH = '/:businessId([A-Za-z0-9_-]{9,})'

// Lucide icons match the rest of the app's icon vocabulary (Hub feature
// cards, Account settings rows, etc.) — and we need stroke-width control
// to land at 1.5 across the row, which the stock ionicons outlines don't
// expose. Active state is painted via .tab-selected::before in
// ionic-theme.css (small terracotta bar above the glyph).
const TAB_ICON_PROPS = { size: 26, strokeWidth: 1.5 } as const

export function BusinessTabsLayout() {
  const match = useRouteMatch<{ businessId: string }>(BUSINESS_PATH)
  const businessId = match?.params.businessId ?? ''
  const intl = useIntl()

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path={`${BUSINESS_PATH}/home`} component={HomeTab} />
        <Route exact path={`${BUSINESS_PATH}/sales`} component={SalesTab} />
        <Route exact path={`${BUSINESS_PATH}/products`} component={ProductsTab} />
        <Route exact path={`${BUSINESS_PATH}/manage`} component={ManageTab} />
        <Route exact path={`${BUSINESS_PATH}/providers/:id`} component={ProviderDetailPage} />
        <Route exact path={`${BUSINESS_PATH}/providers`} component={ProvidersTab} />
        <Route exact path={`${BUSINESS_PATH}/team`} component={TeamTab} />
        <Route
          exact
          path={BUSINESS_PATH}
          render={({ match: m }) => <Redirect to={`/${m.params.businessId}/home`} />}
        />
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href={`/${businessId}/home`}>
          <Home {...TAB_ICON_PROPS} />
          <IonLabel>{intl.formatMessage({ id: 'navigation.home' })}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="sales" href={`/${businessId}/sales`}>
          <ShoppingCart {...TAB_ICON_PROPS} />
          <IonLabel>{intl.formatMessage({ id: 'navigation.sales' })}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="products" href={`/${businessId}/products`}>
          <Package {...TAB_ICON_PROPS} />
          <IonLabel>{intl.formatMessage({ id: 'navigation.products' })}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="manage" href={`/${businessId}/manage`}>
          <Settings {...TAB_ICON_PROPS} />
          <IonLabel>{intl.formatMessage({ id: 'navigation.manage' })}</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}
