#!/usr/bin/env node
// Flatten nested translation JSON files into flat dot-keyed JSON, the
// canonical react-intl format. Idempotent: re-running on already-flat
// files is a no-op (because there are no nested objects to traverse).
//
// Usage: `node apps/web/scripts/flatten-messages.mjs`
//   Operates on apps/web/src/i18n/messages/*.json in place.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.resolve(__dirname, '../src/i18n/messages')

function flatten(obj, prefix = '', acc = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      acc[fullKey] = value
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flatten(value, fullKey, acc)
    } else {
      throw new Error(
        `Unexpected value at ${fullKey}: ${typeof value}. ` +
          `Translation files must contain only nested objects of strings.`,
      )
    }
  }
  return acc
}

const files = fs.readdirSync(messagesDir).filter((f) => f.endsWith('.json'))
let totalKeys = 0
for (const file of files) {
  const fp = path.join(messagesDir, file)
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'))
  const flat = flatten(data)
  fs.writeFileSync(fp, JSON.stringify(flat, null, 2) + '\n')
  console.log(`Flattened ${file}: ${Object.keys(flat).length} keys`)
  totalKeys += Object.keys(flat).length
}
console.log(`Done. ${files.length} files, ${totalKeys} total keys.`)
