import 'server-only'

/**
 * Server-side error logger that never leaks sensitive context.
 *
 * The previous pattern — `console.error('Auth error:', err)` —
 * dumped the full error object into Vercel's runtime logs. Drizzle
 * errors echo SQL fragments (table/column names visible in the
 * message); libsql errors echo parameter shapes; the error stack
 * carries internal file paths. None of this is exploitable on its
 * own, but anyone with log access (project members, plus any
 * future log-forwarding integration) gets a free schema map and
 * sometimes user / business IDs from failure cases.
 *
 * Production behavior:
 *   - emits `[<tag>] <ClassName>` and nothing else.
 *   - the error message, stack, and any `context` argument are
 *     intentionally dropped.
 *   - to debug a production incident, reproduce locally.
 *
 * Development behavior:
 *   - emits the full error object plus the optional `context`.
 *   - same shape as the old `console.error` calls so debugging
 *     ergonomics are unchanged.
 *
 * Tag convention: dot-separated `<area>.<action>` lowercase. The
 * tag is the stable identifier for a log line — keep them stable
 * across renames so log filters / alerts don't break.
 *
 * If/when we wire Sentry or Logflare, this is the integration
 * point — the helper is the single chokepoint, so the swap is
 * one file.
 */
export function logServerError(
  tag: string,
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === 'production') {
    const className =
      err instanceof Error
        ? err.name
        : err === null
        ? 'null'
        : typeof err
    console.error(`[${tag}] ${className}`)
    return
  }
  if (context !== undefined) {
    console.error(`[${tag}]`, err, context)
  } else {
    console.error(`[${tag}]`, err)
  }
}
