// Adapter that exposes the next/navigation hook surface on top of
// react-router. The ported components were written against
// `next/navigation` (App Router) and use the hooks via patterns like:
//
//   const router = useRouter()
//   router.push('/foo')
//   const pathname = usePathname()
//   const sp = useSearchParams()
//   sp.get('code')
//
// Rewriting every callsite would be a sprawling churn for Phase 5.1
// (AuthContext et al). Instead, this shim maps each next-style hook to
// its react-router equivalent so the existing call patterns keep
// working unchanged. Phase 6 may revisit and codemod to native
// react-router idioms once IntlProvider lands.
//
// Notes:
// - `router.push/replace/back/forward/refresh` map to history methods.
//   `prefetch` is a no-op (react-router has no prefetch).
// - `useSearchParams` returns a `URLSearchParams` instance, which is
//   what next's hook returns (well, its read-only view) and what
//   callers like JoinPage expect with `.get('code')`.
// - `useParams` is the react-router version (re-exported from
//   'react-router' directly). Components import it from there, not from
//   this shim.

import { useHistory, useLocation } from 'react-router'
import { useMemo } from 'react'

// Next.js's `NavigateOptions` has `scroll`. We accept and ignore it —
// scroll restoration is handled at a higher level in this app.
interface NavigateOptions {
  scroll?: boolean
}

interface NextRouter {
  push: (href: string, options?: NavigateOptions) => void
  replace: (href: string, options?: NavigateOptions) => void
  back: () => void
  forward: () => void
  refresh: () => void
  prefetch: (href: string) => void
}

export function useRouter(): NextRouter {
  const history = useHistory()
  return useMemo<NextRouter>(
    () => ({
      push: (href, _options) => history.push(href),
      replace: (href, _options) => history.replace(href),
      back: () => history.goBack(),
      forward: () => history.goForward(),
      // No-op: react-router doesn't have a "refresh" concept; the data
      // refresh in app-router was server-side. Client-side data here is
      // re-fetched via the various contexts' own revalidation logic.
      refresh: () => {},
      // No-op: react-router has no prefetch.
      prefetch: () => {},
    }),
    [history],
  )
}

export function usePathname(): string {
  return useLocation().pathname
}

export function useSearchParams(): URLSearchParams {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}
