'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useCreateBusiness } from '@/hooks'
import { CreateBusinessModal } from '@/components/create-business'

interface CreateBusinessContextValue {
  openCreateModal: () => void
}

const CreateBusinessContext = createContext<CreateBusinessContextValue | null>(null)

export function useCreateBusinessModal(): CreateBusinessContextValue {
  const context = useContext(CreateBusinessContext)
  if (!context) {
    // Return a no-op if not in hub context (business pages don't have this provider)
    return { openCreateModal: () => {} }
  }
  return context
}

interface CreateBusinessProviderProps {
  children: ReactNode
}

/**
 * Provider for create business modal functionality.
 * Used in hub layout to allow MobileNav to open the create business modal.
 */
export function CreateBusinessProvider({ children }: CreateBusinessProviderProps) {
  const createBusiness = useCreateBusiness()

  const value: CreateBusinessContextValue = {
    openCreateModal: createBusiness.handleOpen,
  }

  return (
    <CreateBusinessContext.Provider value={value}>
      {children}
      <CreateBusinessModal createBusiness={createBusiness} />
    </CreateBusinessContext.Provider>
  )
}
