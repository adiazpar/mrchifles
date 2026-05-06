// Barrel for @kasero/shared. Re-exports the most commonly used modules.
// Specific entry points are also exposed via the package.json `exports`
// map (e.g. import from '@kasero/shared/db/schema' for tree-shaking).
export * from './types'
export * from './api-messages'
export * from './business-role'
export * from './locales'
// Note: db/schema is NOT re-exported here because it pulls in drizzle-orm,
// which we don't want to force on every shared-package consumer. Import
// it directly from '@kasero/shared/db/schema' when needed.
