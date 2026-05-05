import { AccountPage } from '@/components/account/AccountPage'

// Hard-navigation fallback for /account. The intercepting route at
// src/app/@overlay/(.)account/page.tsx handles soft navigation by
// rendering AccountPage into the @overlay slot (preserving the
// previous page in children). Refresh / deep link bypasses the
// intercept, so this conventional route renders AccountPage inline.
export default function Page() {
  return <AccountPage />
}
