'use client'

import { useIntl } from 'react-intl'
import { useRouter } from '@/lib/next-navigation-shim'
import { Plus } from 'lucide-react'
import {
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
} from '@ionic/react'
import { useProviderManagement } from '@/hooks'
import { useOrderFlows } from '@/hooks/useOrderFlows'
import { useOrders } from '@/contexts/orders-context'
import { ProviderListItem, ProviderModal } from '@/components/providers'
import { PageSpinner } from '@/components/ui'

interface ProvidersDrilldownProps {
  businessId: string
}

/**
 * Suppliers roster — Modern Mercantile (unified).
 *
 * The page reads like a printed roster slip and reuses the team page's
 * primitives wholesale (.tm-roster, .pm-hero__*, .tm-roster__row,
 * .tm-roster__avatar, .tm-roster__row-meta, .report-card). The only
 * provider-specific addition is the IonItemSliding shell that gives
 * each row an edit / delete / new-order swipe tray.
 *
 *   - Hero band: tracked "SUPPLIERS · N PARTNERS" eyebrow → Fraunces
 *     italic "Your suppliers" / "The suppliers" → italic subtitle. A
 *     terracotta Add pill anchors the right side for managers.
 *   - Roster card: single .report-card frame with one row per supplier.
 *     Active providers stay full opacity; paused providers dim to match
 *     the disabled-member treatment on the team page.
 *   - Empty state: a quiet italic line nudging the manager toward the
 *     Add pill instead of a separate empty card.
 *
 * Data flow is unchanged — every field comes from
 * `useProviderManagement({ businessId, setOrders })`. The wrapping
 * `IonHeader` + `IonBackButton` + `IonContent` are provided by
 * `ProvidersTab`; this component renders the body only.
 */
export function ProvidersDrilldown({ businessId }: ProvidersDrilldownProps) {
  const router = useRouter()
  const t = useIntl()

  const { setOrders } = useOrders()

  const {
    providers,
    sortedProviders,
    isLoading,
    error,
    canManage,
    isModalOpen,
    modalInitialStep,
    editingProvider,
    isSaving,
    providerSaved,
    isDeleting,
    providerDeleted,
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    active,
    setActive,
    handleOpenModal,
    handleOpenDelete,
    handleCloseModal,
    handleModalExitComplete,
    handleSubmit,
    handleDelete,
  } = useProviderManagement({ businessId, setOrders })

  const orderFlows = useOrderFlows({
    businessId,
    providers,
    canDelete: canManage,
    canManage,
  })

  // Pick the manager / employee variant of the hero copy. Managers see
  // "Your suppliers"; employees see "The suppliers" — same tone, different
  // ownership framing. Mirrors the team page's title selection.
  const titleId = canManage
    ? 'providers.roster_title_manager'
    : 'providers.roster_title_employee'
  const subtitleId = canManage
    ? 'providers.roster_subtitle_manager'
    : 'providers.roster_subtitle_employee'

  // Manager + zero providers: nudge toward the Add pill instead of an
  // empty card. Employees with zero providers see a quieter italic line.
  const showSoloEmptyState = canManage && providers.length === 0

  // Early-return the spinner so modals mount only after the page is in
  // its loaded state — same pattern as TeamDrilldown / ProductsView.
  if (isLoading) {
    return <PageSpinner />
  }

  return (
    <>
      <div className="tm-roster">
        {/* Hero band */}
        <header className="tm-roster__hero">
          <div className="tm-roster__hero-text">
            <span className="pm-hero__eyebrow">
              {t.formatMessage(
                { id: 'providers.roster_eyebrow' },
                { count: providers.length },
              )}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: titleId },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="pm-hero__subtitle">
              {t.formatMessage({ id: subtitleId })}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="tm-roster__invite-pill"
              onClick={() => handleOpenModal()}
              aria-label={t.formatMessage({ id: 'providers.add_aria' })}
            >
              <Plus aria-hidden="true" />
              {t.formatMessage({ id: 'providers.add_button' })}
            </button>
          )}
        </header>

        {error && !isModalOpen && (
          <div className="tm-roster__error" role="alert">
            <span className="tm-roster__error-eyebrow">
              {t.formatMessage({ id: 'providers.roster_error_eyebrow' })}
            </span>
            <span>{error}</span>
          </div>
        )}

        {/* Solo-empty state — manager only, only when there's nothing else
            to show. Employees with zero providers see no card and no hint;
            the empty page is quiet by design. */}
        {showSoloEmptyState && (
          <p className="tm-roster__solo-hint">
            {t.formatMessage(
              { id: 'providers.roster_solo_hint' },
              { em: (chunks) => <em>{chunks}</em> },
            )}
          </p>
        )}

        {/* Roster card — every provider, active first then paused, all in
            one .report-card frame. Paused rows render dimmed via the row
            primitive. */}
        {sortedProviders.length > 0 && (
          <section className="report-card">
            <div className="report-card__header">
              <span className="report-card__eyebrow">
                {t.formatMessage({ id: 'providers.roster_card_eyebrow' })}
              </span>
              <h2 className="report-card__title">
                {t.formatMessage({ id: 'providers.roster_card_title' })}
              </h2>
            </div>
            {sortedProviders.map((provider) => {
              const swipeActions = canManage
                ? [
                    {
                      label: t.formatMessage({ id: 'providers.action_new_order' }),
                      color: 'primary' as const,
                      onClick: () => orderFlows.openNewOrder(provider.id),
                    },
                    {
                      label: t.formatMessage({ id: 'providers.action_edit' }),
                      color: 'medium' as const,
                      onClick: () => handleOpenModal(provider),
                    },
                    {
                      label: t.formatMessage({ id: 'providers.action_delete' }),
                      color: 'danger' as const,
                      onClick: () => handleOpenDelete(provider),
                    },
                  ]
                : []
              return (
                <IonItemSliding key={provider.id}>
                  <IonItem
                    button
                    detail={false}
                    lines="none"
                    className="tm-roster__row-shell"
                    onClick={() =>
                      router.push(`/${businessId}/providers/${provider.id}`)
                    }
                  >
                    <ProviderListItem provider={provider} />
                  </IonItem>
                  {swipeActions.length > 0 && (
                    <IonItemOptions side="end">
                      {swipeActions.map((action) => (
                        <IonItemOption
                          key={action.label}
                          color={action.color}
                          onClick={action.onClick}
                        >
                          {action.label}
                        </IonItemOption>
                      ))}
                    </IonItemOptions>
                  )}
                </IonItemSliding>
              )
            })}
          </section>
        )}
      </div>

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
      {orderFlows.modals}
    </>
  )
}
