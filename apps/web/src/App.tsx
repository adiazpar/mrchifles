import { IonApp, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Switch } from 'react-router-dom'

export function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <Switch>
          <Route exact path="/">
            <IonPage>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>Kasero</IonTitle>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <div className="p-4">
                  Vite + Ionic boot. Phases 5-12 will replace this with the real app.
                </div>
              </IonContent>
            </IonPage>
          </Route>
        </Switch>
      </IonReactRouter>
    </IonApp>
  )
}
