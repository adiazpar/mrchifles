import packageJson from '../../package.json'

/**
 * App version, read from package.json at build time.
 *
 * Bump the `version` field in package.json when you ship a release and
 * the About modal will pick it up on the next build. No manual string
 * tracking required.
 *
 * If you want to also show the commit SHA, add an environment variable
 * like NEXT_PUBLIC_GIT_SHA and set it via vercel.json or a prebuild
 * script, then concatenate here.
 */
export const APP_VERSION: string = packageJson.version
