import { AccountPage } from '@/components/account/AccountPage'

// Intercepting route: when the user soft-navigates to /account from
// anywhere in the app, render AccountPage into the @overlay slot at
// the root layout while leaving the children slot on the previous URL.
// This is what makes peel-back reveal the actual previous page (instead
// of always falling back to hub home). Hard navigation (refresh, deep
// link) is handled by (hub)/account/page.tsx as the conventional route.
export default function Page() {
  return <AccountPage />
}
