/**
 * Status bar `theme-color` values, one per resolved theme.
 *
 * These are authoritative — the inline script in app/layout.tsx inlines
 * these values in its string template, and the theme hooks import and
 * apply them directly. If you change a value here, both places pick it up.
 *
 * Values mirror --color-bg-surface from styles/base.css so the iOS status
 * bar blends with the page header bar. If --color-bg-surface changes there,
 * update these to match.
 */
export const THEME_COLOR_LIGHT = '#F8FAFC'
export const THEME_COLOR_DARK = '#171717'

export type ResolvedTheme = 'light' | 'dark'

/**
 * Update the single `<meta name="theme-color">` tag to match the resolved
 * theme. Runtime counterpart to what the inline script does on first load.
 */
export function applyThemeColorMeta(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  meta.setAttribute(
    'content',
    resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT,
  )
}
