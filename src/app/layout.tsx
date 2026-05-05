import type { Metadata, Viewport } from 'next'
import { DM_Sans, IBM_Plex_Sans } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { AuthProvider } from '@/contexts/auth-context'
import { PageTransitionProvider } from '@/contexts/page-transition-context'
import { AuthGateProvider } from '@/contexts/auth-gate-context'
import {
  AppShell,
  TapFeedbackProvider,
  AuthGateOverlay,
  DevServiceWorkerCleanup,
  IOSStartupImages,
} from '@/components/layout'
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '@/lib/theme-color'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['500', '600', '700'],
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex',
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'
  ),
  title: 'Kasero',
  description: 'Multi-business management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kasero',
  },
  // Next.js 15 emits the modern `mobile-web-app-capable` meta tag instead of
  // the deprecated `apple-mobile-web-app-capable` one. iOS Safari still
  // requires the deprecated tag for `apple-touch-startup-image` splash
  // screens to be honored — without it, the launch screen stays black.
  // See vercel/next.js#74524.
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
  openGraph: {
    title: 'Kasero',
    description: 'Multi-business management system',
    siteName: 'Kasero',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kasero',
    description: 'Multi-business management system',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  // Single static value — the inline script in <head> updates this to the
  // resolved theme synchronously before first paint. Using a media-query
  // array here would bind the status bar to the OS color scheme instead
  // of the user's in-app theme preference, which causes a visible mismatch
  // at the top of the screen when the two disagree.
  themeColor: THEME_COLOR_LIGHT,
}

export default async function RootLayout({
  children,
  overlay,
}: {
  children: React.ReactNode
  overlay: React.ReactNode
}) {
  // next-intl resolves the locale and messages from src/i18n/request.ts,
  // which reads the locale cookie set by BusinessProvider. Missing keys
  // fall back to en-US automatically.
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${dmSans.variable} ${ibmPlexSans.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var resolved;
                  if (stored === 'dark' || stored === 'light') {
                    resolved = stored;
                  } else {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
                      ? 'dark'
                      : 'light';
                  }
                  document.documentElement.classList.toggle('dark', resolved === 'dark');
                  // Set color-scheme so WKWebView paints a matching canvas
                  // before our CSS loads — without this, dismissing the iOS
                  // PWA splash flashes the WebView's default white bg in dark
                  // mode for one frame before the body bg paints.
                  document.documentElement.style.colorScheme = resolved;
                  var meta = document.querySelector('meta[name="theme-color"]');
                  if (meta) {
                    meta.setAttribute(
                      'content',
                      resolved === 'dark' ? '${THEME_COLOR_DARK}' : '${THEME_COLOR_LIGHT}'
                    );
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <IOSStartupImages />
      </head>
      <body className="h-full antialiased bg-bg-base text-text-primary" suppressHydrationWarning>
        <TapFeedbackProvider />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <AuthGateProvider>
              <PageTransitionProvider>
                <AppShell overlay={overlay}>
                  {children}
                </AppShell>
              </PageTransitionProvider>
              <AuthGateOverlay />
            </AuthGateProvider>
          </AuthProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NODE_ENV !== 'production' && <DevServiceWorkerCleanup />}
      </body>
    </html>
  )
}
