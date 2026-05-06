import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/index.css'
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'
import './styles/ionic-theme.css'
import { setupIonicReact } from '@ionic/react'

setupIonicReact({
  // iOS-style chrome (peel-back gestures, slide animations) on every platform.
  // Web users on Android/desktop will still see the iOS feel, which is the
  // intended UX consistency for Kasero.
  mode: 'ios',
})

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
