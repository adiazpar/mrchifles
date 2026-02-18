'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { Card, Badge, Spinner } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { IconEmployee, IconPartner, IconCheck, IconRefresh, IconCopy, IconTrash, IconClose, IconAdd, IconPhone } from '@/components/icons'
import { DirectInviteForm } from '@/components/invite'
import { PhoneInput } from '@/components/auth/phone-input'
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
import { formatPhoneForDisplay, isValidE164 } from '@/lib/countries'
import type { User, InviteCode, InviteRole } from '@/types'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

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
  const [shareMethod, setShareMethod] = useState<'qr' | 'code' | 'whatsapp'>('qr')
  const copyFeedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // User management modal state
  const [selectedMember, setSelectedMember] = useState<User | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [isPhoneChangeOpen, setIsPhoneChangeOpen] = useState(false)
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [phoneChangeError, setPhoneChangeError] = useState('')
  const [phoneChangeLoading, setPhoneChangeLoading] = useState(false)

  // Role change state
  const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false)
  const [newRole, setNewRole] = useState<'partner' | 'employee'>('employee')
  const [roleChangeLoading, setRoleChangeLoading] = useState(false)

  // PIN reset state
  const [pinResetLoading, setPinResetLoading] = useState(false)

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

  const handleOpenModal = useCallback(() => {
    setNewCode(null)
    setGeneratedCodeId(null)
    setQrDataUrl(null)
    setSelectedRole('employee')
    setError('')
    setShareMethod('qr')
    setIsModalOpen(true)
  }, [])

  const handleOpenExistingCode = useCallback(async (code: InviteCode) => {
    setSelectedRole(code.role)
    setGeneratedCodeId(code.id)
    setNewCode(code.code)
    setError('')
    setShareMethod('qr')
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

  // User management modal handlers
  const handleOpenUserModal = useCallback((member: User) => {
    setSelectedMember(member)
    setIsUserModalOpen(true)
    setIsPhoneChangeOpen(false)
    setNewMemberPhone('')
    setPhoneChangeError('')
  }, [])

  const handleCloseUserModal = useCallback(() => {
    setIsUserModalOpen(false)
    setSelectedMember(null)
    setIsPhoneChangeOpen(false)
    setNewMemberPhone('')
    setPhoneChangeError('')
    setIsRoleChangeOpen(false)
  }, [])

  const handleToggleUserStatusInModal = useCallback(async () => {
    if (!selectedMember) return
    const newStatus = selectedMember.status === 'active' ? 'disabled' : 'active'
    try {
      await pb.collection('users').update(selectedMember.id, { status: newStatus })
      const updatedMember = { ...selectedMember, status: newStatus as User['status'] }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )
    } catch (err) {
      console.error('Error updating user status:', err)
    }
  }, [selectedMember, pb])

  const handleOpenPhoneChange = useCallback(() => {
    setIsPhoneChangeOpen(true)
    setNewMemberPhone(selectedMember?.phoneNumber || '')
    setPhoneChangeError('')
  }, [selectedMember?.phoneNumber])

  const handleCancelPhoneChange = useCallback(() => {
    setIsPhoneChangeOpen(false)
    setNewMemberPhone('')
    setPhoneChangeError('')
  }, [])

  const handleSubmitPhoneChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMember) return

    setPhoneChangeError('')

    if (!newMemberPhone || !isValidE164(newMemberPhone)) {
      setPhoneChangeError('Ingresa un numero de telefono valido')
      return
    }

    if (newMemberPhone === selectedMember.phoneNumber) {
      setPhoneChangeError('El nuevo numero debe ser diferente al actual')
      return
    }

    setPhoneChangeLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/admin/change-member-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({
          userId: selectedMember.id,
          newPhoneNumber: newMemberPhone,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setPhoneChangeError(data.error || 'Error al cambiar el numero')
        setPhoneChangeLoading(false)
        return
      }

      // Update local state
      const updatedMember = { ...selectedMember, phoneNumber: newMemberPhone }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )

      // Close phone change view
      setIsPhoneChangeOpen(false)
      setNewMemberPhone('')
    } catch {
      setPhoneChangeError('Error de conexion')
    } finally {
      setPhoneChangeLoading(false)
    }
  }, [selectedMember, newMemberPhone, pb])

  // Role change handlers
  const handleOpenRoleChange = useCallback(() => {
    if (!selectedMember) return
    setIsRoleChangeOpen(true)
    // Start with current role selected (only partner/employee can be changed)
    setNewRole(selectedMember.role === 'partner' ? 'partner' : 'employee')
  }, [selectedMember])

  const handleCancelRoleChange = useCallback(() => {
    setIsRoleChangeOpen(false)
  }, [])

  const handleSubmitRoleChange = useCallback(async () => {
    if (!selectedMember) return

    setRoleChangeLoading(true)

    try {
      await pb.collection('users').update(selectedMember.id, { role: newRole })

      // Update local state
      const updatedMember = { ...selectedMember, role: newRole }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )

      // Close role change view
      setIsRoleChangeOpen(false)
    } catch (err) {
      console.error('Error changing role:', err)
    } finally {
      setRoleChangeLoading(false)
    }
  }, [selectedMember, newRole, pb])

  // PIN reset handler
  const handleResetPin = useCallback(async () => {
    if (!selectedMember) return

    setPinResetLoading(true)

    try {
      await pb.collection('users').update(selectedMember.id, {
        pinResetRequired: true,
      })

      // Update local state
      const updatedMember = { ...selectedMember, pinResetRequired: true }
      setSelectedMember(updatedMember)
      setTeamMembers(prev =>
        prev.map(m => m.id === selectedMember.id ? updatedMember : m)
      )
    } catch (err) {
      console.error('Error resetting PIN:', err)
    } finally {
      setPinResetLoading(false)
    }
  }, [selectedMember, pb])

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
            {sortedTeamMembers.map(member => {
              const isSelf = member.id === user?.id
              const isManageable = canManageTeam && !isSelf && member.role !== 'owner'
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-bg-muted"
                  onClick={() => handleOpenUserModal(member)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleOpenUserModal(member)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <div className="sidebar-user-avatar">
                    {getUserInitials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{member.name}</span>
                      {isSelf && (
                        <span className="text-xs text-text-tertiary">(Tu)</span>
                      )}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {getRoleLabel(member.role)}
                      <span className="mx-1.5">·</span>
                      <span className={member.status === 'active' ? 'text-success' : 'text-error'}>
                        {member.status === 'active' ? 'Activo' : 'Deshabilitado'}
                      </span>
                    </div>
                  </div>

                  {/* Chevron indicator */}
                  <div className={`${isManageable ? 'text-text-tertiary' : 'text-text-quaternary'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )
            })}
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
          /* Step 2: Success State - Segmented Control Layout */
          <div className="invite-success-compact">
            {/* Header with role and expiry */}
            <div className="invite-meta-row">
              <Badge variant="brand">{getInviteRoleLabel(selectedRole)}</Badge>
              <span className="invite-expiry-inline">Valido por 7 dias</span>
            </div>

            {/* Segmented Control */}
            <div className="invite-segment-control">
              <button
                type="button"
                className={`invite-segment ${shareMethod === 'qr' ? 'invite-segment-active' : ''}`}
                onClick={() => setShareMethod('qr')}
              >
                Escanear QR
              </button>
              <button
                type="button"
                className={`invite-segment ${shareMethod === 'code' ? 'invite-segment-active' : ''}`}
                onClick={() => setShareMethod('code')}
              >
                Copiar codigo
              </button>
              <button
                type="button"
                className={`invite-segment ${shareMethod === 'whatsapp' ? 'invite-segment-active' : ''}`}
                onClick={() => setShareMethod('whatsapp')}
              >
                WhatsApp
              </button>
            </div>

            {/* Dynamic Content Area */}
            <div className="invite-content-area">
              {shareMethod === 'qr' && qrDataUrl && (
                <div className="invite-qr-view">
                  <div className="invite-qr-box">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Data URL for QR code, no optimization benefit */}
                    <img src={qrDataUrl} alt="Codigo QR para registro" />
                  </div>
                  <p className="invite-hint">
                    El empleado escanea este codigo con su camara
                  </p>
                </div>
              )}

              {shareMethod === 'code' && (
                <div className="invite-code-view">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(newCode)}
                    className="invite-code-box-large"
                    title="Copiar codigo"
                  >
                    <code className="invite-code-text-large">{newCode}</code>
                    {copyFeedback === newCode ? (
                      <IconCheck className="w-6 h-6 text-success" />
                    ) : (
                      <IconCopy className="w-6 h-6" />
                    )}
                  </button>
                  <p className="invite-hint">
                    Toca para copiar y compartir el codigo
                  </p>
                </div>
              )}

              {shareMethod === 'whatsapp' && (
                <div className="invite-whatsapp-view">
                  <DirectInviteForm code={newCode} role={selectedRole} />
                </div>
              )}
            </div>

            {/* Regenerate button */}
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

      {/* User Management Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        title={
          isPhoneChangeOpen
            ? 'Cambiar telefono'
            : isRoleChangeOpen
              ? 'Cambiar rol'
              : selectedMember?.id === user?.id
                ? 'Tu perfil'
                : 'Gestionar miembro'
        }
      >
        {selectedMember && !isPhoneChangeOpen && !isRoleChangeOpen ? (
          /* Main user details view */
          <div className="space-y-5">
            {/* Member header */}
            <div className="flex items-center gap-3">
              <div className="sidebar-user-avatar w-11 h-11 text-sm">
                {getUserInitials(selectedMember.name)}
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">{selectedMember.name}</h3>
                <div className="text-xs text-text-tertiary mt-0.5">
                  {getRoleLabel(selectedMember.role)}
                  <span className="mx-1.5">·</span>
                  <span className={selectedMember.status === 'active' ? 'text-success' : 'text-error'}>
                    {selectedMember.status === 'active' ? 'Activo' : 'Deshabilitado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Member details */}
            <div className="space-y-3 p-4 bg-bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Telefono</span>
                <span className="text-sm font-medium">
                  {formatPhoneForDisplay(selectedMember.phoneNumber)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Miembro desde</span>
                <span className="text-sm font-medium">
                  {formatDate(selectedMember.created)}
                </span>
              </div>
            </div>

            {/* Actions - only show for manageable members (not self, not owner) */}
            {canManageTeam && selectedMember.id !== user?.id && selectedMember.role !== 'owner' && (
              <div className="space-y-3">
                {/* Change phone button */}
                <button
                  type="button"
                  onClick={handleOpenPhoneChange}
                  className="btn btn-secondary w-full justify-start gap-3"
                >
                  <IconPhone className="w-5 h-5" />
                  <span>Cambiar numero de telefono</span>
                </button>

                {/* Change role button */}
                <button
                  type="button"
                  onClick={handleOpenRoleChange}
                  className="btn btn-secondary w-full justify-start gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Cambiar rol</span>
                </button>

                {/* Reset PIN button */}
                <button
                  type="button"
                  onClick={handleResetPin}
                  disabled={pinResetLoading || selectedMember.pinResetRequired}
                  className="btn btn-secondary w-full justify-start gap-3"
                >
                  {pinResetLoading ? (
                    <Spinner />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  )}
                  <span>{selectedMember.pinResetRequired ? 'PIN reset pendiente' : 'Forzar reset de PIN'}</span>
                </button>

                {/* PIN reset explanation */}
                {selectedMember.pinResetRequired && (
                  <p className="text-xs text-text-tertiary">
                    El usuario debera crear un nuevo PIN la proxima vez que inicie sesion.
                  </p>
                )}

                {/* Toggle status button */}
                <button
                  type="button"
                  onClick={handleToggleUserStatusInModal}
                  className={`btn w-full justify-start gap-3 ${
                    selectedMember.status === 'active'
                      ? 'btn-ghost text-error hover:bg-error-subtle'
                      : 'btn-secondary'
                  }`}
                >
                  {selectedMember.status === 'active' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span>Deshabilitar cuenta</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Habilitar cuenta</span>
                    </>
                  )}
                </button>

                {/* Status explanation */}
                {selectedMember.status === 'disabled' && (
                  <p className="text-xs text-text-tertiary">
                    Este usuario no puede iniciar sesion mientras su cuenta este deshabilitada.
                  </p>
                )}
              </div>
            )}

            {/* Self view hint */}
            {selectedMember.id === user?.id && (
              <p className="text-xs text-text-tertiary text-center">
                Para cambiar tu numero de telefono, ve a{' '}
                <Link href="/ajustes" className="text-brand hover:underline">
                  Configuracion
                </Link>.
              </p>
            )}
          </div>
        ) : selectedMember && isPhoneChangeOpen ? (
          /* Phone change view */
          <form onSubmit={handleSubmitPhoneChange} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Ingresa el nuevo numero de telefono para {selectedMember.name}.
            </p>

            {phoneChangeError && (
              <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                {phoneChangeError}
              </div>
            )}

            <PhoneInput
              label="Nuevo numero de telefono"
              value={newMemberPhone}
              onChange={setNewMemberPhone}
              autoFocus
            />

            <p className="text-xs text-text-tertiary">
              El usuario debera usar este numero para iniciar sesion.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelPhoneChange}
                className="btn btn-secondary flex-1"
                disabled={phoneChangeLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={phoneChangeLoading}
              >
                {phoneChangeLoading ? <Spinner /> : 'Guardar'}
              </button>
            </div>
          </form>
        ) : selectedMember && isRoleChangeOpen ? (
          /* Role change view */
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Selecciona el nuevo rol para {selectedMember.name}.
            </p>

            <div className="space-y-3">
              <RoleCard
                icon={<IconEmployee className="w-5 h-5" />}
                title="Empleado"
                description="Puede registrar ventas y ver el resumen del dia"
                selected={newRole === 'employee'}
                onClick={() => setNewRole('employee')}
              />
              <RoleCard
                icon={<IconPartner className="w-5 h-5" />}
                title="Socio"
                description="Acceso completo a reportes, inventario y configuracion"
                selected={newRole === 'partner'}
                onClick={() => setNewRole('partner')}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelRoleChange}
                className="btn btn-secondary flex-1"
                disabled={roleChangeLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitRoleChange}
                className="btn btn-primary flex-1"
                disabled={roleChangeLoading || newRole === selectedMember.role}
              >
                {roleChangeLoading ? <Spinner /> : 'Guardar'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
