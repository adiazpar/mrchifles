import { useCallback } from 'react'
import { useIonRouter } from '@ionic/react'

/**
 * Ionic-aware "go back to a parent route" navigation.
 *
 * After a mutation makes the current page meaningless (deleting a provider,
 * leaving a business, deleting an account, etc.) we need to land the user
 * on the parent route AND remove the dead page from the IonRouterOutlet
 * stack. Plain `history.push` won't do this — `IonRouterOutlet` sees a
 * forward `PUSH` action and stacks the parent on top of the dead page,
 * which then resurfaces when the user taps back.
 *
 * `router.push(href, 'back', 'pop')` tells Ionic: animate as a back
 * transition AND pop the outlet's current entry. If the target href is
 * already in the stack, the outlet pops down to it; otherwise it inserts
 * a fresh entry and the back animation still plays.
 *
 * Usage:
 *   const goBackTo = useGoBackTo()
 *   // ...after successful delete:
 *   goBackTo(`/${businessId}/providers`)
 */
export function useGoBackTo(): (fallbackHref: string) => void {
  const router = useIonRouter()
  return useCallback(
    (fallbackHref: string) => {
      router.push(fallbackHref, 'back', 'pop')
    },
    [router],
  )
}
