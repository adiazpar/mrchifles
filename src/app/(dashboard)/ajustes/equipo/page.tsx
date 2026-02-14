'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Badge, Spinner } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { useAuth } from '@/contexts/auth-context'
import {
  generateInviteCode,
  getInviteCodeExpiration,
  getRoleLabel,
  getInviteRoleLabel,
  getUserInitials,
  isOwner,
} from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import type { User, InviteCode, InviteRole } from '@/types'

// Add icon component
function AddIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8V11H16C16.5523 11 17 11.4477 17 12C17 12.5523 16.5523 13 16 13H13V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V13H8C7.44771 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11H11V8Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12ZM3.00683 12C3.00683 16.9668 7.03321 20.9932 12 20.9932C16.9668 20.9932 20.9932 16.9668 20.9932 12C20.9932 7.03321 16.9668 3.00683 12 3.00683C7.03321 3.00683 3.00683 7.03321 3.00683 12Z"
        fill="currentColor"
      />
    </svg>
  )
}

// Modal component using global CSS styles
function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-bg-muted rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeamPage() {
  const { user, pb } = useAuth()

  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedRole, setSelectedRole] = useState<InviteRole>('employee')
  const [newCode, setNewCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check if current user is owner
  const canManageTeam = isOwner(user)

  // Load team members and invite codes
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        // Load all users (disable auto-cancellation to avoid StrictMode issues)
        const users = await pb.collection('users').getFullList<User>({
          sort: '-created',
          requestKey: null,
        })
        if (cancelled) return
        setTeamMembers(users)

        // Load active invite codes (owner only)
        if (canManageTeam) {
          const codes = await pb.collection('invite_codes').getFullList<InviteCode>({
            filter: 'used = false && expiresAt > @now',
            sort: '-created',
            expand: 'createdBy',
            requestKey: null,
          })
          if (cancelled) return
          setInviteCodes(codes)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error loading team data:', err)
        setError('Error al cargar los datos del equipo')
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
  }, [pb, canManageTeam])

  const handleGenerateCode = useCallback(async () => {
    if (!user) return

    setIsGenerating(true)
    setError('')
    setNewCode(null)

    try {
      const code = generateInviteCode()
      const expiresAt = getInviteCodeExpiration()

      await pb.collection('invite_codes').create({
        code,
        role: selectedRole,
        createdBy: user.id,
        expiresAt: expiresAt.toISOString(),
        used: false,
      })

      setNewCode(code)

      // Refresh invite codes list
      const codes = await pb.collection('invite_codes').getFullList<InviteCode>({
        filter: 'used = false && expiresAt > @now',
        sort: '-created',
      })
      setInviteCodes(codes)
    } catch (err) {
      console.error('Error generating invite code:', err)
      setError('Error al generar el codigo')
    } finally {
      setIsGenerating(false)
    }
  }, [user, selectedRole, pb])

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      // Could show a toast here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  const handleDeleteCode = useCallback(async (codeId: string) => {
    try {
      await pb.collection('invite_codes').delete(codeId)
      setInviteCodes(prev => prev.filter(c => c.id !== codeId))
    } catch (err) {
      console.error('Error deleting code:', err)
    }
  }, [pb])

  const handleToggleUserStatus = useCallback(async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active'
    try {
      await pb.collection('users').update(userId, { status: newStatus })
      setTeamMembers(prev =>
        prev.map(m => m.id === userId ? { ...m, status: newStatus as User['status'] } : m)
      )
    } catch (err) {
      console.error('Error updating user status:', err)
    }
  }, [pb])

  const handleOpenModal = useCallback(() => {
    setNewCode(null)
    setSelectedRole('employee')
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setNewCode(null)
  }, [])

  if (isLoading) {
    return (
      <>
        <PageHeader title="Equipo" />
        <main className="main-content">
          <div className="flex justify-center py-12">
            <Spinner className="spinner-lg" />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Equipo" subtitle="Gestiona tu equipo de trabajo" />

      <main className="main-content space-y-6">
        {error && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}

        {/* Team Members Card */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">
              Miembros del equipo ({teamMembers.length})
            </h3>
            {canManageTeam && (
              <button
                type="button"
                onClick={handleOpenModal}
                className="btn btn-secondary btn-sm p-2"
                aria-label="Agregar miembro"
              >
                <AddIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {teamMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-muted transition-colors"
              >
                <div className="sidebar-user-avatar">
                  {getUserInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{member.name}</span>
                    {member.id === user?.id && (
                      <span className="text-xs text-text-tertiary">(Tu)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={member.role === 'owner' ? 'brand' : 'default'}
                    >
                      {getRoleLabel(member.role)}
                    </Badge>
                    <Badge
                      variant={member.status === 'active' ? 'success' : 'error'}
                    >
                      {member.status === 'active' ? 'Activo' : 'Deshabilitado'}
                    </Badge>
                  </div>
                </div>

                {/* Actions (Owner only, can't disable self) */}
                {canManageTeam && member.id !== user?.id && member.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => handleToggleUserStatus(member.id, member.status)}
                    className={`btn btn-sm ${
                      member.status === 'active' ? 'btn-ghost text-error' : 'btn-secondary'
                    }`}
                  >
                    {member.status === 'active' ? 'Deshabilitar' : 'Habilitar'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Active Invite Codes Section (within the card) */}
          {canManageTeam && inviteCodes.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="font-display font-semibold text-base mb-3">
                Codigos de invitacion activos
              </h4>
              <div className="space-y-2">
                {inviteCodes.map(code => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-3 bg-bg-muted rounded-lg"
                  >
                    <div>
                      <code className="font-display font-bold tracking-widest">
                        {code.code}
                      </code>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="brand">{getInviteRoleLabel(code.role)}</Badge>
                        <span className="text-xs text-text-tertiary">
                          Expira {formatDate(code.expiresAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCode(code.id)}
                      className="btn btn-sm btn-ghost text-error"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </main>

      {/* Add Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Agregar miembro"
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-secondary flex-1"
            >
              Cerrar
            </button>
            {newCode && (
              <button
                type="button"
                onClick={() => setNewCode(null)}
                className="btn btn-primary flex-1"
              >
                Generar otro
              </button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Rol del nuevo miembro</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('employee')}
                className={`btn flex-1 ${selectedRole === 'employee' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Empleado
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('partner')}
                className={`btn flex-1 ${selectedRole === 'partner' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Socio
              </button>
            </div>
          </div>

          {!newCode ? (
            <button
              type="button"
              onClick={handleGenerateCode}
              disabled={isGenerating}
              className="btn btn-primary w-full"
            >
              {isGenerating ? (
                <>
                  <Spinner />
                  <span>Generando...</span>
                </>
              ) : (
                'Generar codigo de invitacion'
              )}
            </button>
          ) : (
            <div className="p-4 bg-success-subtle rounded-lg">
              <p className="text-sm text-text-secondary mb-2">
                Comparte este codigo con tu nuevo {getInviteRoleLabel(selectedRole).toLowerCase()}:
              </p>
              <div className="flex items-center gap-3">
                <code className="text-2xl font-display font-bold tracking-widest text-success">
                  {newCode}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyCode(newCode)}
                  className="btn btn-sm btn-secondary"
                >
                  Copiar
                </button>
              </div>
              <p className="text-xs text-text-tertiary mt-2">
                Valido por 7 dias
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
