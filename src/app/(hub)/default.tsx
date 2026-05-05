import { HubHome } from '@/components/hub/HubHome'

// Required by Next.js parallel routes: when the implicit `children` slot
// has no matching segment for the current URL (e.g. URL is /account, which
// matches only @overlay/account/page.tsx), Next.js renders this default
// for the children slot. Without it, refreshing on /account would 404.
export default function Default() {
  return <HubHome />
}
