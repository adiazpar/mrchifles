import { Redirect, Route, useRouteMatch } from 'react-router-dom'
import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react'
import {
  cartOutline,
  homeOutline,
  pricetagsOutline,
  settingsOutline,
} from 'ionicons/icons'
import { useIntl } from 'react-intl'

import { HomeTab } from '@/routes/tabs/HomeTab'
import { ManageTab } from '@/routes/tabs/ManageTab'
import { ProductsTab } from '@/routes/tabs/ProductsTab'
import { ProviderDetailPage } from '@/routes/tabs/ProviderDetailPage'
import { ProvidersTab } from '@/routes/tabs/ProvidersTab'
import { SalesTab } from '@/routes/tabs/SalesTab'
import { TeamTab } from '@/routes/tabs/TeamTab'

const BUSINESS_PATH = '/:businessId([A-Za-z0-9_-]{9,})'

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
          <IonIcon icon={homeOutline} />
          <IonLabel>{intl.formatMessage({ id: 'navigation.home' })}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="sales" href={`/${businessId}/sales`}>
          <IonIcon icon={cartOutline} />
          <IonLabel>{intl.formatMessage({ id: 'navigation.sales' })}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="products" href={`/${businessId}/products`}>
          <IonIcon icon={pricetagsOutline} />
          <IonLabel>{intl.formatMessage({ id: 'navigation.products' })}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="manage" href={`/${businessId}/manage`}>
          <IonIcon icon={settingsOutline} />
          <IonLabel>{intl.formatMessage({ id: 'navigation.manage' })}</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  )
}
