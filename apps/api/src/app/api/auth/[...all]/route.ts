import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

// better-auth wires every endpoint behind /api/auth (sign-in, sign-up,
// callback/<provider>, email-otp/*, two-factor/*, session, get-session,
// forget-password, reset-password, list-sessions, revoke-other-sessions,
// delete-user, etc.). Legacy POS auth routes (login, logout, me, register,
// profile, change-password, check-email) live as static siblings during the
// migration window — Next.js prefers static over dynamic, so they take
// precedence until they're deleted in T16. After T16 this catch-all owns
// the entire /api/auth/* surface.
export const { POST, GET } = toNextJsHandler(auth)
