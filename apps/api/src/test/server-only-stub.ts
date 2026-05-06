// Empty stub for the `server-only` package, aliased into Vitest via
// vitest.config.ts. The real package throws at import time when
// resolved into a non-server bundle (Next.js's enforcement), which
// would crash every test that imports a module guarded by
// `import 'server-only'`. This stub is a no-op so unit tests can
// run; the production protection is unchanged.
export {}
