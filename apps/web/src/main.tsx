import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'

// Order matters:
// 1. Ionic core CSS (resets, structure, typography utilities) FIRST so the
//    brand layer can override Ionic defaults via --ion-* variables.
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

// 2. Brand design tokens. Defines --color-*, --brand-*, --space-*, etc.
import './styles/base.css'

// 3. Ionic theme bridge — maps brand tokens to --ion-* CSS variables.
//    Must come AFTER base.css (which defines the brand tokens being read)
//    and AFTER Ionic core CSS (so these mappings override Ionic's defaults).
import './styles/ionic-theme.css'

// 4. Component-level brand CSS, layered on top of the brand tokens.
import './styles/buttons.css'
import './styles/forms.css'
import './styles/interactive.css'
import './styles/animations.css'
import './styles/modal.css'
import './styles/auth-gate.css'
import './styles/utilities.css'

// 5. Tailwind utilities last so utility classes can override component CSS.
import './styles/index.css'

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
