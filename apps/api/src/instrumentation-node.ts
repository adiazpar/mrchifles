// TEMPORARY DIAGNOSTIC — delete with apps/api/src/instrumentation.ts when
// the listener-leak / SyntaxError investigation is complete.
//
// This file is loaded only when instrumentation.ts detects the Node.js
// runtime; Turbopack's edge-bundling pass never sees it. process.on
// usage is therefore safe.

const flag = '__kasero_diag_installed__'

export function installDiagnosticHandlers(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any
  if (g[flag]) return
  g[flag] = true

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('\n=== [DIAG] unhandledRejection ===')
    if (reason instanceof Error) {
      console.error('name:', reason.name)
      console.error('message:', reason.message)
      console.error('stack:\n' + (reason.stack ?? '<no stack>'))
    } else {
      console.error('non-Error reason:', reason)
    }
    console.error('=== /DIAG ===\n')
  })

  process.on('warning', (warning: Error) => {
    if (warning.name !== 'MaxListenersExceededWarning') return
    console.error('\n=== [DIAG] MaxListenersExceededWarning ===')
    console.error('message:', warning.message)
    console.error('stack:\n' + (warning.stack ?? '<no stack>'))
    console.error('=== /DIAG ===\n')
  })
}
