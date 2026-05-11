import { useEffect, useRef } from 'react'
import { useGoBackTo } from './useGoBackTo'

/**
 * Defense-in-depth guard for detail pages.
 *
 * Detail pages typically derive their subject entity from a shared context
 * (e.g. `useProviders().providers.find(p => p.id === id)`). If that entity
 * disappears while the page is still mounted in the IonRouterOutlet stack
 * — because it was deleted, transferred away, or a sync removed it — we
 * navigate back to the parent route so the user is never staring at a
 * tombstone of stale data.
 *
 * In practice this should rarely fire: post-mutation navigation via
 * `useGoBackTo` already pops the dead page off the stack before this
 * effect runs. The guard exists for the cases that miss that path — a
 * future code path, an inbound sync, a deep-link revisit — so the failure
 * mode is "slides away" instead of "renders deleted data."
 *
 * The hook tracks whether the entity was ever present so it doesn't fire
 * during initial load (entity is null until the parent fetches it).
 *
 * `enabled` lets the page pause the guard during its own modal-driven exit
 * (e.g. the delete-success animation plays before the page navigates).
 * The page knows when its own teardown is in flight; the guard does not.
 *
 * Usage:
 *   const provider = providers.find(p => p.id === id)
 *   useDetailEntityGuard(provider, `/${businessId}/providers`, {
 *     enabled: !providerDeleted,
 *   })
 */
export function useDetailEntityGuard(
  entity: unknown,
  fallbackHref: string,
  options: { enabled?: boolean } = {},
): void {
  const { enabled = true } = options
  const goBackTo = useGoBackTo()
  const wasPresent = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (entity != null) {
      wasPresent.current = true
    } else if (wasPresent.current) {
      goBackTo(fallbackHref)
    }
  }, [entity, fallbackHref, goBackTo, enabled])
}
