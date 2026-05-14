import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

// better-auth wires its endpoints behind /api/auth — sign-in/email-otp,
// sign-up/email-otp, callback/<provider>, email-otp/* (send/verify),
// session, get-session, list-sessions, revoke-other-sessions, delete-user.
// Account-management routes that need our pre-checks (delete, change-email)
// live as static siblings under /api/account/.
export const { POST, GET } = toNextJsHandler(auth)
