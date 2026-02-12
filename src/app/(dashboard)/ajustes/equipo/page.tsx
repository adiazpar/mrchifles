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

export default function TeamPage() {
  const { user, pb } = useAuth()

  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedRole, setSelectedRole] = useState<InviteRole>('employee')
  const [newCode, setNewCode] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Check if current user is owner
  const canManageTeam = isOwner(user)

  // Load team members and invite codes
  useEffect(() => {
    async function loadData() {
      try {
        // Load all users
        const users = await pb.collection('users').getFullList<User>({
          sort: '-created',
        })
        setTeamMembers(users)

        // Load active invite codes (owner only)
        if (canManageTeam) {
          const codes = await pb.collection('invite_codes').getFullList<InviteCode>({
            filter: 'used = false && expiresAt > @now',
            sort: '-created',
            expand: 'createdBy',
          })
          setInviteCodes(codes)
        }
      } catch (err) {
        console.error('Error loading team data:', err)
        setError('Error al cargar los datos del equipo')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
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

        {/* Generate Invite Code (Owner only) */}
        {canManageTeam && (
          <Card padding="lg">
            <h3 className="font-display font-bold text-lg mb-4">Invitar miembro</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Rol</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('employee')}
                    className={`btn ${selectedRole === 'employee' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Empleado
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('partner')}
                    className={`btn ${selectedRole === 'partner' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Socio
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={isGenerating}
                className="btn btn-primary"
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

              {/* New code display */}
              {newCode && (
                <div className="p-4 bg-success-subtle rounded-lg">
                  <p className="text-sm text-text-secondary mb-2">
                    Comparte este codigo con tu nuevo {getInviteRoleLabel(selectedRole).toLowerCase()}:
                  </p>
                  <div className="flex items-center gap-3">
                    <code className="text-3xl font-display font-bold tracking-widest text-success">
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
          </Card>
        )}

        {/* Active Invite Codes (Owner only) */}
        {canManageTeam && inviteCodes.length > 0 && (
          <Card padding="lg">
            <h3 className="font-display font-bold text-lg mb-4">Codigos activos</h3>

            <div className="space-y-3">
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
          </Card>
        )}

        {/* Team Members List */}
        <Card padding="lg">
          <h3 className="font-display font-bold text-lg mb-4">
            Miembros del equipo ({teamMembers.length})
          </h3>

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
        </Card>
      </main>
    </>
  )
}
