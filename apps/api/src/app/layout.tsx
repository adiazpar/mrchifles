import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kasero API',
  description: 'API server',
}

// Required by Next.js even for API-only projects. No UI, no providers,
// no fonts, no theme script — those all live in apps/web/. This wrapper
// exists so `next build` doesn't fail on missing root layout.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
