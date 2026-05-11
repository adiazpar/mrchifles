/**
 * Single source of truth for the placeholder mark a provider shows in
 * place of an uploaded logo. Mirrors `lib/business-mark.ts`: every
 * surface that renders a provider mark (list rows, the detail-page hero,
 * the delete-confirm specimen) imports from here so a given provider
 * renders the same hue in the same shape across the entire app.
 *
 * The colour palette lives in CSS variables (`--color-mark-1` through
 * `--color-mark-5` in base.css) with paired light + dark values, so picks
 * automatically respect the active theme without any JS conditional.
 *
 * Implementation note: businesses and providers share the same five-hue
 * palette, but each picks independently from its own id, so a business
 * and a provider never collide-by-design — they live in different
 * lists and different surfaces.
 */

const MARK_COLOR_VARS = [
  'var(--color-mark-1)',
  'var(--color-mark-2)',
  'var(--color-mark-3)',
  'var(--color-mark-4)',
  'var(--color-mark-5)',
] as const

/**
 * Deterministically picks a mark fill for `providerId`. Hashing keeps a
 * given provider pinned to the same hue across sessions and across every
 * surface — the user sees their flour supplier as moss-green on the
 * provider list, on the detail page, AND in the delete-confirm card,
 * not three different colours in three different places.
 */
export function pickProviderMarkColor(providerId: string): string {
  let hash = 0
  for (let i = 0; i < providerId.length; i++) {
    hash = (hash * 31 + providerId.charCodeAt(i)) | 0
  }
  return MARK_COLOR_VARS[Math.abs(hash) % MARK_COLOR_VARS.length]
}
