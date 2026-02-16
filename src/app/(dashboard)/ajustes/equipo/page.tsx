'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import QRCode from 'qrcode'
import { Card, Badge, Spinner } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { IconEmployee, IconPartner, IconCheck, IconRefresh, IconCopy, IconTrash, IconClose, IconAdd } from '@/components/icons'
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
            <IconClose className="w-5 h-5" />
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

// Role selection card component
interface RoleCardProps {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

function RoleCard({ icon, title, description, selected, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`role-card ${selected ? 'role-card-selected' : ''}`}
    >
      <div className="role-card-icon">{icon}</div>
      <div className="role-card-content">
        <span className="role-card-title">{title}</span>
        <span className="role-card-description">{description}</span>
      </div>
      <IconCheck className={`role-card-check ${selected ? '' : 'invisible'}`} />
    </button>
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
  const [generatedCodeId, setGeneratedCodeId] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const copyFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  // Sort team members: owner first, then partners, then employees
  const sortedTeamMembers = useMemo(() => {
    const roleOrder: Record<string, number> = {
      owner: 0,
      partner: 1,
      employee: 2,
    }
    return [...teamMembers].sort((a, b) => {
      const orderA = roleOrder[a.role] ?? 99
      const orderB = roleOrder[b.role] ?? 99
      return orderA - orderB
    })
  }, [teamMembers])

  const handleGenerateCode = useCallback(async () => {
    if (!user) return

    setIsGenerating(true)
    setError('')
    setNewCode(null)

    try {
      const code = generateInviteCode()
      const expiresAt = getInviteCodeExpiration()

      const record = await pb.collection('invite_codes').create({
        code,
        role: selectedRole,
        createdBy: user.id,
        expiresAt: expiresAt.toISOString(),
        used: false,
      })

      setGeneratedCodeId(record.id)
      setNewCode(code)

      // Generate QR code
      const registrationUrl = `${window.location.origin}/invite?code=${code}`
      const qr = await QRCode.toDataURL(registrationUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      setQrDataUrl(qr)

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
      // Check if clipboard API is available (requires secure context - HTTPS)
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(code)
      } else {
        // Fallback for non-secure contexts (HTTP on mobile)
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '-9999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      // Clear any existing timer before setting a new one
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current)
      }
      setCopyFeedback(code)
      copyFeedbackTimerRef.current = setTimeout(() => setCopyFeedback(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Show the code in an alert as last resort
      alert(`Codigo: ${code}`)
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

  const handleRegenerateCode = useCallback(async () => {
    if (!user || !generatedCodeId) return

    setIsGenerating(true)

    try {
      // Delete old code
      await pb.collection('invite_codes').delete(generatedCodeId)

      // Generate new code with SAME role (selectedRole is locked)
      const code = generateInviteCode()
      const expiresAt = getInviteCodeExpiration()

      const record = await pb.collection('invite_codes').create({
        code,
        role: selectedRole,
        createdBy: user.id,
        expiresAt: expiresAt.toISOString(),
        used: false,
      })

      setGeneratedCodeId(record.id)
      setNewCode(code)

      // Generate new QR
      const registrationUrl = `${window.location.origin}/invite?code=${code}`
      const qr = await QRCode.toDataURL(registrationUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      setQrDataUrl(qr)

      // Refresh list
      const codes = await pb.collection('invite_codes').getFullList<InviteCode>({
        filter: 'used = false && expiresAt > @now',
        sort: '-created',
      })
      setInviteCodes(codes)
    } catch (err) {
      console.error('Error regenerating code:', err)
      setError('Error al regenerar el codigo')
    } finally {
      setIsGenerating(false)
    }
  }, [user, generatedCodeId, selectedRole, pb])

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
    setGeneratedCodeId(null)
    setQrDataUrl(null)
    setSelectedRole('employee')
    setError('')
    setIsModalOpen(true)
  }, [])

  const handleOpenExistingCode = useCallback(async (code: InviteCode) => {
    setSelectedRole(code.role)
    setGeneratedCodeId(code.id)
    setNewCode(code.code)
    setError('')
    setIsModalOpen(true)

    // Generate QR code for existing invite
    try {
      const registrationUrl = `${window.location.origin}/invite?code=${code.code}`
      const qr = await QRCode.toDataURL(registrationUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      setQrDataUrl(qr)
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setNewCode(null)
    setGeneratedCodeId(null)
    setQrDataUrl(null)
    setError('')
    // Clear copy feedback timer and state
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = null
    }
    setCopyFeedback(null)
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
                <IconAdd className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {sortedTeamMembers.map(member => (
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
              <h3 className="font-display font-bold text-lg mb-4">
                Codigos de invitacion activos ({inviteCodes.length})
              </h3>
              <div className="space-y-3">
                {inviteCodes.map(code => (
                  <button
                    key={code.id}
                    type="button"
                    onClick={() => handleOpenExistingCode(code)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-muted transition-colors w-full text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="font-display font-bold tracking-widest">
                          {code.code}
                        </code>
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        {getInviteRoleLabel(code.role)} <span className="mx-1">·</span> Expira {formatDate(code.expiresAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyCode(code.code)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            handleCopyCode(code.code)
                          }
                        }}
                        className="p-2 rounded-lg text-text-secondary hover:text-brand hover:bg-brand-subtle transition-colors"
                        title="Copiar codigo"
                      >
                        {copyFeedback === code.code ? (
                          <IconCheck className="w-4 h-4 text-success" />
                        ) : (
                          <IconCopy className="w-4 h-4" />
                        )}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCode(code.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            handleDeleteCode(code.id)
                          }
                        }}
                        className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error-subtle transition-colors"
                        title="Eliminar codigo"
                      >
                        <IconTrash className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
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
          !newCode ? (
            <>
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={isGenerating}
                className="btn btn-primary flex-1"
              >
                {isGenerating ? (
                  <>
                    <Spinner />
                    <span>Generando...</span>
                  </>
                ) : (
                  'Generar codigo'
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-primary w-full"
            >
              Listo
            </button>
          )
        }
      >
        {!newCode ? (
          /* Step 1: Role Selection */
          <div>
            <label className="label">Rol del nuevo miembro</label>
            <div className="space-y-3">
              <RoleCard
                icon={<IconEmployee className="w-5 h-5" />}
                title="Empleado"
                description="Puede registrar ventas y ver el resumen del dia"
                selected={selectedRole === 'employee'}
                onClick={() => setSelectedRole('employee')}
              />
              <RoleCard
                icon={<IconPartner className="w-5 h-5" />}
                title="Socio"
                description="Acceso completo a reportes, inventario y configuracion"
                selected={selectedRole === 'partner'}
                onClick={() => setSelectedRole('partner')}
              />
            </div>
          </div>
        ) : (
          /* Step 2: Success State - Compact Layout */
          <div className="invite-success-compact">
            <div className="invite-meta-row">
              <Badge variant="brand">{getInviteRoleLabel(selectedRole)}</Badge>
              <span className="invite-expiry-inline">Valido por 7 dias</span>
            </div>

            {qrDataUrl && (
              <div className="invite-qr-box">
                <img src={qrDataUrl} alt="Codigo QR para registro" />
              </div>
            )}

            <p className="invite-hint">
              Escanea el codigo QR o ingresa el codigo manualmente para registrarse como {getInviteRoleLabel(selectedRole).toLowerCase()}
            </p>

            <button
              type="button"
              onClick={() => handleCopyCode(newCode)}
              className="invite-code-box"
              title="Copiar codigo"
            >
              <code className="invite-code-text">{newCode}</code>
              {copyFeedback === newCode ? (
                <IconCheck className="w-5 h-5 text-success" />
              ) : (
                <IconCopy className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleRegenerateCode}
              disabled={isGenerating}
              className="invite-regenerate"
            >
              {isGenerating ? (
                <>
                  <Spinner />
                  <span>Regenerando...</span>
                </>
              ) : (
                <>
                  <IconRefresh className="w-3.5 h-3.5" />
                  <span>Regenerar codigo</span>
                </>
              )}
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
