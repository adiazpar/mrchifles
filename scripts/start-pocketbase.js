#!/usr/bin/env node

/**
 * Starts PocketBase server (cross-platform)
 * Run with: npm run pb:start
 */

const { spawn } = require('child_process')
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

const args = ['serve', '--http=127.0.0.1:8090', '--automigrate']

console.log(`Starting PocketBase...`)
console.log(`Binary: ${binaryPath}`)
console.log(`API: http://127.0.0.1:8090/api/`)
console.log(`Admin: http://127.0.0.1:8090/_/\n`)

const child = spawn(binaryPath, args, {
  stdio: 'inherit',
  cwd: PROJECT_ROOT
})

child.on('error', (err) => {
  console.error('Failed to start PocketBase:', err.message)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code || 0)
})
