// TypeScript 6 requires a type declaration for side-effect imports of
// non-TS files (e.g. `import './globals.css'`). Next.js handles CSS at the
// bundler level and doesn't ship an ambient `*.css` declaration, so we
// provide a minimal one here.
declare module '*.css'
