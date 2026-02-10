#!/usr/bin/env node

/**
 * Runs PocketBase migrations (cross-platform)
 * Run with: npm run pb:migrate
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const isWindows = process.platform === 'win32'
const binaryName = isWindows ? 'pocketbase.exe' : 'pocketbase'
const binaryPath = path.join(PROJECT_ROOT, binaryName)

if (!fs.existsSync(binaryPath)) {
  console.error(`PocketBase binary not found at: ${binaryPath}`)
  console.error('Run "npm run pb:download" first.')
  process.exit(1)
}

console.log('Running PocketBase migrations...\n')

try {
  execSync(`"${binaryPath}" migrate up`, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  })
  console.log('\nMigrations completed successfully.')
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
}
