'use client'

// BusinessRoot now owns the data providers + chrome (mounted by LayerStack).
// This layout is a passthrough so Next.js routing can match nested routes;
// every nested page.tsx returns null and rendering happens via LayerStack
// at the AppShell level.
export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
