// Pre-build step: assemble the Vite SPA into apps/api/public/ so that the
// final Next.js deployment serves both the API and the SPA shell from a
// single origin.
//
// Idempotent: if apps/web/dist/index.html already exists (the user just
// ran `npm run build:web` from the repo root), skip the rebuild and only
// copy. Otherwise, build the SPA first.
//
// Existing non-SPA content under apps/api/public (notably the dev-only
// /media/products/ uploads tree) is preserved -- cpSync merges into the
// destination instead of wiping it.

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(here, '..')
const repoRoot = resolve(apiRoot, '../..')
const webDist = resolve(repoRoot, 'apps/web/dist')
const apiPublic = resolve(apiRoot, 'public')

if (!existsSync(resolve(webDist, 'index.html'))) {
  console.log('[prepare-spa] apps/web/dist not found; building SPA...')
  execFileSync('npm', ['run', 'build', '--workspace=@kasero/web'], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
}

console.log(`[prepare-spa] copying ${webDist} -> ${apiPublic}`)
cpSync(webDist, apiPublic, { recursive: true, force: true })
console.log('[prepare-spa] done')
