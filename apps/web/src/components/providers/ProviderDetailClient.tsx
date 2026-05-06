'use client'

import { useIntl } from 'react-intl';

import Image from '@/lib/Image'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from '@/lib/next-navigation-shim'
import type { ReactNode } from 'react'
import { IonRippleEffect } from '@ionic/react'
import { Plus, Phone, Mail, MessageCircle, Pencil, ChevronRight, Bell, ImagePlus, Trash2, CircleCheckBig } from 'lucide-react'
import { Spinner, SwipeableRow, TabContainer } from '@/components/ui'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import {
  ProviderModal,
  AddProviderNoteModal,
  EditProviderNoteModal,
  ReliabilityBar,
  getProviderInitials,
} from './'
import { OrderListItem } from '@/components/products'
import {
  computeProviderMetrics,
  computeTypicalItems,
  computeMonthlySpend,
} from '@/lib/provider-metrics'
import { useOrderFlows } from '@/hooks/useOrderFlows'
import { useOrders } from '@/contexts/orders-context'
import { useProviders } from '@/contexts/providers-context'
import { useProducts } from '@/contexts/products-context'
import { apiRequest, apiPost, apiPatch, apiDelete, ApiError } from '@/lib/api-client'
import { useApiMessage } from '@/hooks/useApiMessage'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useBusiness } from '@/contexts/business-context'
import { canManageBusiness } from '@kasero/shared/business-role'
import { formatRelative } from '@/lib/formatRelative'
import { getOrderDisplayStatus } from '@/lib/products'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { MAX_PROVIDER_NOTES } from '@kasero/shared/provider-notes'
import type { Provider, Product, ProviderNote } from '@kasero/shared/types'

interface ProviderDetailResponse {
  success?: boolean
  provider: Provider
  [key: string]: unknown
}

export interface ProviderDetailClientProps {
  businessId: string
  providerId: string
}

/**
 * The wrapping `IonHeader` + `IonBackButton` inside `ProviderDetailPage`
 * provides the title and back affordance for this view. The route
 * component hoists the provider lookup
 * (`useProviders().providers.find(...)`) so the `IonTitle` can render
 * the provider name even before this component finishes its detail
 * fetch. `useRouter()` is retained because it still drives the tab
 * URL state (`router.replace`) and the post-delete redirect
 * (`router.push`).
 */

type DetailTab = 'summary' | 'history' | 'notes'

const DETAIL_TAB_IDS: readonly DetailTab[] = ['summary', 'history', 'notes'] as const

function isDetailTab(value: string | null): value is DetailTab {
  return (DETAIL_TAB_IDS as readonly string[]).includes(value ?? '')
}

