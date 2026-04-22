'use client'

import { Fragment } from 'react'
import { Plus, Handshake, ShoppingCart, Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Spinner, SwipeableRow } from '@/components/ui'
import { useProviderManagement } from '@/hooks'
import { useOrderFlows } from '@/hooks/useOrderFlows'
import { useBusiness } from '@/contexts/business-context'
import { useOrders } from '@/contexts/orders-context'
import { ProviderListItem, ProviderModal } from '@/components/providers'
import { useTranslations } from 'next-intl'
import { usePageTransition } from '@/contexts/page-transition-context'

export default function ProveedoresPage() {
  const { businessId } = useBusiness()
  const router = useRouter()
  const { setPendingHref, setSlideDirection, setSlideTargetPath } = usePageTransition()
  const t = useTranslations('providers')

  const { setOrders } = useOrders()

  const {
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
  } = useProviderManagement({ businessId: businessId || '', setOrders })

  // New-order flow lives in-place on this page so the swipe action can open
  // the modal with the provider pre-selected instead of bouncing to the
  // Products page. We only use the new-order path of useOrderFlows here —
  // the detail modal is rendered but dormant (viewingOrder stays null).
  const orderFlows = useOrderFlows({
    businessId: businessId || '',
    providers,
    setOrders,
    canDelete: canManage,
  })

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-6">
        {error && !isModalOpen && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

          {/* Providers Card - only show when providers exist */}
          {providers.length > 0 && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {t('count', { count: providers.length })}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal()}
                    className="btn btn-primary"
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', minHeight: 'unset', gap: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    {t('add_button')}
                  </button>
                )}
              </div>

              <hr className="border-border" />

              <div className="list-divided">
                {sortedProviders.map((provider, i) => {
                  // Semantic ordering mirrors products/orders for muscle memory:
                  //   primary (new order)  →  secondary (edit)  →  remove (delete)
                  const swipeActions = canManage
                    ? [
                        {
                          icon: <ShoppingCart size={20} />,
                          label: t('action_new_order'),
                          variant: 'info' as const,
                          // Open the new-order modal in-place with this
                          // provider pre-selected — no page navigation.
                          onClick: () => orderFlows.openNewOrder(provider.id),
                        },
                        {
                          icon: <Pencil size={20} />,
                          label: t('action_edit'),
                          variant: 'neutral' as const,
                          onClick: () => handleOpenModal(provider),
                        },
                        {
                          icon: <Trash2 size={20} />,
                          label: t('action_delete'),
                          variant: 'danger' as const,
                          onClick: () => handleOpenDelete(provider),
                        },
                      ]
                    : []
                  return (
                    <Fragment key={provider.id}>
                      {i > 0 && <hr className="list-divider" />}
                      {swipeActions.length > 0 ? (
                        <SwipeableRow actions={swipeActions}>
                          <ProviderListItem
                            provider={provider}
                            onClick={() => {
                              const href = `/${businessId}/providers/${provider.id}`
                              setSlideTargetPath(href)
                              setSlideDirection('forward')
                              setPendingHref(href)
                              router.push(href)
                            }}
                          />
                        </SwipeableRow>
                      ) : (
                        <ProviderListItem
                          provider={provider}
                          onClick={() => {
                            const href = `/${businessId}/providers/${provider.id}`
                            setSlideTargetPath(href)
                            setSlideDirection('forward')
                            setPendingHref(href)
                            router.push(href)
                          }}
                        />
                      )}
                    </Fragment>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state - no providers at all */}
          {providers.length === 0 && (
            <div className="empty-state-fill">
              <Handshake className="empty-state-icon" />
              <h3 className="empty-state-title">{t('empty_title')}</h3>
              <p className="empty-state-description">
                {t('empty_description')}
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="btn btn-primary mt-4"
                  style={{ fontSize: 'var(--text-sm)', padding: '10px var(--space-5)', minHeight: 'unset', gap: 'var(--space-2)' }}
                >
                  <Plus className="w-4 h-4" />
                  {t('add_provider_button')}
                </button>
              )}
            </div>
          )}
      </main>

      {/* Provider Modal — used for Add, Edit (via swipe), and Delete confirm
          (via swipe). All three flows share the same modal, initialStep
          selects the entry point. */}
      <ProviderModal
        isOpen={isModalOpen}
        initialStep={modalInitialStep}
        onClose={handleCloseModal}
        onExitComplete={handleModalExitComplete}
        name={name}
        onNameChange={setName}
        phone={phone}
        onPhoneChange={setPhone}
        email={email}
        onEmailChange={setEmail}
        active={active}
        onActiveChange={setActive}
        editingProvider={editingProvider}
        isSaving={isSaving}
        error={error}
        providerSaved={providerSaved}
        onSubmit={handleSubmit}
        canDelete={canManage}
        isDeleting={isDeleting}
        providerDeleted={providerDeleted}
        onDelete={handleDelete}
      />

      {/* New-order + Order-detail modals for the swipe-tray new-order flow.
          Only the new-order path is actually triggered from this page. */}
      {orderFlows.modals}
    </>
  )
}
