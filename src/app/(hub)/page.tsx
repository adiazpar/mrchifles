'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { BusinessIcon } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { Spinner } from '@/components/ui'

interface Business {
  id: string
  name: string
  role: string
  isOwner: boolean
  createdAt: string
}

/**
 * Hub page - Zone 2
 * Shows user's businesses or empty state
 * Action buttons are rendered by MobileNav in hub mode
 */
export default function HubPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    async function fetchBusinesses() {
      try {
        const res = await fetch('/api/businesses/list')
        if (res.ok) {
          const data = await res.json()
          setBusinesses(data.businesses || [])
        }
      } catch (error) {
        console.error('Failed to fetch businesses:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusinesses()
  }, [user, authLoading, router])

  const handleEnterBusiness = (businessId: string) => {
    router.push(`/${businessId}/home`)
  }

  if (authLoading || isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  const hasBusinesses = businesses.length > 0

  if (!hasBusinesses) {
    return (
      <main className="page-loading">
        <div className="empty-state">
          <BusinessIcon className="empty-state-icon" />
          <h3 className="empty-state-title">No businesses yet</h3>
          <p className="empty-state-description">
            Create your own business or join an existing one with an invite code
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="hub-content">
      <div className="hub-greeting">
        <h2 className="hub-greeting__title">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="hub-greeting__subtitle">
          Select a business to continue
        </p>
      </div>

      <div className="hub-businesses">
        <h3 className="hub-section-title">Your Businesses</h3>
        <div className="hub-business-list">
          {businesses.map((business) => (
            <button
              key={business.id}
              type="button"
              className="hub-business-card"
              onClick={() => handleEnterBusiness(business.id)}
            >
              <div className="hub-business-card__icon">
                <BusinessIcon />
              </div>
              <div className="hub-business-card__info">
                <span className="hub-business-card__name">{business.name}</span>
                <span className="hub-business-card__role">
                  {business.role === 'owner' ? 'Owner' :
                   business.role === 'partner' ? 'Partner' : 'Employee'}
                </span>
              </div>
              <ArrowRight className="hub-business-card__arrow" />
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