export function ProviderDetailClient({ businessId, providerId }: ProviderDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useIntl()
  const tOrders = useIntl()
  const { formatCurrencyCompact } = useBusinessFormat()
  // Relative time ("3 days ago") is LANGUAGE, not formatting — use user UI
  // locale, not business locale, so an English UI doesn't show "hace 3 días".
  const userLocale = t.locale
  const translateApiMessage = useApiMessage()
  const { role } = useBusiness()
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

  const [provider, setProvider] = useState<Provider | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [isEditOpen, setEditOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [providerDeleted, setProviderDeleted] = useState(false)
  const [isContactSheetOpen, setContactSheetOpen] = useState(false)

  // Edit modal form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [active, setActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [providerSaved, setProviderSaved] = useState(false)

  // Notes state — one add modal and one edit/delete modal. Draft state
  // (title + body) is shared between them since only one is ever open at
  // a time; `editingNoteId` is the discriminator that also surfaces the
  // existing note for the confirm-delete copy and the hasChanges gate.
  const [isAddNoteOpen, setAddNoteOpen] = useState(false)
  const [isEditNoteOpen, setEditNoteOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteInitialStep, setEditNoteInitialStep] = useState<0 | 1>(0)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [isDeletingNote, setIsDeletingNote] = useState(false)
  const [noteDeleted, setNoteDeleted] = useState(false)

  // Shared orders + providers + products stores. Orders whose providerId
  // changes elsewhere fall out of this page's derived list automatically;
  // the providers + products stores power the New Order / Order Detail
  // modal dropdowns and picker without any local fetch on this page.
  // Provider history shows every order ever placed with this provider, so
  // we load both buckets on mount. ensureXLoaded is idempotent — if either
  // bucket was already primed by the products page in this session, the
  // call is a no-op.
  const {
    orders: allOrders,
    setOrders,
    ensureActiveLoaded: ensureActiveOrdersLoaded,
    ensureCompletedLoaded: ensureCompletedOrdersLoaded,
  } = useOrders()
  const {
    providers: allProvidersAll,
    setProviders,
    ensureLoaded: ensureProvidersLoaded,
  } = useProviders()
  const { products, ensureLoaded: ensureProductsLoaded } = useProducts()
  const allProviders = useMemo(
    () => allProvidersAll.filter(p => p.active),
    [allProvidersAll],
  )
  const providerOrders = useMemo(
    () => allOrders.filter(o => o.providerId === providerId),
    [allOrders, providerId],
  )
  const metrics = useMemo(() => computeProviderMetrics(providerOrders), [providerOrders])

  // Count of orders currently in "overdue" display status — powers the
  // red banner at the top of the Summary tab.
  const overdueCount = useMemo(
    () => providerOrders.filter(o => getOrderDisplayStatus(o) === 'overdue').length,
    [providerOrders],
  )

  // ===== Wire up the shared order-flows hook =====
  const orderFlows = useOrderFlows({
    businessId,
    providers: allProviders,
    canDelete: canManage,
    canManage,
  })

  // ===== Load data =====
  // Only the provider detail is page-specific. Orders, providers list, and
  // products all come from shared contexts — we just ensure each is loaded
  // in parallel with the detail fetch.
  const loadAll = useCallback(async () => {
    try {
      setError('')
      const [detail] = await Promise.all([
        apiRequest<ProviderDetailResponse>(`/api/businesses/${businessId}/providers/${providerId}`),
        ensureActiveOrdersLoaded(),
        ensureCompletedOrdersLoaded(),
        ensureProvidersLoaded(),
        ensureProductsLoaded(),
      ])
      setProvider(detail.provider)
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t.formatMessage({
          id: 'providers.error_failed_to_load'
        })
      )
    } finally {
      setIsLoading(false)
    }
  }, [businessId, providerId, ensureActiveOrdersLoaded, ensureCompletedOrdersLoaded, ensureProvidersLoaded, ensureProductsLoaded, t, translateApiMessage])

  useEffect(() => { loadAll() }, [loadAll])

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
    if (!name.trim()) { setEditError(t.formatMessage({
      id: 'providers.error_name_required'
    })); return false }
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
          : t.formatMessage({
          id: 'providers.error_failed_to_save'
        })
      )
      return false
    } finally {
      setIsSaving(false)
    }
  }, [businessId, providerId, name, phone, email, active, setProviders, t, translateApiMessage])

  // ===== Notes =====
  // The list lives on `provider.notes` (seeded from the detail GET). Each
  // create/update/delete returns the full, already-sorted list so we can
  // replace it in one shot without re-sorting on the client.
  const notes = provider?.notes ?? []
  const notesCount = notes.length
  const atNotesLimit = notesCount >= MAX_PROVIDER_NOTES
  const editingNote = editingNoteId
    ? notes.find(n => n.id === editingNoteId) ?? null
    : null

  const applyNotesUpdate = useCallback((next: ProviderNote[]) => {
    setProvider(prev => (prev ? { ...prev, notes: next } : prev))
  }, [])

  const openAddNote = useCallback(() => {
    if (atNotesLimit) return
    setNoteTitle('')
    setNoteBody('')
    setNoteError('')
    setNoteSaved(false)
    setAddNoteOpen(true)
  }, [atNotesLimit])

  const openEditNote = useCallback((note: ProviderNote) => {
    setEditingNoteId(note.id)
    setNoteTitle(note.title)
    setNoteBody(note.body)
    setNoteError('')
    setNoteSaved(false)
    setNoteDeleted(false)
    setEditNoteInitialStep(0)
    setEditNoteOpen(true)
  }, [])

  const openDeleteNote = useCallback((note: ProviderNote) => {
    setEditingNoteId(note.id)
    setNoteTitle(note.title)
    setNoteBody(note.body)
    setNoteError('')
    setNoteSaved(false)
    setNoteDeleted(false)
    setEditNoteInitialStep(1)
    setEditNoteOpen(true)
  }, [])

  const handleAddNote = useCallback(async (): Promise<boolean> => {
    setIsSavingNote(true)
    setNoteError('')
    try {
      const result = await apiPost<{ success: true; notes: ProviderNote[] }>(
        `/api/businesses/${businessId}/providers/${providerId}/notes`,
        { title: noteTitle.trim(), body: noteBody.trim() },
      )
      applyNotesUpdate(result.notes)
      setNoteSaved(true)
      return true
    } catch (err) {
      setNoteError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t.formatMessage({
          id: 'providers.error_failed_to_save'
        })
      )
      return false
    } finally {
      setIsSavingNote(false)
    }
  }, [businessId, providerId, noteTitle, noteBody, applyNotesUpdate, t, translateApiMessage])

  const handleUpdateNote = useCallback(async (): Promise<boolean> => {
    if (!editingNoteId) return false
    setIsSavingNote(true)
    setNoteError('')
    try {
      const result = await apiPatch<{ success: true; notes: ProviderNote[] }>(
        `/api/businesses/${businessId}/providers/${providerId}/notes/${editingNoteId}`,
        { title: noteTitle.trim(), body: noteBody.trim() },
      )
      applyNotesUpdate(result.notes)
      setNoteSaved(true)
      return true
    } catch (err) {
      setNoteError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t.formatMessage({
          id: 'providers.error_failed_to_save'
        })
      )
      return false
    } finally {
      setIsSavingNote(false)
    }
  }, [businessId, providerId, editingNoteId, noteTitle, noteBody, applyNotesUpdate, t, translateApiMessage])

  const handleDeleteNote = useCallback(async (): Promise<boolean> => {
    if (!editingNoteId) return false
    setIsDeletingNote(true)
    setNoteError('')
    try {
      const result = await apiDelete<{ success: true; notes: ProviderNote[] }>(
        `/api/businesses/${businessId}/providers/${providerId}/notes/${editingNoteId}`,
      )
      applyNotesUpdate(result.notes)
      setNoteDeleted(true)
      return true
    } catch (err) {
      setNoteError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : t.formatMessage({
          id: 'providers.error_failed_to_delete'
        })
      )
      return false
    } finally {
      setIsDeletingNote(false)
    }
  }, [businessId, providerId, editingNoteId, applyNotesUpdate, t, translateApiMessage])

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
          : t.formatMessage({
          id: 'providers.error_failed_to_delete'
        })
      )
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [businessId, providerId, setOrders, setProviders, t, translateApiMessage])

  // ===== Typical items =====
  // Hide the whole section until the provider has at least 3 orders —
  // anything less and the "what you habitually buy" narrative is noise.
  const typicalItems = useMemo(
    () => (providerOrders.length < 3 ? [] : computeTypicalItems(providerOrders)),
    [providerOrders],
  )
  // Look up the current product for each typical item so we can render
  // its icon. Items keyed by productName (product was deleted) fall
  // through to the default placeholder chip.
  const productsById = useMemo(() => {
    const map = new Map<string, Product>()
    for (const p of products) map.set(p.id, p)
    return map
  }, [products])

  // ===== Monthly spend =====
  // Fixed 6-month window ending at the current month. Shown whenever the
  // provider has at least one order; months with no orders render as stubs.
  const monthlySpend = useMemo(() => computeMonthlySpend(providerOrders), [providerOrders])
  const monthlySpendMax = useMemo(
    () => monthlySpend.reduce((max, b) => Math.max(max, b.total), 0),
    [monthlySpend],
  )

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    );
  }

  if (error || !provider) {
    return (
      <main className="page-content">
        <div className="p-4 bg-error-subtle text-error rounded-lg">
          {error || t.formatMessage({
            id: 'providers.error_failed_to_load'
          })}
        </div>
      </main>
    );
  }

  const initials = getProviderInitials(provider.name)
  const hasOrders = providerOrders.length > 0

  const identityContent = (
    <>
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
            {provider.active ? t.formatMessage({
              id: 'providers.status_active'
            }) : t.formatMessage({
              id: 'providers.status_inactive'
            })}
          </span>
          {provider.createdAt && (
            <>
              <span className="text-text-tertiary flex-shrink-0">&#183;</span>
              <span className="text-text-tertiary truncate">
                {t.formatMessage({
                  id: 'providers.since_date'
                }, { date: formatMonthYear(provider.createdAt, userLocale) })}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      <main className="page-content space-y-4">
        {/* ============== Identity Header ==============
            Top row: avatar + name/status. Tappable for managers — opens
            the edit modal, mirroring the account-page profile card. For
            non-managers the same content renders as a static div.
            Below: the two primary actions (New order / Contact). */}
        <div className="space-y-4">
          {canManage ? (
            <button
              type="button"
              onClick={openEdit}
              aria-label={t.formatMessage({
                id: 'providers.edit_provider_aria'
              })}
              className="bg-bg-surface rounded-xl card-interactive w-full p-4 flex items-center gap-4 text-left ion-activatable ripple-parent"
            >
              {identityContent}
              <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              <IonRippleEffect />
            </button>
          ) : (
            <div className="flex items-center gap-4">
              {identityContent}
            </div>
          )}

          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => orderFlows.openNewOrder(providerId)}
                className="btn btn-primary flex-1 min-w-0"
              >
                <Plus />
                <span className="truncate">
                  {t.formatMessage({
                    id: 'providers.new_order_button'
                  })}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setContactSheetOpen(true)}
              disabled={!provider.phone && !provider.email}
              className="btn btn-primary flex-1 min-w-0"
            >
              <Phone />
              <span className="truncate">{t.formatMessage({
                id: 'providers.contact_button'
              })}</span>
            </button>
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
              {t.formatMessage({
                id: `providers.tab_${id}`
              })}
            </button>
          ))}
        </div>

        <TabContainer
          activeTab={activeTab}
          onTabChange={id => handleTabChange(id as DetailTab)}
          swipeable
          fitActiveHeight
          preserveScrollOnChange
        >
          {/* ---- Summary ----
              Cards always render — on a brand-new provider, each card
              tells its own empty-state story (stats at zero, reliability
              as "not enough data", typical items promising what will
              appear). The overdue banner is the only card that stays
              conditional (only shown when orders are actually overdue). */}
          <TabContainer.Tab id="summary">
              <div className="space-y-4">
                {/* Overdue orders banner — jumps the user to the History
                    tab so they can see which orders need attention. */}
                {overdueCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('history')}
                    className="card banner-semantic banner-semantic--error w-full p-4 flex items-center gap-3 text-left ion-activatable ripple-parent"
                  >
                    {/* Icon chip — uses color-mix on the error token so it
                        reads as a darker red against the error-subtle
                        banner (Tailwind's /alpha modifiers don't work on
                        the app's plain var(...) color tokens). */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor:
                          'color-mix(in oklab, var(--color-error) 22%, transparent)',
                      }}
                    >
                      <Bell className="w-5 h-5 text-error" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-error">
                        {t.formatMessage({
                          id: 'providers.overdue_banner_title'
                        }, { count: overdueCount })}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {t.formatMessage({
                          id: 'providers.overdue_banner_subtitle'
                        })}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                    <IonRippleEffect />
                  </button>
                )}

                {/* Stats — two side-by-side cards. Both are left-aligned
                    with the same vertical rhythm: label at top, big
                    primary value, subtext at the bottom. The right
                    card's horizontal bar sits between the percentage
                    and the breakdown as a visual reinforcement. */}
                <div className="grid grid-cols-2 gap-3 items-stretch">
                  {/* ---- GASTO TOTAL / Total Spent ---- */}
                  <div className="card p-4 flex flex-col gap-1">
                    <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      {t.formatMessage({
                        id: 'providers.stat_total_spent'
                      })}
                    </div>
                    <div className="text-xl font-semibold text-text-primary tabular-nums mt-1">
                      {formatCurrencyCompact(metrics.totalSpent)}
                    </div>
                    <div className="text-xs text-text-tertiary tabular-nums mt-auto pt-2">
                      {metrics.orderCount === 0
                        ? t.formatMessage({
                        id: 'providers.stat_never_ordered'
                      })
                        : metrics.cadenceDays != null
                          ? t.formatMessage({
                        id: 'providers.stat_total_spent_subtext_with_cadence'
                      }, {
                              count: metrics.orderCount,
                              days: metrics.cadenceDays,
                            })
                          : t.formatMessage({
                        id: 'providers.stat_total_spent_subtext_orders_only'
                      }, {
                              count: metrics.orderCount,
                            })}
                    </div>
                  </div>

                  {/* ---- CUMPLIMIENTO / Reliability ----
                      Label → big percent → horizontal bar → breakdown
                      at the bottom (with optional window scope). The
                      "last N" tail is only appended when we're showing
                      a subset of the provider's orders — otherwise the
                      breakdown denominator already communicates sample
                      size. */}
                  <div className="card p-4 flex flex-col gap-1">
                    <div className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      {t.formatMessage({
                        id: 'providers.stat_reliability_label'
                      })}
                    </div>
                    {metrics.reliability ? (
                      <>
                        <div className="text-xl font-semibold text-text-primary tabular-nums mt-1">
                          {metrics.reliability.percent}%
                        </div>
                        <div className="mt-1">
                          <ReliabilityBar
                            percent={metrics.reliability.percent}
                            ariaLabel={t.formatMessage({
                              id: 'providers.stat_reliability_label'
                            }) + ': ' + metrics.reliability.percent + '%'}
                          />
                        </div>
                        <div className="text-xs text-text-tertiary tabular-nums mt-auto pt-2">
                          {t.formatMessage({
                            id: 'providers.stat_reliability_breakdown'
                          }, {
                            onTime: metrics.reliability.onTime,
                            total: metrics.reliability.resolved,
                          })}
                          {metrics.reliability.windowSize < metrics.orderCount && (
                            <>
                              {' · '}
                              {t.formatMessage({
                                id: 'providers.stat_reliability_window'
                              }, {
                                count: metrics.reliability.windowSize,
                              })}
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-text-tertiary mt-1">
                        {t.formatMessage({
                          id: 'providers.stat_reliability_insufficient'
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card p-4 space-y-4">
                  <div className="text-sm text-text-secondary">
                    {t.formatMessage({
                      id: 'providers.typical_items_title'
                    })}
                  </div>
                  <hr className="border-border" />
                  {typicalItems.length > 0 ? (
                    <div className="space-y-3">
                      {typicalItems.map(item => {
                        const product = productsById.get(item.key)
                        const iconUrl = product ? getProductIconUrl(product) : null
                        return (
                          <div key={item.key} className="flex items-center gap-3">
                            <div className="product-list-image">
                              {iconUrl && isPresetIcon(iconUrl) ? (
                                (() => {
                                  const p = getPresetIcon(iconUrl)
                                  return p ? <p.icon size={24} className="text-text-primary" /> : null
                                })()
                              ) : iconUrl ? (
                                <Image
                                  src={iconUrl}
                                  alt={item.name}
                                  width={48}
                                  height={48}
                                  className="product-list-image-img"
                                  unoptimized
                                />
                              ) : (
                                <ImagePlus className="w-5 h-5 text-text-tertiary" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-text-primary truncate">
                                {item.name}
                              </div>
                              <div className="text-xs text-text-tertiary mt-0.5 tabular-nums">
                                {t.formatMessage({
                                  id: 'providers.typical_items_subtitle'
                                }, {
                                  units: item.totalUnits,
                                  date: formatRelative(item.lastOrderedAt, userLocale),
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-text-tertiary text-center py-2">
                      {t.formatMessage({
                        id: 'providers.typical_items_empty'
                      })}
                    </p>
                  )}
                </div>

                {/* ---- Monthly spend ----
                    Fixed 6-month window ending at the current month. Bars
                    scale relative to the tallest in the window; empty
                    months render as thin stubs so the time axis stays
                    consistent. The current-month bar uses the brand
                    color; past months are muted. */}
                <div className="card p-4 space-y-4">
                  <div className="text-sm text-text-secondary">
                    {t.formatMessage({
                      id: 'providers.monthly_spend_title'
                    })}
                  </div>
                  <hr className="border-border" />
                  <div className="flex items-stretch gap-2 h-36">
                    {monthlySpend.map(bucket => {
                      const heightPct =
                        monthlySpendMax > 0 && bucket.total > 0
                          ? Math.max(6, (bucket.total / monthlySpendMax) * 100)
                          : 0
                      const monthLabel = new Intl.DateTimeFormat(userLocale, {
                        month: 'short',
                      }).format(bucket.start)
                      const valueLabel = formatCurrencyCompact(bucket.total)
                      return (
                        <div
                          key={bucket.start.toISOString()}
                          className="flex-1 flex flex-col items-center min-w-0"
                        >
                          <span
                            className={`text-xs tabular-nums truncate ${
                              bucket.isCurrent ? 'text-brand font-semibold' : 'text-text-tertiary'
                            }`}
                          >
                            {valueLabel}
                          </span>
                          <div className="flex-1 w-full flex items-end py-1">
                            {bucket.total > 0 ? (
                              <div
                                className={`w-full rounded-lg ${
                                  bucket.isCurrent ? 'bg-brand' : 'bg-bg-muted'
                                }`}
                                style={{ height: `${heightPct}%` }}
                              />
                            ) : (
                              <div className="w-full h-[3px] rounded-full bg-bg-muted opacity-60" />
                            )}
                          </div>
                          <span
                            className={`text-xs mt-1 truncate ${
                              bucket.isCurrent ? 'text-brand font-semibold' : 'text-text-tertiary'
                            }`}
                          >
                            {monthLabel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
          </TabContainer.Tab>

          {/* ---- History ----
              Same card pattern and list item styles as the products
              page's Orders tab, scoped to this provider. The "Ordered
              to:" metadata row is suppressed because the whole page is
              already about one provider — the row would be redundant. */}
          <TabContainer.Tab id="history">
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{t.formatMessage({
                  id: 'providers.order_history_title'
                })}</span>
                {hasOrders && (
                  <div className="text-text-tertiary">
                    {tOrders.formatMessage({
                      id: 'orders.order_count'
                    }, { count: providerOrders.length })}
                    <span className="mx-1.5">&#183;</span>
                    {formatCurrencyCompact(metrics.totalSpent)}
                  </div>
                )}
              </div>

              <hr className="border-border" />

              {!hasOrders ? (
                <p className="text-sm text-text-tertiary text-center py-6">
                  {t.formatMessage({
                    id: 'providers.order_history_empty'
                  })}
                </p>
              ) : (
                <div className="list-divided">
                  {providerOrders.map((order, i) => {
                    const alreadyReceived = getOrderDisplayStatus(order) === 'received'
                    // Same semantic ordering as the Products page Orders tab.
                    // Receive is available to any active member; Edit + Delete
                    // are manager-only.
                    const swipeActions = [
                      {
                        icon: <CircleCheckBig size={20} />,
                        label: tOrders.formatMessage({
                          id: 'orders.action_receive'
                        }),
                        variant: 'info' as const,
                        disabled: alreadyReceived,
                        onClick: () => orderFlows.openOrderDetail(order, 'receive'),
                      },
                      ...(canManage ? [
                        {
                          icon: <Pencil size={20} />,
                          label: tOrders.formatMessage({
                            id: 'orders.action_edit'
                          }),
                          variant: 'neutral' as const,
                          // Received orders are locked — no edits once stock posted.
                          disabled: alreadyReceived,
                          onClick: () => orderFlows.openOrderDetail(order, 'edit'),
                        },
                        {
                          icon: <Trash2 size={20} />,
                          label: tOrders.formatMessage({
                            id: 'orders.action_delete'
                          }),
                          variant: 'danger' as const,
                          // Received orders can't be deleted either — would
                          // require rolling back the stock changes they posted.
                          disabled: alreadyReceived,
                          onClick: () => orderFlows.openOrderDetail(order, 'delete'),
                        },
                      ] : []),
                    ]
                    return (
                      <Fragment key={order.id}>
                        {i > 0 && <hr className="list-divider" />}
                        <SwipeableRow actions={swipeActions}>
                          <OrderListItem
                            order={order}
                            onView={() => orderFlows.openOrderDetail(order)}
                            hideProviderRow
                          />
                        </SwipeableRow>
                      </Fragment>
                    )
                  })}
                </div>
              )}
            </div>
          </TabContainer.Tab>

          {/* ---- Notes ----
              Three-row card:
                1. Header: "Notes" title + written/edited date (if any)
                2. Content: the note text, or a muted "No notes yet" line
                3. Actions: right-aligned compact Add/Edit button
              The same shell is used for both empty and populated states
              so the card's dimensions don't jump when a note is first
              added. Actions are hidden entirely for non-managers. */}
          <TabContainer.Tab id="notes">
            <div className="card p-4 space-y-4">
              {/* Header row — label on the left, X/5 count on the right.
                  Mirrors the other Summary cards' header pattern. */}
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-text-secondary">
                  {t.formatMessage({
                    id: 'providers.notes_card_header'
                  })}
                </span>
                <span className="text-text-tertiary tabular-nums flex-shrink-0">
                  {t.formatMessage({
                    id: 'providers.notes_count_label'
                  }, {
                    count: notesCount,
                    max: MAX_PROVIDER_NOTES,
                  })}
                </span>
              </div>

              <hr className="border-border" />

              {/* List of notes, or the empty-state line when none exist.
                  Matches the app's list-divided pattern: no border or
                  background on individual notes, separated by hairline
                  dividers. Title + action icons on top, "Edited X ago"
                  subtitle, body below — no hairline between header and
                  body, just spacing. */}
              {notesCount === 0 ? (
                <p className="text-sm text-text-tertiary italic">
                  {t.formatMessage({
                    id: 'providers.notes_empty'
                  })}
                </p>
              ) : (
                <div className="list-divided">
                  {notes.map((note, i) => (
                    <Fragment key={note.id}>
                      {i > 0 && <hr className="list-divider" />}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-text-primary truncate">
                              {note.title}
                            </div>
                            <div className="text-xs text-text-tertiary mt-0.5">
                              {t.formatMessage({
                                id: 'providers.note_edited_on'
                              }, {
                                date: formatRelative(note.updatedAt, userLocale),
                              })}
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditNote(note)}
                                className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                                aria-label={t.formatMessage({
                                  id: 'providers.note_edit_aria'
                                })}
                              >
                                <Pencil style={{ width: 16, height: 16 }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteNote(note)}
                                className="p-1 text-error hover:text-error transition-colors"
                                aria-label={t.formatMessage({
                                  id: 'providers.note_delete_aria'
                                })}
                              >
                                <Trash2 style={{ width: 16, height: 16 }} />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary whitespace-pre-wrap">
                          {note.body}
                        </p>
                      </div>
                    </Fragment>
                  ))}
                </div>
              )}

              {/* Bottom-right "+ Add note" button. Disabled when the
                  per-provider cap is reached; server still enforces. */}
              {canManage && (
                <>
                  <hr className="border-border" />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={openAddNote}
                      disabled={atNotesLimit}
                      className="btn btn-secondary"
                      style={{
                        fontSize: 'var(--text-sm)',
                        padding: 'var(--space-2) var(--space-4)',
                        minHeight: 'unset',
                        gap: 'var(--space-2)',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      <Plus style={{ width: 14, height: 14 }} />
                      {t.formatMessage({
                        id: 'providers.add_note_button'
                      })}
                    </button>
                  </div>
                </>
              )}
            </div>
          </TabContainer.Tab>
        </TabContainer>

      </main>
      {/* ============== Edit modal ==============
          Hosts the delete flow as extra modal steps (see ProviderModal).
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
            router.push(`/${businessId}/providers`)
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
      {/* ============== Add note modal ============== */}
      <AddProviderNoteModal
        isOpen={isAddNoteOpen}
        onClose={() => setAddNoteOpen(false)}
        onExitComplete={() => {
          setNoteTitle('')
          setNoteBody('')
          setNoteSaved(false)
          setNoteError('')
        }}
        title={noteTitle}
        onTitleChange={setNoteTitle}
        body={noteBody}
        onBodyChange={setNoteBody}
        isSaving={isSavingNote}
        noteSaved={noteSaved}
        error={noteError}
        onSubmit={handleAddNote}
      />
      {/* ============== Edit / delete note modal ==============
          Opens at step 0 from the edit pencil and step 1 (delete confirm)
          from the trash icon. Delete-success plays as step 2, save-success
          as step 3 — same shape as ProviderModal. */}
      <EditProviderNoteModal
        isOpen={isEditNoteOpen}
        onClose={() => setEditNoteOpen(false)}
        onExitComplete={() => {
          setEditingNoteId(null)
          setNoteTitle('')
          setNoteBody('')
          setNoteSaved(false)
          setNoteDeleted(false)
          setNoteError('')
          setEditNoteInitialStep(0)
        }}
        initialStep={editNoteInitialStep}
        editingNote={editingNote}
        title={noteTitle}
        onTitleChange={setNoteTitle}
        body={noteBody}
        onBodyChange={setNoteBody}
        isSaving={isSavingNote}
        noteSaved={noteSaved}
        error={noteError}
        onSubmit={handleUpdateNote}
        isDeleting={isDeletingNote}
        noteDeleted={noteDeleted}
        onDelete={handleDeleteNote}
      />
      {/* ============== Contact sheet ==============
          Tapping a row fires the native handler (tel:, mailto:, wa.me) and
          closes the sheet so returning to the app doesn't land back inside
          an open overlay. Rows for missing contact fields are omitted. */}
      <BottomSheet
        isOpen={isContactSheetOpen}
        onClose={() => setContactSheetOpen(false)}
        title={t.formatMessage({
          id: 'providers.contact_sheet_title'
        }, { name: provider.name })}
      >
        <div className="py-2">
          {provider.phone && (
            <ContactSheetRow
              icon={<Phone className="w-5 h-5" />}
              iconColorClass="text-warning"
              label={t.formatMessage({
                id: 'providers.action_call'
              })}
              value={provider.phone}
              href={`tel:${provider.phone}`}
              onAction={() => setContactSheetOpen(false)}
            />
          )}
          {provider.phone && (
            <ContactSheetRow
              icon={<MessageCircle className="w-5 h-5" />}
              iconColorClass="text-success"
              label={t.formatMessage({
                id: 'providers.action_whatsapp'
              })}
              value={provider.phone}
              href={`https://wa.me/${provider.phone.replace(/\D/g, '')}`}
              external
              onAction={() => setContactSheetOpen(false)}
            />
          )}
          {provider.email && (
            <ContactSheetRow
              icon={<Mail className="w-5 h-5" />}
              iconColorClass="text-text-primary"
              label={t.formatMessage({
                id: 'providers.action_email'
              })}
              value={provider.email}
              href={`mailto:${provider.email}`}
              onAction={() => setContactSheetOpen(false)}
            />
          )}
        </div>
      </BottomSheet>
      {/* ============== Order flows (new order + order detail/edit/receive/delete) ============== */}
      {orderFlows.modals}
    </>
  );
}

function formatMonthYear(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(d)
}

interface ContactSheetRowProps {
  icon: ReactNode
  iconColorClass: string
  label: string
  value: string
  href: string
  external?: boolean
  onAction: () => void
}

function ContactSheetRow({
  icon,
  iconColorClass,
  label,
  value,
  href,
  external,
  onAction,
}: ContactSheetRowProps) {
  // Mirrors `.user-menu-item`: same padding, gap, text color, and hover
  // behavior as the user avatar menu. The colored-icon span sits where
  // the menu icon would — `.user-menu-item svg` forces a secondary color,
  // so we avoid the class and style the wrapper directly. ChevronRight
  // on the trailing edge matches the menu's right-pointing arrow.
  return (
    <a
      href={href}
      onClick={onAction}
      className="flex items-center gap-3 px-4 py-3 text-text-primary no-underline transition-colors hover:bg-bg-muted hover:no-underline active:bg-bg-muted"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span className={`flex-shrink-0 ${iconColorClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-base text-text-primary">{label}</div>
        <div className="text-xs text-text-tertiary truncate">{value}</div>
      </div>
      <ChevronRight size={16} className="text-text-tertiary flex-shrink-0" />
    </a>
  )
}
