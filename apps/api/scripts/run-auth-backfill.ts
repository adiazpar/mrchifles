import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'

const __dirname = dirname(fileURLToPath(import.meta.url))

const fileArg = process.argv[2]
if (!fileArg) {
  console.error('Usage: tsx scripts/run-auth-backfill.ts <migration-file>')
  console.error('Example: tsx scripts/run-auth-backfill.ts 2026-05-13-02-auth-backfill.sql')
  process.exit(1)
}

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  console.error('TURSO_DATABASE_URL not set. For dev, point at file:./data/local.db.')
  process.exit(1)
}

const isLocalFile = url.startsWith('file:')
const client = createClient(isLocalFile ? { url } : { url, authToken })

const migrationsDir = resolve(__dirname, '..', '..', '..', 'packages', 'shared', 'migrations')
const sqlPath = resolve(migrationsDir, fileArg)
const sql = readFileSync(sqlPath, 'utf-8')

// libsql client accepts only single statements per execute(). Split on
// semicolons that are not inside string literals or comments. The SQL we
// ship uses plain DDL/DML with single-line `--` comments only, so a
// simple line-aware splitter is sufficient.
function splitStatements(input: string): string[] {
  const lines = input.split('\n')
  const stmts: string[] = []
  let current: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('--') || trimmed === '') continue
    current.push(line)
    if (trimmed.endsWith(';')) {
      stmts.push(current.join('\n').trim())
      current = []
    }
  }
  if (current.length) stmts.push(current.join('\n').trim())
  return stmts.filter(s => s.length > 0)
}

async function main() {
  console.log(`Running migration: ${fileArg}`)
  console.log(`Target: ${url}`)
  const statements = splitStatements(sql)

  // BEGIN/COMMIT/ROLLBACK are handled by the client's transaction API,
  // not by literal statements (libsql rejects nested BEGIN).
  const filtered = statements.filter(s =>
    !/^BEGIN(\s+TRANSACTION)?\s*;?$/i.test(s.trim()) &&
    !/^COMMIT\s*;?$/i.test(s.trim()) &&
    !/^ROLLBACK\s*;?$/i.test(s.trim())
  )

  const tx = await client.transaction('write')
  try {
    for (const stmt of filtered) {
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 100)
      console.log('  ' + preview + (stmt.length > 100 ? '...' : ''))
      try {
        await tx.execute(stmt)
      } catch (e: any) {
        const msg = String(e?.message ?? e)
        // ALTER TABLE ... DROP COLUMN raises "no such column" if the column
        // was already removed by a prior migration. Treat as a no-op so the
        // cleanup migration is idempotent across environments where some
        // columns may already be absent (e.g. local DBs that ran the
        // 2026-05-13-03-drop-legacy-auth-columns migration earlier).
        if (/no such column/i.test(msg) && /DROP COLUMN/i.test(stmt)) {
          console.warn(`  [skip] ${preview} — column already absent`)
          continue
        }
        throw e
      }
    }
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }

  // Quick sanity reads
  const userCount = await client.execute('SELECT COUNT(*) AS c FROM users WHERE email_verified = 1')
  const accountCount = await client.execute("SELECT COUNT(*) AS c FROM account WHERE provider_id = 'credential'")
  console.log('Verified users:', userCount.rows[0].c)
  console.log('Credential accounts:', accountCount.rows[0].c)
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
