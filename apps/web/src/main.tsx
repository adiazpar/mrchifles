import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
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

// PWA service worker registration. The SW only ships in `vite build` output
// (devOptions.enabled = false), so in dev this becomes a no-op stub provided
// by vite-plugin-pwa's virtual module.
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl) {
      if (import.meta.env.DEV) {
        console.log('[pwa] SW registered:', swUrl)
      }
    },
    onRegisterError(error) {
      console.warn('[pwa] SW registration failed:', error)
    },
  })
}
