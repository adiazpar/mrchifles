/**
 * Modal transition utilities
 *
 * When transitioning from one modal to another, we need to wait for the
 * exit animation to complete before showing the next modal. This prevents
 * visual glitches and ensures smooth transitions.
 */

/** Duration to wait for modal exit animation (matches CSS) */
export const MODAL_TRANSITION_DELAY = 180

/**
 * Transitions from one modal to another with proper animation timing.
 * Closes the first modal, waits for the exit animation, then opens the second.
 *
 * @param closeFirst - Function to close the first modal
 * @param openSecond - Function to open the second modal
 * @param delay - Optional custom delay (default: MODAL_TRANSITION_DELAY)
 * @returns Cleanup function to cancel the timeout if needed
 *
 * @example
 * ```tsx
 * onClick={() => {
 *   transitionModals(
 *     () => setIsFirstModalOpen(false),
 *     () => setIsSecondModalOpen(true)
 *   )
 * }}
 * ```
 */
export function transitionModals(
  closeFirst: () => void,
  openSecond: () => void,
  delay: number = MODAL_TRANSITION_DELAY
): () => void {
  closeFirst()
  const timer = setTimeout(openSecond, delay)
  return () => clearTimeout(timer)
}
