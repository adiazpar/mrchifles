import { Fragment } from 'react'

/*
 * iOS Safari ignores manifest.json's background_color and icons for the PWA
 * launch screen — it requires explicit static PNGs linked via these tags.
 * Without them, the launch screen is blank (renders black on most devices).
 *
 * One entry per unique (cssW, cssH, dpr) combination; iOS picks the matching
 * PNG using the media query, then chooses light/dark by prefers-color-scheme.
 *
 * Regenerate the PNGs with `node scripts/generate-ios-splash.mjs` and keep
 * this list in sync with the DEVICES array in that script when adding new
 * device sizes.
 */
const DEVICES = [
  { cssW: 375, cssH: 667, dpr: 2 }, // SE 2/3
  { cssW: 375, cssH: 812, dpr: 3 }, // X / XS / 11 Pro / 12 mini / 13 mini
  { cssW: 414, cssH: 896, dpr: 2 }, // XR / 11
  { cssW: 414, cssH: 896, dpr: 3 }, // XS Max / 11 Pro Max
  { cssW: 390, cssH: 844, dpr: 3 }, // 12 / 12 Pro / 13 / 13 Pro / 14 / 16e
  { cssW: 393, cssH: 852, dpr: 3 }, // 14 Pro / 15 / 15 Pro / 16
  { cssW: 402, cssH: 874, dpr: 3 }, // 16 Pro / 17 / 17 Pro
  { cssW: 420, cssH: 912, dpr: 3 }, // iPhone Air
  { cssW: 428, cssH: 926, dpr: 3 }, // 12 Pro Max / 13 Pro Max / 14 Plus
  { cssW: 430, cssH: 932, dpr: 3 }, // 15 Plus / 15 Pro Max / 16 Plus
  { cssW: 440, cssH: 956, dpr: 3 }, // 16 Pro Max / 17 Pro Max
] as const

const THEMES = ['light', 'dark'] as const

export function IOSStartupImages() {
  return (
    <>
      {DEVICES.map(({ cssW, cssH, dpr }) => {
        const w = cssW * dpr
        const h = cssH * dpr
        return (
          <Fragment key={`${w}x${h}`}>
            {THEMES.map((theme) => (
              <link
                key={theme}
                rel="apple-touch-startup-image"
                href={`/splash/apple-splash-${w}x${h}-${theme}.png`}
                media={
                  `(device-width: ${cssW}px) and (device-height: ${cssH}px) ` +
                  `and (-webkit-device-pixel-ratio: ${dpr}) ` +
                  `and (orientation: portrait) ` +
                  `and (prefers-color-scheme: ${theme})`
                }
              />
            ))}
          </Fragment>
        )
      })}
    </>
  )
}
