'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useBusiness } from '@/contexts/business-context'
import { useProviders } from '@/contexts/providers-context'
import { canManageBusiness } from '@/lib/business-role'
import { apiPost, apiPatch, ApiError, ApiResponse } from '@/lib/api-client'
import { useApiMessage } from '@/hooks/useApiMessage'
import type { Provider } from '@/types'

export interface UseProviderManagementOptions {
  businessId: string
}

interface ProviderResponse extends ApiResponse {
  provider: Provider
}

export interface UseProviderManagementReturn {
  // Data
  providers: Provider[]
  sortedProviders: Provider[]
  isLoading: boolean
  error: string

  // Permissions
  canManage: boolean

  // Modal state
  isModalOpen: boolean
  editingProvider: Provider | null
  isSaving: boolean
  providerSaved: boolean

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
  handleCloseModal: () => void
  handleModalExitComplete: () => void
  handleSubmit: () => Promise<boolean>
  setError: (error: string) => void
}

export function useProviderManagement({ businessId }: UseProviderManagementOptions): UseProviderManagementReturn {
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
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [providerSaved, setProviderSaved] = useState(false)

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
    setIsModalOpen(true)
  }, [resetForm])

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
    editingProvider,
    isSaving,
    providerSaved,

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
    handleCloseModal,
    handleModalExitComplete,
    handleSubmit,
    setError,
  }
}
