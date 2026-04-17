'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { EditIcon, ClipboardIcon } from '@/components/icons'
import { Spinner } from '@/components/ui'
import { ProviderModal } from './ProviderModal'
import { apiRequest, apiPatch, apiDelete, ApiError } from '@/lib/api-client'
import { useApiMessage } from '@/hooks/useApiMessage'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useBusiness } from '@/contexts/business-context'
import { useNavbar } from '@/contexts/navbar-context'
import { canManageBusiness } from '@/lib/business-role'
import { formatRelative } from '@/lib/formatRelative'
import type { Provider } from '@/types'
import type { ExpandedOrder } from '@/lib/products'

interface ProviderStats {
  totalOrders: number
  totalSpent: number
  lastOrderDate: string | null
}

interface ProviderDetailResponse {
  success?: boolean
  provider: Provider
  stats: ProviderStats
  [key: string]: unknown
}

interface OrdersResponse {
  success?: boolean
  orders: ExpandedOrder[]
  [key: string]: unknown
}

export interface ProviderDetailClientProps {
  businessId: string
  providerId: string
}

export function ProviderDetailClient({ businessId, providerId }: ProviderDetailClientProps) {
  const router = useRouter()
  const t = useTranslations('providers')
  const tOrders = useTranslations('orders')
  const tCommon = useTranslations('common')
  const { formatCurrency, formatDate, locale } = useBusinessFormat()
  const translateApiMessage = useApiMessage()
  const { role } = useBusiness()
  const { hide, show, setSlideDirection, setSlideTargetPath, setPendingHref } = useNavbar()
  const canManage = canManageBusiness(role)

  // Hide the bottom nav while viewing the detail page (mirrors Account page).
  useEffect(() => {
    hide()
    return () => show()
  }, [hide, show])

  const [provider, setProvider] = useState<Provider | null>(null)
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [providerOrders, setProviderOrders] = useState<ExpandedOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isEditOpen, setEditOpen] = useState(false)
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit modal form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [providerSaved, setProviderSaved] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      setError('')
      const [detail, ordersData] = await Promise.all([
        apiRequest<ProviderDetailResponse>(`/api/businesses/${businessId}/providers/${providerId}`),
        apiRequest<OrdersResponse>(`/api/businesses/${businessId}/orders?providerId=${providerId}`),
      ])
      setProvider(detail.provider)
      setStats(detail.stats)
      setProviderOrders(ordersData.orders)
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_load')
      )
    } finally {
      setIsLoading(false)
    }
  }, [businessId, providerId, t, translateApiMessage])

  useEffect(() => { loadAll() }, [loadAll])

  const openEdit = () => {
    if (!provider) return
    setName(provider.name)
    setPhone(provider.phone || '')
    setEmail(provider.email || '')
    setNotes(provider.notes || '')
    setActive(provider.active)
    setProviderSaved(false)
    setEditError('')
    setEditOpen(true)
  }

  const handleSaveEdit = useCallback(async (): Promise<boolean> => {
    if (!name.trim()) { setEditError(t('error_name_required')); return false }
    setIsSaving(true)
    setEditError('')
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        active,
      }
      await apiPatch<{ success: true; provider: Provider }>(
        `/api/businesses/${businessId}/providers/${providerId}`,
        payload,
      )
      await loadAll()
      setProviderSaved(true)
      return true
    } catch (err) {
      setEditError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_save')
      )
      return false
    } finally {
      setIsSaving(false)
    }
  }, [businessId, providerId, name, phone, email, notes, active, loadAll, t, translateApiMessage])

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      await apiDelete(`/api/businesses/${businessId}/providers/${providerId}`)
      const href = `/${businessId}/providers`
      setSlideTargetPath(`/${businessId}/providers/${providerId}`)
      setSlideDirection('back')
      setPendingHref(href)
      router.push(href)
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_delete')
      )
      setIsDeleting(false)
      setDeleteConfirmOpen(false)
    }
  }, [businessId, providerId, router, setSlideTargetPath, setSlideDirection, setPendingHref, t, translateApiMessage])

  const typicalItems = useMemo(() => {
    if (providerOrders.length < 3) return []
    const agg = new Map<string, { name: string; count: number; totalCost: number; sampleCount: number }>()
    for (const order of providerOrders) {
      const items = order.expand?.['order_items(order)'] || []
      for (const item of items) {
        const key = item.productId || item.productName
        const entry = agg.get(key) || { name: item.productName, count: 0, totalCost: 0, sampleCount: 0 }
        entry.count += item.quantity
        if (item.unitCost != null) {
          entry.totalCost += item.unitCost
          entry.sampleCount += 1
        }
        agg.set(key, entry)
      }
    }
    return [...agg.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(v => ({ name: v.name, avgCost: v.sampleCount > 0 ? v.totalCost / v.sampleCount : null }))
  }, [providerOrders])

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  if (error || !provider) {
    return (
      <main className="page-content">
        <div className="p-4 bg-error-subtle text-error rounded-lg">
          {error || t('error_failed_to_load')}
        </div>
      </main>
    )
  }

  if (isDeleteConfirmOpen) {
    return (
      <main className="page-content space-y-6">
        <div className="card p-4 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">{t('delete_provider_confirm_title')}</h2>
          <p className="text-sm text-text-secondary">
            {t('delete_provider_confirm_body', { name: provider.name })}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="btn btn-secondary flex-1" disabled={isDeleting}>
              {tCommon('cancel')}
            </button>
            <button type="button" onClick={handleDelete} className="btn btn-danger flex-1" disabled={isDeleting}>
              {isDeleting ? <Spinner /> : tCommon('delete')}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-6">
        {/* Identity card */}
        <div className="card p-4 space-y-2 relative">
          {canManage && (
            <button
              type="button"
              onClick={openEdit}
              className="btn btn-icon absolute top-3 right-3"
              aria-label={tCommon('edit')}
            >
              <EditIcon className="text-brand" style={{ width: 16, height: 16 }} />
            </button>
          )}
          <h2 className="text-lg font-semibold text-text-primary">{provider.name}</h2>
          {provider.phone && <p className="text-sm text-text-secondary">{provider.phone}</p>}
          {provider.email && <p className="text-sm text-text-secondary">{provider.email}</p>}
          {provider.notes && <p className="text-sm text-text-tertiary whitespace-pre-wrap">{provider.notes}</p>}
        </div>

        {/* Stats strip */}
        {stats && (
          <div className="flex gap-4">
            <div className="flex-1">
              <span className="block text-xs text-text-secondary">{t('stat_total_orders')}</span>
              <span className="block text-sm font-semibold text-text-primary tabular-nums">{stats.totalOrders}</span>
            </div>
            <div className="flex-1">
              <span className="block text-xs text-text-secondary">{t('stat_total_spent')}</span>
              <span className="block text-sm font-semibold text-text-primary tabular-nums">{formatCurrency(stats.totalSpent)}</span>
            </div>
            <div className="flex-1">
              <span className="block text-xs text-text-secondary">{t('stat_last_order')}</span>
              <span className="block text-sm font-semibold text-text-primary">
                {stats.lastOrderDate ? formatRelative(stats.lastOrderDate, locale) : t('stat_never_ordered')}
              </span>
            </div>
          </div>
        )}

        {/* Primary action */}
        {canManage && (
          <button
            type="button"
            onClick={() => {
              // Deep-link to Products page; it'll auto-open the New Order modal
              // with this provider preselected. Task 18 wires this up.
              router.push(`/${businessId}/products?newOrder=1&providerId=${providerId}`)
            }}
            className="btn btn-primary w-full"
          >
            <Plus className="w-4 h-4" />
            {t('new_order_button')}
          </button>
        )}

        {/* Order history */}
        <div className="card p-4 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">{t('order_history_title')}</h3>
          <hr className="border-border" />
          {providerOrders.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">{t('order_history_empty')}</p>
          ) : (
            <div>
              {providerOrders.map(order => (
                <OrderHistoryRow
                  key={order.id}
                  order={order}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  tStatusPending={tOrders('status_pending')}
                  tStatusReceived={tOrders('status_received')}
                  tUnitCount={(count: number) => tOrders('item_unit_count', { count })}
                  onView={() => {
                    router.push(`/${businessId}/products?orderId=${order.id}`)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Typical items */}
        {typicalItems.length > 0 && (
          <div className="card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">{t('typical_items_title')}</h3>
            <hr className="border-border" />
            <div className="space-y-1">
              {typicalItems.map(item => (
                <div key={item.name} className="flex justify-between text-sm">
                  <span className="text-text-secondary truncate flex-1 min-w-0">{item.name}</span>
                  {item.avgCost != null && (
                    <span className="text-xs text-text-tertiary flex-shrink-0 ml-3">
                      {t('typical_items_avg_cost', { cost: formatCurrency(item.avgCost) })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger zone */}
        {canManage && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-error text-sm underline"
            >
              {t('delete_provider_button')}
            </button>
          </div>
        )}
      </main>

      {/* Edit modal */}
      <ProviderModal
        isOpen={isEditOpen}
        onClose={() => setEditOpen(false)}
        onExitComplete={() => { setProviderSaved(false); setEditError('') }}
        name={name}
        onNameChange={setName}
        phone={phone}
        onPhoneChange={setPhone}
        email={email}
        onEmailChange={setEmail}
        notes={notes}
        onNotesChange={setNotes}
        active={active}
        onActiveChange={setActive}
        editingProvider={provider}
        isSaving={isSaving}
        error={editError}
        providerSaved={providerSaved}
        onSubmit={handleSaveEdit}
      />
    </>
  )
}

interface OrderHistoryRowProps {
  order: ExpandedOrder
  formatCurrency: (n: number) => string
  formatDate: (d: Date | string) => string
  tStatusPending: string
  tStatusReceived: string
  tUnitCount: (count: number) => string
  onView: () => void
}

function OrderHistoryRow({ order, formatCurrency, formatDate, tStatusPending, tStatusReceived, tUnitCount, onView }: OrderHistoryRowProps) {
  const items = order.expand?.['order_items(order)'] || []
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const status = order.status
  const statusClass = status === 'received' ? 'text-success' : 'text-warning'
  const statusLabel = status === 'received' ? tStatusReceived : tStatusPending

  return (
    <div
      className="list-item-clickable"
      onClick={onView}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView() } }}
      role="button"
      tabIndex={0}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="product-list-image flex items-center justify-center">
            <ClipboardIcon className={`w-5 h-5 ${statusClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium block">{formatDate(new Date(order.date))}</span>
            <span className="text-xs text-text-tertiary">
              {tUnitCount(itemCount)}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="font-medium block text-error">-{formatCurrency(order.total)}</span>
            <span className={`text-xs mt-0.5 block ${statusClass}`}>{statusLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
