'use client'

import Link from 'next/link'
import { Modal, useMorphingModal } from '@/components/ui'
import { getRoleLabel, getUserInitials } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import type { User } from '@/types'

export interface UserDetailsStepProps {
  member: User
  currentUser: User | null
  canManageTeam: boolean
  onToggleStatus: () => void
}

export function UserDetailsStep({
  member,
  currentUser,
  canManageTeam,
  onToggleStatus,
}: UserDetailsStepProps) {
  const { goToStep } = useMorphingModal()
  const isSelf = member.id === currentUser?.id
  const isManageable = canManageTeam && !isSelf && member.role !== 'owner'

  return (
    <>
      <Modal.Item>
        {/* Member header */}
        <div className="flex items-center gap-3">
          <div className="sidebar-user-avatar w-11 h-11 text-sm">
            {getUserInitials(member.name)}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">{member.name}</h3>
            <div className="text-xs text-text-tertiary mt-0.5">
              {getRoleLabel(member.role)}
              <span className="mx-1.5">·</span>
              <span className={member.status === 'active' ? 'text-success' : 'text-error'}>
                {member.status === 'active' ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </Modal.Item>

      <Modal.Item>
        {/* Member details */}
        <div className="space-y-3 p-4 bg-bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Email</span>
            <span className="text-sm font-medium">
              {isSelf
                ? member.email
                : `****${member.email.split('@')[0].slice(-4)}@${member.email.split('@')[1]}`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">Member since</span>
            <span className="text-sm font-medium">
              {formatDate(member.createdAt)}
            </span>
          </div>
        </div>
      </Modal.Item>

      {isManageable && (
        <Modal.Item>
          <div className="space-y-3">
            {/* Change role button */}
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="btn btn-secondary w-full justify-start gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Change role</span>
            </button>

            {/* Toggle status button */}
            <button
              type="button"
              onClick={onToggleStatus}
              className={`btn w-full justify-start gap-3 ${
                member.status === 'active'
                  ? 'btn-ghost text-error hover:bg-error-subtle'
                  : 'btn-secondary'
              }`}
            >
              {member.status === 'active' ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>Disable account</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Enable account</span>
                </>
              )}
            </button>

            {/* Status explanation */}
            {member.status === 'disabled' && (
              <p className="text-xs text-text-tertiary">
                This user cannot sign in while their account is disabled.
              </p>
            )}
          </div>
        </Modal.Item>
      )}

      {/* Self view hint */}
      {isSelf && (
        <Modal.Item>
          <p className="text-xs text-text-tertiary text-center">
            To change your settings, go to{' '}
            <Link href="/settings" className="text-brand hover:underline">
              Settings
            </Link>.
          </p>
        </Modal.Item>
      )}
    </>
  )
}
