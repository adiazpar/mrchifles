import { useIntl } from 'react-intl'
import { useMemo } from 'react'
import type { MessageId } from '@/i18n/messageIds'

// Five-bucket strength model. The 8-char minimum is enforced by the
// API and by RegisterPage's submit guard; the meter here is a visual
// hint, not validation. Buckets:
//   short  — under 8 chars (won't pass server validation)
//   weak   — exactly 8+ chars, no variety
//   fair   — 8+ chars + (length >= 12 OR uppercase OR digit/symbol)
//   good   — three positive signals
//   strong — all four positive signals
type Strength = 'short' | 'weak' | 'fair' | 'good' | 'strong'

function scoreStrength(password: string): Strength | null {
  if (!password) return null
  if (password.length < 8) return 'short'
  let score = 1
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++
  if (score === 1) return 'weak'
  if (score === 2) return 'fair'
  if (score === 3) return 'good'
  return 'strong'
}

const BARS_LIT: Record<Strength, number> = {
  short: 0,
  weak: 1,
  fair: 2,
  good: 3,
  strong: 4,
}

const TONE_CLASS: Record<Strength, string> = {
  short: 'auth-strength--warn',
  weak: 'auth-strength--warn',
  fair: 'auth-strength--fair',
  good: 'auth-strength--pass',
  strong: 'auth-strength--pass',
}

const LABEL_KEY: Record<Strength, MessageId> = {
  short: 'auth.password_strength_short',
  weak: 'auth.password_strength_weak',
  fair: 'auth.password_strength_fair',
  good: 'auth.password_strength_good',
  strong: 'auth.password_strength_strong',
}

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const intl = useIntl()
  const strength = useMemo(() => scoreStrength(password), [password])
  if (!strength) return null

  const lit = BARS_LIT[strength]
  const cls = ['auth-strength', TONE_CLASS[strength]].join(' ')

  return (
    <div className={cls}>
      <div className="auth-strength__bars">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < lit ? 'is-on' : undefined} />
        ))}
      </div>
      <div className="auth-strength__label">
        {intl.formatMessage({ id: 'auth.password_strength_label' })}
        {' · '}
        <strong>{intl.formatMessage({ id: LABEL_KEY[strength] })}</strong>
      </div>
    </div>
  )
}
