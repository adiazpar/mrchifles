'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useBusiness } from '@/contexts/business-context'
import { canManageBusiness } from '@/lib/business-role'
import { apiRequest, apiPost, apiPatch, apiDelete, ApiError, ApiResponse } from '@/lib/api-client'
import type { Provider } from '@/types'

export interface UseProviderManagementOptions {
  businessId: string
}

interface ProvidersResponse extends ApiResponse {
  providers: Provider[]
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
  isDeleting: boolean
  providerSaved: boolean
  providerDeleted: boolean

  // Form state
  name: string
  setName: (name: string) => void
  phone: string
  setPhone: (phone: string) => void
  email: string
  setEmail: (email: string) => void
  notes: string
  setNotes: (notes: string) => void
  active: boolean
  setActive: (active: boolean) => void

  // Actions
  handleOpenModal: (provider?: Provider) => void
  handleCloseModal: () => void
  handleModalExitComplete: () => void
  handleSubmit: () => Promise<boolean>
  handleDelete: () => Promise<boolean>
  setError: (error: string) => void
}

export function useProviderManagement({ businessId }: UseProviderManagementOptions): UseProviderManagementReturn {
  const { role } = useBusiness()
  const t = useTranslations('providers')

  // Data state
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [providerSaved, setProviderSaved] = useState(false)
  const [providerDeleted, setProviderDeleted] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)

  // Check if current user can manage providers
  const canManage = canManageBusiness(role)

  // Load providers
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const data = await apiRequest<ProvidersResponse>(`/api/businesses/${businessId}/providers`)

        if (cancelled) return

        setProviders(data.providers)
      } catch (err) {
        if (cancelled) return
        console.error('Error loading providers:', err)
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError(t('error_failed_to_load'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [businessId, t])

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
    setNotes('')
    setActive(true)
    setEditingProvider(null)
    setError('')
    setProviderSaved(false)
    setProviderDeleted(false)
  }, [])

  const handleOpenModal = useCallback((provider?: Provider) => {
    if (provider) {
      setEditingProvider(provider)
      setName(provider.name)
      setPhone(provider.phone || '')
      setEmail(provider.email || '')
      setNotes(provider.notes || '')
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
        notes: notes.trim() || null,
        active,
      }

      if (editingProvider) {
        await apiPatch<ProviderResponse>(
          `/api/businesses/${businessId}/providers/${editingProvider.id}`,
          providerData
        )
      } else {
        await apiPost<ProviderResponse>(
          `/api/businesses/${businessId}/providers`,
          providerData
        )
      }

      // Reload providers
      const listData = await apiRequest<ProvidersResponse>(`/api/businesses/${businessId}/providers`)
      setProviders(listData.providers)

      setProviderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving provider:', err)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('error_failed_to_save'))
      }
      return false
    } finally {
      setIsSaving(false)
    }
  }, [businessId, name, phone, email, notes, active, editingProvider, t])

  const handleDelete = useCallback(async (): Promise<boolean> => {
    if (!editingProvider) return false

    setIsDeleting(true)
    setError('')

    try {
      await apiDelete<ProviderResponse>(`/api/businesses/${businessId}/providers/${editingProvider.id}`)

      // Reload providers
      const listData = await apiRequest<ProvidersResponse>(`/api/businesses/${businessId}/providers`)
      setProviders(listData.providers)

      setProviderDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting provider:', err)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('error_failed_to_delete'))
      }
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [businessId, editingProvider, t])

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
    isDeleting,
    providerSaved,
    providerDeleted,

    // Form state
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    notes,
    setNotes,
    active,
    setActive,

    // Actions
    handleOpenModal,
    handleCloseModal,
    handleModalExitComplete,
    handleSubmit,
    handleDelete,
    setError,
  }
}
