#!/usr/bin/env node

/**
 * Resets the database and creates a default admin account
 * Run with: npm run db:reset
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const PB_DATA = path.join(PROJECT_ROOT, 'pb_data')
const isWindows = process.platform === 'win32'
const binaryName = isWindows ? 'pocketbase.exe' : 'pocketbase'
const binaryPath = path.join(PROJECT_ROOT, binaryName)

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim()
        }
      }
    }
  }
}

loadEnv()

// Get admin credentials from environment
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing admin credentials.')
  console.error('Add PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD to .env.local')
  console.error('\nExample .env.local:')
  console.error('  PB_ADMIN_EMAIL=your-email@example.com')
  console.error('  PB_ADMIN_PASSWORD=your-password')
  process.exit(1)
}

if (!fs.existsSync(binaryPath)) {
  console.error(`PocketBase binary not found at: ${binaryPath}`)
  console.error('Run "npm run pb:download" first.')
  process.exit(1)
}

console.log('Resetting database...\n')

// Step 1: Delete pb_data
if (fs.existsSync(PB_DATA)) {
  console.log('Deleting pb_data folder...')
  fs.rmSync(PB_DATA, { recursive: true, force: true })
}

// Step 2: Run migrations
console.log('Running migrations...')
try {
  execSync(`"${binaryPath}" migrate up`, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  })
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
}

// Step 3: Create admin account
console.log('\nCreating admin account...')
try {
  execSync(`"${binaryPath}" admin create "${ADMIN_EMAIL}" "${ADMIN_PASSWORD}"`, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  })
} catch (error) {
  console.error('Failed to create admin:', error.message)
  process.exit(1)
}

console.log('\n========================================')
console.log('Database reset complete!')
console.log('========================================')
console.log(`Admin UI: http://127.0.0.1:8090/_/`)
console.log(`Email:    ${ADMIN_EMAIL}`)
console.log('========================================\n')
