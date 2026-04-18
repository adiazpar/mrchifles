'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { Plus, ChevronRight, Phone, Mail, MessageCircle, ClipboardList, Repeat } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { CheckmarkIcon, ClipboardIcon, EditIcon } from '@/components/icons'
import { Spinner, TabContainer } from '@/components/ui'
import { ProviderModal, getProviderInitials } from './'
import { useOrderFlows } from '@/hooks/useOrderFlows'
import { useOrders } from '@/contexts/orders-context'
import { useProviders } from '@/contexts/providers-context'
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

interface ProductsResponse {
  success?: boolean
  products: Product[]
  [key: string]: unknown
}

export interface ProviderDetailClientProps {
  businessId: string
  providerId: string
}

type DetailTab = 'summary' | 'history' | 'notes'

const DETAIL_TAB_IDS: readonly DetailTab[] = ['summary', 'history', 'notes'] as const

function isDetailTab(value: string | null): value is DetailTab {
  return (DETAIL_TAB_IDS as readonly string[]).includes(value ?? '')
}

export function ProviderDetailClient({ businessId, providerId }: ProviderDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('providers')
  const tOrders = useTranslations('orders')
  const { formatCurrency } = useBusinessFormat()
  // Relative time ("3 days ago") is LANGUAGE, not formatting — use user UI
  // locale, not business locale, so an English UI doesn't show "hace 3 días".
  const userLocale = useLocale()
  const translateApiMessage = useApiMessage()
  const { role } = useBusiness()
  const { setSlideDirection, setSlideTargetPath, setPendingHref, setPageSubtitleSuffix, setNavOverride } = useNavbar()
  const canManage = canManageBusiness(role)

  // Tab state — initialized from the URL so browser back/forward and
  // router.back() restore the tab the user was on (mirrors the products
  // page pattern).
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    const fromUrl = searchParams?.get('tab') ?? null
    return isDetailTab(fromUrl) ? fromUrl : 'summary'
  })

  const urlForTab = useCallback(
    (tab: DetailTab) => {
      const base = `/${businessId}/providers/${providerId}`
      return tab === 'summary' ? base : `${base}?tab=${tab}`
    },
    [businessId, providerId],
  )

  const handleTabChange = useCallback(
    (tab: DetailTab) => {
      setActiveTab(tab)
      router.replace(urlForTab(tab), { scroll: false })
    },
    [router, urlForTab],
  )

  // Append the provider name to the header subtitle ("Providers · Name").
  // Clear on unmount so the subtitle reverts when leaving the page.
  useEffect(() => {
    return () => setPageSubtitleSuffix(null)
  }, [setPageSubtitleSuffix])

  const [provider, setProvider] = useState<Provider | null>(null)
  // Products are fetched locally (no shared store yet). The providers
  // dropdown used by the order modals reads from the shared providers
  // store below.
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isEditOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [providerDeleted, setProviderDeleted] = useState(false)

  // Edit modal form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [active, setActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [providerSaved, setProviderSaved] = useState(false)

  // Shared orders + providers stores. Orders whose providerId changes
  // elsewhere fall out of this page's derived list automatically; the
  // providers store powers the New Order / Order Detail modal dropdowns.
  const { orders: allOrders, setOrders, ensureLoaded: ensureOrdersLoaded } = useOrders()
  const {
    providers: allProvidersAll,
    setProviders,
    ensureLoaded: ensureProvidersLoaded,
  } = useProviders()
  const allProviders = useMemo(
    () => allProvidersAll.filter(p => p.active),
    [allProvidersAll],
  )
  const providerOrders = useMemo(
    () => allOrders.filter(o => o.providerId === providerId),
    [allOrders, providerId],
  )
  const stats = useMemo<ProviderStats>(() => {
    const totalOrders = providerOrders.length
    const totalSpent = providerOrders.reduce((sum, o) => sum + o.total, 0)
    const lastOrderTs = providerOrders
      .map(o => new Date(o.date).getTime())
      .reduce<number | null>((max, t) => (max === null || t > max ? t : max), null)
    return {
      totalOrders,
      totalSpent,
      lastOrderDate: lastOrderTs ? new Date(lastOrderTs).toISOString() : null,
    }
  }, [providerOrders])

  // ===== Wire up the shared order-flows hook =====
  const orderFlows = useOrderFlows({
    businessId,
    products,
    providers: allProviders,
    setOrders,
    // setProducts omitted: this page does not display product stock.
    canDelete: canManage,
  })

  // ===== Navbar override: replace the standard nav items with the
  // page's primary action (New order from this provider). The existing
  // slide animation handles hide-on-leave / slide-up-with-new-content.
  //
  // useOrderFlows returns a fresh object each render, so we read the
  // current opener through a ref to keep the click handler stable and
  // prevent an effect re-run loop that would otherwise thrash setState.
  const orderFlowsRef = useRef(orderFlows)
  orderFlowsRef.current = orderFlows
  const openNewOrderForProvider = useCallback(() => {
    orderFlowsRef.current.openNewOrder(providerId)
  }, [providerId])

  useEffect(() => {
    if (!canManage || !provider?.name) return
    setNavOverride(
      <button
        type="button"
        onClick={openNewOrderForProvider}
        className="btn btn-primary w-full"
      >
        <Plus className="w-4 h-4" />
        <span className="truncate">
          {t('new_order_button', { name: provider.name })}
        </span>
      </button>
    )
    return () => setNavOverride(null)
  }, [canManage, provider?.name, openNewOrderForProvider, setNavOverride, t])

  // ===== Load data =====
  // Page-specific data (provider, product catalog, providers list for the
  // order modal dropdown). The orders list comes from the shared
  // OrdersContext below — see ensureOrdersLoaded().
  const loadAll = useCallback(async () => {
    try {
      setError('')
      const [detail, productsData] = await Promise.all([
        apiRequest<ProviderDetailResponse>(`/api/businesses/${businessId}/providers/${providerId}`),
        apiRequest<ProductsResponse>(`/api/businesses/${businessId}/products`),
        ensureOrdersLoaded(),
        ensureProvidersLoaded(),
      ])
      setProvider(detail.provider)
      setProducts(productsData.products)
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_load')
      )
    } finally {
      setIsLoading(false)
    }
  }, [businessId, providerId, ensureOrdersLoaded, ensureProvidersLoaded, t, translateApiMessage])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (provider?.name) setPageSubtitleSuffix(provider.name)
  }, [provider?.name, setPageSubtitleSuffix])

  // ===== Edit provider =====
  const openEdit = () => {
    if (!provider) return
    setName(provider.name)
    setPhone(provider.phone || '')
    setEmail(provider.email || '')
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
        active,
      }
      const result = await apiPatch<{ success: true; provider: Provider }>(
        `/api/businesses/${businessId}/providers/${providerId}`,
        payload,
      )
      // Update local provider state + sync the shared providers list so
      // the order-modal dropdowns on other pages see the new values.
      setProvider(result.provider)
      setProviders(prev => prev.map(p => (p.id === result.provider.id ? result.provider : p)))
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
  }, [businessId, providerId, name, phone, email, active, setProviders, t, translateApiMessage])

  // ===== Delete provider =====
  // Returns true on successful delete, which lets the modal navigate to the
  // delete-success step. The actual navigation back to the providers list
  // happens once the modal has fully closed — see onExitComplete below —
  // so the delete-success animation plays before the slide-back fires.
  const handleDelete = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true)
    setEditError('')
    try {
      await apiDelete(`/api/businesses/${businessId}/providers/${providerId}`)
      // Detach the provider from every piece of client state so no UI
      // anywhere in the app keeps a dangling reference:
      //   - Remove it from the shared providers list (dropdowns, the
      //     /providers list page).
      //   - Null out providerId and drop the `provider` expansion on
      //     every order that referenced it (matches the backend, which
      //     already nulls orders.providerId on delete).
      setProviders(prev => prev.filter(p => p.id !== providerId))
      setOrders(prev =>
        prev.map(o => {
          if (o.providerId !== providerId) return o
          const nextExpand = o.expand ? { ...o.expand } : undefined
          if (nextExpand) delete nextExpand.provider
          return { ...o, providerId: null, expand: nextExpand }
        }),
      )
      setProviderDeleted(true)
      return true
    } catch (err) {
      setEditError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t('error_failed_to_delete')
      )
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [businessId, providerId, setOrders, setProviders, t, translateApiMessage])

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
            Top row: avatar, name, active/inactive status text, edit button.
            Bottom row: three contact actions (call / whatsapp / email).
            Each action is disabled — but still visible — when its
            underlying contact field is empty. */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 bg-brand-subtle text-brand">
              <span className="text-lg font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-text-primary truncate">
                {provider.name}
              </div>
              <div className="text-sm mt-0.5 flex items-center gap-1.5 min-w-0">
                <span
                  className={`font-medium flex-shrink-0 ${
                    provider.active ? 'text-success' : 'text-error'
                  }`}
                >
                  {provider.active ? t('status_active') : t('status_inactive')}
                </span>
                {provider.createdAt && (
                  <>
                    <span className="text-text-tertiary flex-shrink-0">&#183;</span>
                    <span className="text-text-tertiary truncate">
                      {t('since_date', { date: formatMonthYear(provider.createdAt, userLocale) })}
                    </span>
                  </>
                )}
              </div>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={openEdit}
                className="btn btn-secondary btn-icon flex-shrink-0"
                aria-label={t('edit_provider_aria')}
              >
                <EditIcon className="text-brand" style={{ width: 18, height: 18 }} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ContactActionButton
              icon={<Phone className="w-5 h-5" />}
              label={t('action_phone')}
              sublabel={provider.phone ? t('action_call_sublabel') : '—'}
              href={provider.phone ? `tel:${provider.phone}` : undefined}
              disabled={!provider.phone}
            />
            <ContactActionButton
              icon={<MessageCircle className="w-5 h-5" />}
              label={t('action_whatsapp')}
              sublabel={provider.phone ? t('action_message_sublabel') : '—'}
              href={provider.phone ? `https://wa.me/${provider.phone.replace(/\D/g, '')}` : undefined}
              disabled={!provider.phone}
              external
            />
            <ContactActionButton
              icon={<Mail className="w-5 h-5" />}
              label={t('action_email')}
              sublabel={provider.email ? t('action_write_sublabel') : '—'}
              href={provider.email ? `mailto:${provider.email}` : undefined}
              disabled={!provider.email}
            />
          </div>
        </div>

        {/* ============== Tabs ==============
            Summary / Stats / History / Notes. Mirrors the products page
            pattern: a section-tabs bar driving a swipeable TabContainer.
            The tab is persisted in the URL so browser back/forward and
            tab reloads restore the user's position. */}
        <div className="section-tabs">
          {DETAIL_TAB_IDS.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={`section-tab ${activeTab === id ? 'section-tab-active' : ''}`}
            >
              {t(`tab_${id}`)}
            </button>
          ))}
        </div>

        <TabContainer
          activeTab={activeTab}
          onTabChange={id => handleTabChange(id as DetailTab)}
          swipeable
          fitActiveHeight
        >
          {/* ---- Summary ---- */}
          <TabContainer.Tab id="summary">
            {!hasOrders ? (
              <div className="card p-4">
                <p className="text-sm text-text-tertiary text-center py-6">
                  {t('order_history_empty')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 3-column stats row as the overview header */}
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

                <div className="card p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-text-tertiary" />
                    <h3 className="text-sm font-semibold text-text-primary">
                      {t('summary_recent_orders')}
                    </h3>
                  </div>
                  <hr className="border-border" />
                  <div>
                    {providerOrders.slice(0, 3).map(order => (
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
                </div>
              </div>
            )}
          </TabContainer.Tab>

          {/* ---- History ---- */}
          <TabContainer.Tab id="history">
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
          </TabContainer.Tab>

          {/* ---- Notes ---- */}
          <TabContainer.Tab id="notes">
            {provider.notes ? (
              <div className="card p-4">
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {provider.notes}
                </p>
              </div>
            ) : (
              <div className="card p-4">
                <p className="text-sm text-text-tertiary text-center py-6">
                  {t('notes_empty')}
                </p>
              </div>
            )}
          </TabContainer.Tab>
        </TabContainer>

      </main>

      {/* ============== Edit modal ==============
          Hosts the delete flow as extra morph steps (see ProviderModal).
          When the modal has finished closing after a successful delete we
          slide back to the providers list — deferring the navigation
          lets the delete-success animation play inside the modal first. */}
      <ProviderModal
        isOpen={isEditOpen}
        onClose={() => setEditOpen(false)}
        onExitComplete={() => {
          setProviderSaved(false)
          setEditError('')
          if (providerDeleted) {
            const href = `/${businessId}/providers`
            setSlideTargetPath(`/${businessId}/providers/${providerId}`)
            setSlideDirection('back')
            setPendingHref(href)
            router.push(href)
            setProviderDeleted(false)
          }
        }}
        name={name}
        onNameChange={setName}
        phone={phone}
        onPhoneChange={setPhone}
        email={email}
        onEmailChange={setEmail}
        active={active}
        onActiveChange={setActive}
        editingProvider={provider}
        isSaving={isSaving}
        error={editError}
        providerSaved={providerSaved}
        onSubmit={handleSaveEdit}
        canDelete={canManage}
        isDeleting={isDeleting}
        providerDeleted={providerDeleted}
        onDelete={handleDelete}
      />

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
            {displayStatus === 'received' ? (
              <CheckmarkIcon className={`w-5 h-5 ${colors.text}`} />
            ) : (
              <ClipboardIcon className={`w-5 h-5 ${colors.text}`} />
            )}
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

function formatMonthYear(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d)
}

interface ContactActionButtonProps {
  icon: ReactNode
  label: string
  sublabel: string
  href?: string
  disabled: boolean
  external?: boolean
}

function ContactActionButton({
  icon,
  label,
  sublabel,
  href,
  disabled,
  external,
}: ContactActionButtonProps) {
  const className =
    'flex flex-col items-center justify-center gap-0.5 py-3 px-2 rounded-xl bg-bg-muted text-center transition-colors'

  const body = (
    <>
      <span className="text-brand">{icon}</span>
      <span className="text-sm font-semibold text-text-primary mt-1">{label}</span>
      <span className="text-xs text-text-tertiary truncate max-w-full tabular-nums">
        {sublabel}
      </span>
    </>
  )

  if (disabled || !href) {
    return (
      <div className={`${className} opacity-50 cursor-not-allowed`} aria-disabled="true">
        {body}
      </div>
    )
  }

  return (
    <a
      href={href}
      className={`${className} hover:bg-brand-subtle`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {body}
    </a>
  )
}
