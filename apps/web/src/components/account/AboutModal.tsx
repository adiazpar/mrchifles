'use client'

import { useIntl } from 'react-intl';
import { Modal } from '@/components/ui'
import { APP_VERSION } from '@/lib/version'

export interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Static informational modal. Shows the app name, tagline, and the
 * version pulled at build time from package.json (see src/lib/version.ts).
 * Bumping the package.json version updates this modal automatically on
 * the next build -- no manual string tracking.
 */
export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const t = useIntl()
  const tCommon = useIntl()

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Step title={t.formatMessage({
        id: 'account.about_modal_title'
      })}>
        <Modal.Item>
          <div className="text-center py-4">
            <h1 className="text-2xl font-display font-bold text-text-primary">
              {t.formatMessage({
                id: 'account.about_app_name'
              })}
            </h1>
            <p className="text-sm text-text-tertiary mt-1">
              {t.formatMessage({
                id: 'account.about_tagline'
              })}
            </p>
            <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-bg-muted">
              <span className="text-xs text-text-tertiary uppercase tracking-wider">
                {t.formatMessage({
                  id: 'account.about_version_label'
                })}
              </span>
              <span className="text-xs text-text-secondary font-medium">
                {APP_VERSION}
              </span>
            </div>
          </div>
        </Modal.Item>

        <Modal.Item>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t.formatMessage({
              id: 'account.about_description'
            })}
          </p>
          <p className="text-xs text-text-tertiary mt-4 text-center">
            {t.formatMessage({
              id: 'account.about_credits'
            })}
          </p>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={onClose}
          >
            {tCommon.formatMessage({
              id: 'common.close'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
