// Root-level fallback for the implicit `children` slot. Required by
// Next.js when an explicit parallel slot (`@overlay`) is also defined
// at this level, so the router can recover the children slot's active
// state during hard navigation between routes that have different
// shapes (e.g. soft-nav into an overlay, then refresh).
//
// Returns null because every real URL has a matching `page.tsx` in
// the children tree (via (hub), (auth), [businessId], etc.); this
// default only fires for genuinely unrecoverable shapes, where
// rendering nothing is preferable to a 404.
export default function Default() {
  return null
}
