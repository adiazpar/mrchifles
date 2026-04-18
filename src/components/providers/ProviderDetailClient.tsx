'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, Phone, Mail, ClipboardList, Repeat, Trash2 } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { ClipboardIcon, EditIcon } from '@/components/icons'
import { Spinner, Modal } from '@/components/ui'
import { ProviderModal, getProviderInitials } from './'
import { useOrderFlows } from '@/hooks/useOrderFlows'
import { apiRequest, apiPatch, apiDelete, ApiError } from '@/lib/api-client'
import { useApiMessage } from '@/hooks/useApiMessage'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useBusiness } from '@/contexts/business-context'
import { useNavbar } from '@/contexts/navbar-context'
import { canManageBusiness } from '@/lib/business-role'
import { formatRelative } from '@/lib/formatRelative'
import { getOrderDisplayStatus } from '@/lib/products'
import type { Provider, Product } from '@/types'
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

interface ProvidersResponse {
  success?: boolean
  providers: Provider[]
  [key: string]: unknown
}

interface ProductsResponse {
  success?: boolean
  products: Product[]
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
  const { formatCurrency } = useBusinessFormat()
  // Relative time ("3 days ago") is LANGUAGE, not formatting — use user UI
  // locale, not business locale, so an English UI doesn't show "hace 3 días".
  const userLocale = useLocale()
  const translateApiMessage = useApiMessage()
  const { role } = useBusiness()
  const { hide, show, setSlideDirection, setSlideTargetPath, setPendingHref } = useNavbar()
  const canManage = canManageBusiness(role)

  // Hide the bottom nav while viewing the detail page.
  useEffect(() => {
    hide()
    return () => show()
  }, [hide, show])

