import { MobileNav, Sidebar } from '@/components/layout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Sidebar for desktop */}
      <Sidebar />

      {/* Main content area */}
      <div className="with-sidebar flex flex-col min-h-screen">
        {children}
      </div>

      {/* Mobile navigation */}
      <MobileNav />
    </div>
  )
}
