'use client'

import { useParams } from 'next/navigation'
import { ProviderDetailClient } from '@/components/providers/ProviderDetailClient'

export default function ProviderDetailPage() {
  const params = useParams<{ businessId: string; id: string }>()
  if (!params?.businessId || !params?.id) return null
  return <ProviderDetailClient businessId={params.businessId} providerId={params.id} />
}
