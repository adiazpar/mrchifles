/**
 * Status bar `theme-color` values, one per resolved theme and variant.
 *
 * These are authoritative — the inline script in app/layout.tsx inlines
 * these values in its string template, and the theme hooks import and
 * apply them directly. If you change a value here, both places pick it up.
 *
 * Two variants exist because the app has two background tiers:
 *   - `surface` mirrors --color-bg-surface; used on routes with a
 *     PageHeader so the status bar blends with the header bar.
 *   - `base` mirrors --color-bg-base; used on routes without a header
 *     (auth pages) so the status bar blends with the page body, and
 *     implicitly while the auth-gate overlay is visible (it also paints
 *     on --color-bg-base).
 * If --color-bg-base / --color-bg-surface change in base.css, mirror here.
 */
export const THEME_COLOR_LIGHT = '#F8FAFC'
export const THEME_COLOR_DARK = '#171717'
export const THEME_COLOR_BASE_LIGHT = '#F1F5F9'
export const THEME_COLOR_BASE_DARK = '#0F0F0F'

type ResolvedTheme = 'light' | 'dark'
export type ThemeColorVariant = 'surface' | 'base'

/**
 * Update the single `<meta name="theme-color">` tag to match the
 * resolved theme and the current variant. Runtime counterpart to what
 * the inline script does on first load.
 */
export function applyThemeColorMeta(
  resolved: ResolvedTheme,
  variant: ThemeColorVariant = 'surface',
): void {
  if (typeof document === 'undefined') return
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const color =
    variant === 'base'
      ? resolved === 'dark'
        ? THEME_COLOR_BASE_DARK
        : THEME_COLOR_BASE_LIGHT
      : resolved === 'dark'
        ? THEME_COLOR_DARK
        : THEME_COLOR_LIGHT
  meta.setAttribute('content', color)
}
