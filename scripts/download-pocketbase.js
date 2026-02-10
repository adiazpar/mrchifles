#!/usr/bin/env node

/**
 * Downloads the correct PocketBase binary for the current platform.
 * Run with: npm run pb:download
 */

const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PB_VERSION = '0.22.4' // Update as needed
const PROJECT_ROOT = path.resolve(__dirname, '..')

function getPlatformInfo() {
  const platform = process.platform
  const arch = process.arch

  if (platform === 'darwin') {
    return arch === 'arm64' ? 'darwin_arm64' : 'darwin_amd64'
  } else if (platform === 'linux') {
    return arch === 'arm64' ? 'linux_arm64' : 'linux_amd64'
  } else if (platform === 'win32') {
    return arch === 'x64' ? 'windows_amd64' : 'windows_arm64'
  }
  throw new Error(`Unsupported platform: ${platform} ${arch}`)
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`)

    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (res) => {
          res.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve()
          })
        }).on('error', reject)
      } else {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      }
    }).on('error', reject)
  })
}

async function main() {
  try {
    const platformInfo = getPlatformInfo()
    const isWindows = process.platform === 'win32'
    const ext = isWindows ? '.exe' : ''
    const archiveExt = '.zip'

    const filename = `pocketbase_${PB_VERSION}_${platformInfo}${archiveExt}`
    const downloadUrl = `https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${filename}`

    const archivePath = path.join(PROJECT_ROOT, filename)
    const binaryPath = path.join(PROJECT_ROOT, `pocketbase${ext}`)

    console.log(`\n🍌 Downloading PocketBase ${PB_VERSION} for ${platformInfo}...\n`)

    await downloadFile(downloadUrl, archivePath)

    console.log('Extracting...')

    // Extract using unzip command (available on macOS and Linux)
    execSync(`unzip -o "${archivePath}" pocketbase${ext} -d "${PROJECT_ROOT}"`, {
      stdio: 'inherit'
    })

    // Make executable on Unix
    if (!isWindows) {
      fs.chmodSync(binaryPath, '755')
    }

    // Clean up archive
    fs.unlinkSync(archivePath)

    console.log(`\n✅ PocketBase downloaded to: ${binaryPath}`)
    console.log('\nTo start PocketBase, run: npm run pb:start')
    console.log('Admin UI will be at: http://127.0.0.1:8090/_/')

  } catch (error) {
    console.error('Error downloading PocketBase:', error.message)
    process.exit(1)
  }
}

main()
