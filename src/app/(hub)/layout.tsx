import { HubOverlayMount } from '@/components/layout/HubOverlayMount'

export default function HubLayout({
  children,
  overlay,
}: {
  children: React.ReactNode
  overlay: React.ReactNode
}) {
  return <HubOverlayMount underlay={children}>{overlay}</HubOverlayMount>
}
