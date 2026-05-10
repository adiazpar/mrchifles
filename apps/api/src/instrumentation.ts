// TEMPORARY DIAGNOSTIC — DELETE WHEN INVESTIGATION IS DONE.
//
// Hooks into Next.js's instrumentation API to install process-level
// listeners that surface the otherwise-silent failures we see when the
// PWA wakes from background and fires many parallel requests at the
// dev server. The actual handlers live in instrumentation-node.ts so
// Turbopack's edge-bundling pass never sees the process.on calls.
//
// To remove: delete this file AND instrumentation-node.ts AND drop the
// NODE_OPTIONS prefix from apps/api/package.json's dev script.

export async function register(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { installDiagnosticHandlers } = await import('./instrumentation-node')
  installDiagnosticHandlers()
}
