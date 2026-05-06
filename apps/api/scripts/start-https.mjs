// Production-equivalent local server with HTTPS. The `dev` script can
// pass --experimental-https flags directly to `next dev`, but `next start`
// has no equivalent flag — it always serves plain HTTP. To install the
// PWA on a real phone over the Tailscale tailnet hostname (which iOS
// requires HTTPS for "Add to Home Screen"), we wrap Next's request
// handler in https.createServer here.
//
// Used by `npm run start:local`. NOT used in production; Vercel terminates
// TLS at the edge and runs `next start` on plain HTTP internally.

import { createServer } from 'node:https'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'node:url'
import next from 'next'

const KEY_PATH = './certificates/tailscale-dev.key'
const CERT_PATH = './certificates/tailscale-dev.crt'
// Pin to 3000 explicitly, ignoring process.env.PORT. A sibling project in
// the same shell environment exports PORT=3001, which would collide with
// claude-relay (which must keep 3001). The `dev` script does the same via
// next's `--port 3000` flag — see CLAUDE.md "what the flags mean".
const PORT = 3000

if (!existsSync(KEY_PATH) || !existsSync(CERT_PATH)) {
  console.error(
    `\nMissing Tailscale dev certs at ${KEY_PATH} / ${CERT_PATH}.\n` +
      `These are gitignored and tied to a specific Tailscale tailnet host.\n` +
      `See the "npm run dev — what the flags mean" section of CLAUDE.md\n` +
      `for how to regenerate them locally.\n`,
  )
  process.exit(1)
}

const httpsOptions = {
  key: readFileSync(resolve(KEY_PATH)),
  cert: readFileSync(resolve(CERT_PATH)),
}

const app = next({ dev: false })
const handle = app.getRequestHandler()

await app.prepare()

createServer(httpsOptions, (req, res) => {
  const parsedUrl = parse(req.url ?? '/', true)
  handle(req, res, parsedUrl)
}).listen(PORT, () => {
  console.log(`\n  ▶ Production-equivalent server with HTTPS`)
  console.log(`    Local:    https://localhost:${PORT}`)
  console.log(`    Tailnet:  https://<your-tailscale-host>:${PORT}\n`)
})
