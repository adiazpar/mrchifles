/**
 * Migration script: Add business_users table and migrate existing data
 *
 * Run with: npx tsx scripts/migrate-business-users.ts
 */

import { config } from 'dotenv'
import { createClient } from '@libsql/client'
import { nanoid } from 'nanoid'

// Load environment variables
config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function migrate() {
  console.log('Starting business_users migration...')

  // Step 1: Create business_users table if it doesn't exist
  console.log('\n1. Creating business_users table...')
  await client.execute(`
    CREATE TABLE IF NOT EXISTS business_users (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      joined_at INTEGER NOT NULL,
      invited_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE NO ACTION
    )
  `)
  console.log('   Table created or already exists.')

  // Step 2: Create unique index on (user_id, business_id)
  console.log('\n2. Creating unique index on (user_id, business_id)...')
  try {
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS business_users_user_business_unique
      ON business_users (user_id, business_id)
    `)
    console.log('   Index created or already exists.')
  } catch (err) {
    console.log('   Index might already exist, continuing...')
  }

  // Step 3: Query all users with businessId
  console.log('\n3. Querying users with businessId...')
  const users = await client.execute(`
    SELECT id, business_id, role, status, invited_by, created_at
    FROM users
    WHERE business_id IS NOT NULL
  `)
  console.log(`   Found ${users.rows.length} users with business associations.`)

  // Step 4: Check existing business_users entries
  const existingEntries = await client.execute(`
    SELECT user_id, business_id FROM business_users
  `)
  const existingSet = new Set(
    existingEntries.rows.map(r => `${r.user_id}:${r.business_id}`)
  )

  // Step 5: Insert into business_users
  console.log('\n4. Migrating users to business_users...')
  let migrated = 0
  let skipped = 0

  for (const user of users.rows) {
    const key = `${user.id}:${user.business_id}`
    if (existingSet.has(key)) {
      skipped++
      continue
    }

    const now = Date.now()
    await client.execute({
      sql: `
        INSERT INTO business_users (id, user_id, business_id, role, status, joined_at, invited_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        nanoid(),
        user.id as string,
        user.business_id as string,
        user.role as string,
        user.status as string || 'active',
        user.created_at as number, // Use user's created_at as joined_at
        user.invited_by as string | null,
        now,
        now,
      ],
    })
    migrated++
  }

  console.log(`   Migrated: ${migrated}, Skipped (already exist): ${skipped}`)

  // Step 6: Verify
  console.log('\n5. Verifying migration...')
  const businessUsersCount = await client.execute(`SELECT COUNT(*) as count FROM business_users`)
  const usersWithBusinessCount = await client.execute(`SELECT COUNT(*) as count FROM users WHERE business_id IS NOT NULL`)

  console.log(`   business_users entries: ${businessUsersCount.rows[0].count}`)
  console.log(`   users with businessId: ${usersWithBusinessCount.rows[0].count}`)

  if (businessUsersCount.rows[0].count === usersWithBusinessCount.rows[0].count) {
    console.log('\n   Migration verified successfully!')
  } else {
    console.log('\n   Warning: Counts do not match. This could be due to multiple business memberships.')
  }

  console.log('\nMigration complete!')
}

migrate().catch(console.error)
