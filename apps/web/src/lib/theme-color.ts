/**
 * Status bar `theme-color` values, one per resolved theme.
 *
 * These are authoritative — the inline script in apps/web/index.html
 * uses these literal values in its string template, and the theme hooks
 * import and apply them directly. If you change a value here, mirror it
 * in index.html.
 *
 * Values mirror --color-bg-base from styles/base.css so the iOS status
 * bar matches the page body and the IonHeader (which inherits base via
 * --ion-toolbar-background). If --color-bg-base changes there, mirror
 * the new value here.
 */
export const THEME_COLOR_LIGHT = '#F1F5F9'
export const THEME_COLOR_DARK = '#0F0F0F'

type ResolvedTheme = 'light' | 'dark'

/**
 * Update the single `<meta name="theme-color">` tag to match the
 * resolved theme. Runtime counterpart to what the inline script does
 * on first load.
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
