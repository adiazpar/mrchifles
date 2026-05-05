// Hub route group has no shared layout chrome of its own — header, navbar,
// providers, and the @overlay slot all live at the root layout. Pass-
// through. The route group keeps the URL structure flat (`/`, `/account`,
// `/join` are at the URL root, not under `/hub`).
export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
