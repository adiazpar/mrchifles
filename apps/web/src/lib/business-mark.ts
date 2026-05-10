/**
 * Single source of truth for the placeholder mark a business shows when it
 * has no uploaded logo. Both the hub-list row and the manage-page hero use
 * these helpers, so the same business renders the same initials on the same
 * background colour everywhere it appears.
 *
 * The colour palette lives in CSS variables (`--color-mark-1` through
 * `--color-mark-5` in base.css) with paired light + dark values, so picks
 * automatically respect the active theme without any JS conditional.
 */

const MARK_COLOR_VARS = [
  'var(--color-mark-1)',
  'var(--color-mark-2)',
  'var(--color-mark-3)',
  'var(--color-mark-4)',
  'var(--color-mark-5)',
] as const

/**
 * Deterministically picks a placeholder fill for `businessId`. Hashing keeps
 * a given business pinned to the same hue across sessions and across every
 * surface in the app — the user sees their bakery as moss-green on the hub
 * AND on the manage page, not terracotta in one place and moss in the other.
 */
export function pickBusinessMarkColor(businessId: string): string {
  let hash = 0
  for (let i = 0; i < businessId.length; i++) {
    hash = (hash * 31 + businessId.charCodeAt(i)) | 0
  }
  return MARK_COLOR_VARS[Math.abs(hash) % MARK_COLOR_VARS.length]
}

/**
 * Two-letter initials for the business name. Mirrors the rule used by the
 * provider + team avatars: the first letter of the first two words, falling
 * back to the first two letters of a single-word name. Defensive against
 * empty / whitespace-only input so the mark always has something to render.
 */
export function getBusinessInitials(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase() || '?'
}
