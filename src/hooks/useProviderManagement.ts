'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useBusiness } from '@/contexts/business-context'
import { useProviders } from '@/contexts/providers-context'
import { canManageBusiness } from '@/lib/business-role'
import { apiPost, apiPatch, apiDelete, ApiError, ApiResponse } from '@/lib/api-client'
import { useApiMessage } from '@/hooks/useApiMessage'
import type { Provider } from '@/types'
import type { ExpandedOrder } from '@/lib/products'

interface UseProviderManagementOptions {
  businessId: string
  /**
   * Optional setter from `useOrders()`. When provided, the delete handler
   * detaches the deleted provider from any in-memory order expansion so
   * stale references don't linger in the UI. Omit on pages that don't
   * render orders.
   */
  setOrders?: (updater: (prev: ExpandedOrder[]) => ExpandedOrder[]) => void
}

interface ProviderResponse extends ApiResponse {
  provider: Provider
}

interface UseProviderManagementReturn {
  // Data
  providers: Provider[]
  sortedProviders: Provider[]
  isLoading: boolean
  error: string

  // Permissions
  canManage: boolean

  // Modal state
  isModalOpen: boolean
  /** Step the modal should open on. Used by swipe actions to jump straight
   *  into delete-confirm (step 1) instead of the form (step 0). */
  modalInitialStep: number
  editingProvider: Provider | null
  isSaving: boolean
  providerSaved: boolean

  // Delete state
  isDeleting: boolean
  providerDeleted: boolean

  // Form state
  name: string
  setName: (name: string) => void
  phone: string
  setPhone: (phone: string) => void
  email: string
  setEmail: (email: string) => void
  active: boolean
  setActive: (active: boolean) => void

  // Actions
  handleOpenModal: (provider?: Provider) => void
  /** Open the modal directly on the delete-confirm step for the given
   *  provider. Used by the row's swipe-tray delete action. */
  handleOpenDelete: (provider: Provider) => void
  handleCloseModal: () => void
  handleModalExitComplete: () => void
  handleSubmit: () => Promise<boolean>
  handleDelete: () => Promise<boolean>
  setError: (error: string) => void
}

export function useProviderManagement({ businessId, setOrders }: UseProviderManagementOptions): UseProviderManagementReturn {
  const { role } = useBusiness()
  const t = useTranslations('providers')
  const translateApiMessage = useApiMessage()

  // Data comes from the shared providers store so mutations anywhere in
  // the app (e.g. a delete on the detail page) are reflected here
  // without a manual refetch.
  const {
    providers,
    setProviders,
    isLoading: providersLoading,
    isLoaded: providersLoaded,
    ensureLoaded: ensureProvidersLoaded,
    error: providersError,
  } = useProviders()
  const [error, setError] = useState('')
  const isLoading = providersLoading || !providersLoaded

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalInitialStep, setModalInitialStep] = useState(0)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [providerSaved, setProviderSaved] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [providerDeleted, setProviderDeleted] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [active, setActive] = useState(true)

  // Check if current user can manage providers
  const canManage = canManageBusiness(role)

  useEffect(() => {
    ensureProvidersLoaded()
  }, [ensureProvidersLoaded])

  // Surface context fetch errors through the hook's error field so the
  // page's existing error banner keeps working.
  useEffect(() => {
    if (providersError) setError(providersError)
  }, [providersError])

  // Sort providers: active first, then by name
  const sortedProviders = useMemo(() => {
    return [...providers].sort((a, b) => {
      // Active first
      if (a.active && !b.active) return -1
      if (!a.active && b.active) return 1
      // Then by name
      return a.name.localeCompare(b.name)
    })
  }, [providers])

  const resetForm = useCallback(() => {
    setName('')
    setPhone('')
    setEmail('')
    setActive(true)
    setEditingProvider(null)
    setError('')
    setProviderSaved(false)
    setProviderDeleted(false)
    setModalInitialStep(0)
  }, [])

  const handleOpenModal = useCallback((provider?: Provider) => {
    if (provider) {
      setEditingProvider(provider)
      setName(provider.name)
      setPhone(provider.phone || '')
      setEmail(provider.email || '')
      setActive(provider.active)
    } else {
      resetForm()
    }
    setModalInitialStep(0)
    setIsModalOpen(true)
  }, [resetForm])

  // Open the modal straight into the delete-confirm step for `provider`.
  // Form fields are still seeded so Save-success / etc. behave correctly if
  // the user backs out of the delete step (though the swipe-entry flow hides
  // the back button, that's an affordance of the modal, not this hook).
  const handleOpenDelete = useCallback((provider: Provider) => {
    setEditingProvider(provider)
    setName(provider.name)
    setPhone(provider.phone || '')
    setEmail(provider.email || '')
    setActive(provider.active)
    setError('')
    setProviderSaved(false)
    setProviderDeleted(false)
    setModalInitialStep(1)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleModalExitComplete = useCallback(() => {
    resetForm()
  }, [resetForm])

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (!name.trim()) {
      setError(t('error_name_required'))
      return false
    }

    setIsSaving(true)
    setError('')

    try {
      const providerData = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        active,
      }

      if (editingProvider) {
        const result = await apiPatch<ProviderResponse>(
          `/api/businesses/${businessId}/providers/${editingProvider.id}`,
          providerData
        )
        setProviders(prev =>
          prev.map(p => (p.id === result.provider.id ? result.provider : p)),
        )
      } else {
        const result = await apiPost<ProviderResponse>(
          `/api/businesses/${businessId}/providers`,
          providerData
        )
        setProviders(prev => [...prev, result.provider])
      }

      setProviderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving provider:', err)
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_save')
      )
      return false
    } finally {
      setIsSaving(false)
    }
  }, [businessId, name, phone, email, active, editingProvider, setProviders, t, translateApiMessage])

  const handleDelete = useCallback(async (): Promise<boolean> => {
    if (!editingProvider) return false
    setIsDeleting(true)
    setError('')
    try {
      await apiDelete(`/api/businesses/${businessId}/providers/${editingProvider.id}`)
      // Drop the provider from the shared list so every consumer (dropdowns,
      // this page's list, the provider detail page's own list) reflects it.
      setProviders(prev => prev.filter(p => p.id !== editingProvider.id))
      // If the caller wired in the orders setter, detach the deleted provider
      // from any cached order expansion. Mirrors the backend which nulls
      // orders.providerId on delete.
      if (setOrders) {
        const deletedId = editingProvider.id
        setOrders(prev =>
          prev.map(o => {
            if (o.providerId !== deletedId) return o
            const nextExpand = o.expand ? { ...o.expand } : undefined
            if (nextExpand) delete nextExpand.provider
            return { ...o, providerId: null, expand: nextExpand }
          })
        )
      }
      setProviderDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting provider:', err)
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_delete')
      )
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [businessId, editingProvider, setProviders, setOrders, t, translateApiMessage])

  return {
    // Data
    providers,
    sortedProviders,
    isLoading,
    error,

    // Permissions
    canManage,

    // Modal state
    isModalOpen,
    modalInitialStep,
    editingProvider,
    isSaving,
    providerSaved,

    // Delete state
    isDeleting,
    providerDeleted,

    // Form state
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    active,
    setActive,

    // Actions
    handleOpenModal,
    handleOpenDelete,
    handleCloseModal,
    handleModalExitComplete,
    handleSubmit,
    handleDelete,
    setError,
  }
}
