#!/usr/bin/env node
/*
 * Generates iOS PWA splash screens (apple-touch-startup-image).
 *
 * iOS Safari does not honor manifest.json's background_color or icons for the
 * launch screen — it requires explicit static PNGs linked via
 * <link rel="apple-touch-startup-image"> with a media query matching the
 * device's CSS dimensions, DPR, and color scheme. Without these, the launch
 * screen is blank (renders black on most devices).
 *
 * Run: node scripts/generate-ios-splash.mjs
 *
 * Updates needed when Apple ships new device sizes — add the entry to
 * DEVICES below and rerun. The <link> tags in layout.tsx are generated from
 * the same matrix, so update both together.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
// The SPA's apps/web/public/ is the source-of-truth; apps/api/public/ is
// rebuilt from it by prepare-spa.mjs. We write splash PNGs there so the dev
// server (Vite) and the next prod build both pick them up. After generating,
// mirror to apps/api/public/ to keep an active local prod preview in sync.
const WEB_PUBLIC = resolve(__dirname, '../../web/public')
const SOURCE_ICON = resolve(WEB_PUBLIC, 'icon-source.png')
const OUT_DIR = resolve(WEB_PUBLIC, 'splash')

// Logical-CSS-pixel size of the icon on the splash. Each entry resizes the
// source icon to ICON_CSS * dpr physical pixels and centers it on a solid bg.
const ICON_CSS = 160

// --color-paper from apps/web/src/styles/base.css — the Modern Mercantile
// Paper & Ink palette. Light = warm cream, dark = deep warm ink. Matches the
// theme-color meta in index.html so the splash, status bar, and first paint
// are all the same color (no flash on launch).
const BG_LIGHT = '#F6EFDF'
const BG_DARK = '#16120F'

/**
 * One row per unique (cssW, cssH, dpr) combination. Models listed in the
 * comment share the same screen geometry so a single PNG covers them all.
 */
const DEVICES = [
  // SE 2/3
  { cssW: 375, cssH: 667, dpr: 2 },
  // X / XS / 11 Pro / 12 mini / 13 mini
  { cssW: 375, cssH: 812, dpr: 3 },
  // XR / 11
  { cssW: 414, cssH: 896, dpr: 2 },
  // XS Max / 11 Pro Max
  { cssW: 414, cssH: 896, dpr: 3 },
  // 12 / 12 Pro / 13 / 13 Pro / 14 / 16e
  { cssW: 390, cssH: 844, dpr: 3 },
  // 14 Pro / 15 / 15 Pro / 16
  { cssW: 393, cssH: 852, dpr: 3 },
  // 16 Pro / 17 / 17 Pro
  { cssW: 402, cssH: 874, dpr: 3 },
  // iPhone Air
  { cssW: 420, cssH: 912, dpr: 3 },
  // 12 Pro Max / 13 Pro Max / 14 Plus
  { cssW: 428, cssH: 926, dpr: 3 },
  // 15 Plus / 15 Pro Max / 16 Plus
  { cssW: 430, cssH: 932, dpr: 3 },
  // 16 Pro Max / 17 Pro Max
  { cssW: 440, cssH: 956, dpr: 3 },
]

const THEMES = [
  { name: 'light', bg: BG_LIGHT },
  { name: 'dark', bg: BG_DARK },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const tasks = []
  for (const { cssW, cssH, dpr } of DEVICES) {
    const w = cssW * dpr
    const h = cssH * dpr
    const iconPx = ICON_CSS * dpr

    for (const { name: theme, bg } of THEMES) {
      tasks.push(generate({ w, h, iconPx, bg, theme }))
    }
  }

  const results = await Promise.all(tasks)
  for (const r of results) console.log(r)
  console.log(`\nGenerated ${results.length} splash images in public/splash/`)
}

async function generate({ w, h, iconPx, bg, theme }) {
  const filename = `apple-splash-${w}x${h}-${theme}.png`
  const outPath = resolve(OUT_DIR, filename)

  const iconBuf = await sharp(SOURCE_ICON)
    .resize(iconPx, iconPx, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: iconBuf, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(outPath)

  return `  ${filename}`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