  const [provider, setProvider] = useState<Provider | null>(null)
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [providerOrders, setProviderOrders] = useState<ExpandedOrder[]>([])
  // Products and all providers fetched so the New Order and Order Detail
  // modals have the full catalog and can populate the provider dropdown.
  const [products, setProducts] = useState<Product[]>([])
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isEditOpen, setEditOpen] = useState(false)
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false)
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

  // ===== Filtered setOrders =====
  // When an order's provider is changed via the edit flow (detached from
  // THIS provider), it should vanish from the list. Wrap setOrders so the
  // filter is applied on every update the hook makes.
  const setFilteredProviderOrders = useCallback(
    (updater: ExpandedOrder[] | ((prev: ExpandedOrder[]) => ExpandedOrder[])) => {
      setProviderOrders(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        return next.filter(o => o.providerId === providerId)
      })
    },
    [providerId],
  )

  // ===== Wire up the shared order-flows hook =====
  const orderFlows = useOrderFlows({
    businessId,
    products,
    providers: allProviders,
    setOrders: setFilteredProviderOrders,
    // setProducts omitted: this page does not display product stock.
    canDelete: canManage,
  })

  // ===== Load data =====
  const loadAll = useCallback(async () => {
    try {
      setError('')
      const [detail, ordersData, productsData, providersData] = await Promise.all([
        apiRequest<ProviderDetailResponse>(`/api/businesses/${businessId}/providers/${providerId}`),
        apiRequest<OrdersResponse>(`/api/businesses/${businessId}/orders?providerId=${providerId}`),
        apiRequest<ProductsResponse>(`/api/businesses/${businessId}/products`),
        apiRequest<ProvidersResponse>(`/api/businesses/${businessId}/providers`),
      ])
      setProvider(detail.provider)
      setStats(detail.stats)
      setProviderOrders(ordersData.orders)
      setProducts(productsData.products)
      setAllProviders(providersData.providers)
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

  // Refresh stats when provider orders change (edits/receives/deletes).
  // The hook updates providerOrders via setOrders; recompute a fresh stats
  // snapshot from the list so the Activity card stays in sync without an
  // extra API call.
  useEffect(() => {
    if (!providerOrders) return
    const totalOrders = providerOrders.length
    const totalSpent = providerOrders.reduce((sum, o) => sum + o.total, 0)
    const lastOrderDate = providerOrders
      .map(o => new Date(o.date).getTime())
      .reduce<number | null>((max, t) => (max === null || t > max ? t : max), null)
    setStats({
      totalOrders,
      totalSpent,
      lastOrderDate: lastOrderDate ? new Date(lastOrderDate).toISOString() : null,
    })
  }, [providerOrders])

  // ===== Edit provider =====
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
      const result = await apiPatch<{ success: true; provider: Provider }>(
        `/api/businesses/${businessId}/providers/${providerId}`,
        payload,
      )
      // Optimistic update of local provider state + allProviders list used
      // by the order modals' dropdown.
      setProvider(result.provider)
      setAllProviders(prev => prev.map(p => p.id === result.provider.id ? result.provider : p))
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
  }, [businessId, providerId, name, phone, email, notes, active, t, translateApiMessage])

  // ===== Delete provider =====
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
      setDeleteModalOpen(false)
    }
  }, [businessId, providerId, router, setSlideTargetPath, setSlideDirection, setPendingHref, t, translateApiMessage])

  // ===== Typical items =====
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

  const initials = getProviderInitials(provider.name)
  const hasOrders = providerOrders.length > 0

  return (
    <>
      <main className="page-content space-y-4">
        {/* ============== Identity Card ==============
            Tappable hero. Left: initials avatar. Middle: name + contact
            rows with inline icons. Right: subtle edit chevron indicator. */}
        <button
          type="button"
          onClick={canManage ? openEdit : undefined}
          disabled={!canManage}
          className="card card-interactive w-full p-4 flex items-center gap-4 text-left disabled:cursor-default"
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 bg-brand-subtle text-brand">
            <span className="text-lg font-semibold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-base font-semibold text-text-primary truncate">
                {provider.name}
              </div>
              {!provider.active && (
                <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-bg-muted text-text-tertiary flex-shrink-0">
                  {t('status_inactive')}
                </span>
              )}
            </div>
            {provider.phone && (
              <div className="text-sm text-text-tertiary truncate flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                {provider.phone}
              </div>
            )}
            {provider.email && (
              <div className="text-sm text-text-tertiary truncate flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {provider.email}
              </div>
            )}
            {!provider.phone && !provider.email && !provider.notes && canManage && (
              <div className="text-sm text-text-tertiary mt-0.5">
                {t('tap_to_add_contact')}
              </div>
            )}
          </div>
          {canManage && (
            <EditIcon className="text-brand flex-shrink-0" style={{ width: 18, height: 18 }} />
          )}
        </button>

        {provider.notes && (
          <div className="card p-4">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {provider.notes}
            </p>
          </div>
        )}

        {/* ============== Stats ==============
            Three centered columns with hairline dividers. No card, so they
            feel like attribute chips rather than boxed-in data. */}
        {stats && (
          <div className="flex pt-1">
            <div className="flex-1 flex flex-col items-center text-center px-2">
              <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary min-h-[2.25rem] flex items-end">
                {t('stat_total_orders')}
              </div>
              <div className="text-lg font-semibold text-text-primary tabular-nums mt-1">
                {stats.totalOrders}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center text-center px-2 border-l border-border">
              <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary min-h-[2.25rem] flex items-end">
                {t('stat_total_spent')}
              </div>
              <div className="text-lg font-semibold text-text-primary tabular-nums mt-1">
                {formatCurrency(stats.totalSpent)}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center text-center px-2 border-l border-border">
              <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary min-h-[2.25rem] flex items-end">
                {t('stat_last_order')}
              </div>
              <div className="text-base font-semibold text-text-primary mt-1">
                {stats.lastOrderDate
                  ? formatRelative(stats.lastOrderDate, userLocale)
                  : t('stat_never_ordered')}
              </div>
            </div>
          </div>
        )}

        {/* ============== New order CTA ==============
            Matches the "Add" button styling used in Products and Orders tabs
            but full-width since it IS the page's primary action. */}
        {canManage && (
          <button
            type="button"
            onClick={() => orderFlows.openNewOrder(providerId)}
            className="btn btn-primary w-full"
          >
            <Plus className="w-4 h-4" />
            {t('new_order_button')}
          </button>
        )}

        {/* ============== Order History ==============
            Products-page card pattern: title + count + hr + list. */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold text-text-primary">
                {t('order_history_title')}
              </h3>
              {hasOrders && (
                <>
                  <span className="text-text-tertiary">&#183;</span>
                  <span className="text-sm text-text-secondary">
                    {tOrders('order_count', { count: providerOrders.length })}
                  </span>
                </>
              )}
            </div>
          </div>

          <hr className="border-border" />

          {!hasOrders ? (
            <p className="text-sm text-text-tertiary text-center py-6">
              {t('order_history_empty')}
            </p>
          ) : (
            <div>
              {providerOrders.map(order => (
                <OrderHistoryRow
                  key={order.id}
                  order={order}
                  onView={() => orderFlows.openOrderDetail(order)}
                  formatCurrency={formatCurrency}
                  userLocale={userLocale}
                  tStatusPending={tOrders('status_pending')}
                  tStatusReceived={tOrders('status_received')}
                  tStatusOverdue={tOrders('status_overdue')}
                  tUnitCount={(count: number) => tOrders('item_unit_count', { count })}
                />
              ))}
            </div>
          )}
        </div>

        {/* ============== Typical items (conditional, >=3 orders) ============== */}
        {typicalItems.length > 0 && (
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-text-tertiary" />
              <h3 className="text-sm font-semibold text-text-primary">
                {t('typical_items_title')}
              </h3>
            </div>
            <hr className="border-border" />
            <div className="space-y-2">
              {typicalItems.map(item => (
                <div key={item.name} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-text-primary truncate flex-1 min-w-0">{item.name}</span>
                  {item.avgCost != null && (
                    <span className="text-xs text-text-tertiary flex-shrink-0 tabular-nums">
                      {t('typical_items_avg_cost', { cost: formatCurrency(item.avgCost) })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============== Danger zone ==============
            Tiny underlined link at the bottom; opens a confirmation modal. */}
        {canManage && (
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 text-sm text-error hover:underline"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete_provider_button')}
            </button>
          </div>
        )}
      </main>

      {/* ============== Edit modal ============== */}
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

      {/* ============== Delete confirmation modal ============== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title={t('delete_provider_confirm_title')}
      >
        <Modal.Item>
          <p className="text-sm text-text-secondary">
            {t('delete_provider_confirm_body', { name: provider.name })}
          </p>
        </Modal.Item>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(false)}
            className="btn btn-secondary flex-1"
            disabled={isDeleting}
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn btn-danger flex-1"
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner /> : tCommon('delete')}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ============== Order flows (new order + order detail/edit/receive/delete) ============== */}
      {orderFlows.modals}
    </>
  )
}

interface OrderHistoryRowProps {
  order: ExpandedOrder
  onView: () => void
  formatCurrency: (n: number) => string
  userLocale: string
  tStatusPending: string
  tStatusReceived: string
  tStatusOverdue: string
  tUnitCount: (count: number) => string
}

function OrderHistoryRow({
  order,
  onView,
  formatCurrency,
  userLocale,
  tStatusPending,
  tStatusReceived,
  tStatusOverdue,
  tUnitCount,
}: OrderHistoryRowProps) {
  const items = order.expand?.['order_items(order)'] || []
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const displayStatus = getOrderDisplayStatus(order)

  const statusColors = {
    pending: { bg: '!bg-warning-subtle', text: 'text-warning' },
    received: { bg: '!bg-success-subtle', text: 'text-success' },
    overdue: { bg: '!bg-error-subtle', text: 'text-error' },
  } as const
  const statusLabels = {
    pending: tStatusPending,
    received: tStatusReceived,
    overdue: tStatusOverdue,
  } as const

  const colors = statusColors[displayStatus]
  const label = statusLabels[displayStatus]

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
          <div className={`product-list-image flex items-center justify-center ${colors.bg}`}>
            <ClipboardIcon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium block text-text-primary">
              {formatRelative(order.date, userLocale)}
            </span>
            <span className="text-xs text-text-tertiary mt-0.5 block">
              {tUnitCount(itemCount)}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="font-medium block text-error">-{formatCurrency(order.total)}</span>
            <span className={`text-xs mt-0.5 block ${colors.text}`}>{label}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 ml-2" />
        </div>
      </div>
    </div>
  )
}
