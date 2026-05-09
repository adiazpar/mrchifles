/**
 * Status bar `theme-color` values, one per resolved theme.
 *
 * These are authoritative — the inline script in apps/web/index.html
 * uses these literal values in its string template, and the theme hooks
 * import and apply them directly. If you change a value here, mirror it
 * in index.html.
 *
 * Values mirror --color-paper from styles/base.css (light/dark) so the
 * iOS status bar matches the page body and the IonHeader (which inherits
 * via --ion-toolbar-background → --color-bg-base → --color-paper). If
 * the paper tokens move, mirror the new values here.
 */
export const THEME_COLOR_LIGHT = '#F6EFDF'
export const THEME_COLOR_DARK = '#16120F'

type ResolvedTheme = 'light' | 'dark'

/**
 * Update the `<meta name="theme-color">` tag to match the resolved
 * theme. Runtime counterpart to what the inline script does on first
 * load.
 *
 * iOS Safari (especially in standalone / PWA mode) caches the parsed
 * theme-color and ignores in-place `setAttribute('content', ...)`
 * mutations — the user has to cold-launch the app for the new color to
 * land in the status-bar / dynamic-island region. The portable fix is
 * to remove the meta element and reinsert a fresh one with the new
 * content so iOS treats it as a new declaration. Tested working on
 * iOS 17+ standalone PWA.
 */
export function applyThemeColorMeta(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  const next = resolved === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT

  const existing = document.querySelector('meta[name="theme-color"]')
  // The new tag mirrors whatever attributes were on the old one (other
  // than `content`) so any future `media`-scoped variants we add stay
  // intact through the swap.
  const replacement = document.createElement('meta')
  replacement.setAttribute('name', 'theme-color')
  replacement.setAttribute('content', next)
  if (existing) {
    existing.parentNode?.replaceChild(replacement, existing)
  } else {
    document.head.appendChild(replacement)
  }
}
