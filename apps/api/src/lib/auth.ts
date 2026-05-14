import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { emailOTP, twoFactor } from 'better-auth/plugins'
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import * as schema from '@kasero/shared/db/schema'
import { sendVerificationEmail, sendResetPasswordEmail } from './email'
import { hashPassword, verifyPassword } from './password-hash'

// Resolve the user's UI language from the DB before the email is sent.
// Falls back to en-US when the user can't be found (e.g., during signup
// where the row was just inserted in a different transaction).
async function lookupUserLanguage(email: string): Promise<string> {
  try {
    const row = await db
      .select({ language: schema.users.language })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1)
    return row[0]?.language ?? 'en-US'
  } catch {
    return 'en-US'
  }
}

// Google OAuth is configured only when both env vars are present so the
// config object stays well-formed in dev environments that haven't
// provisioned Google credentials yet. better-auth's socialProviders is a
// plain object — we conditionally include the `google` key.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      ...schema,
      user: schema.users,
    },
  }),

  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:8000',
  secret: process.env.AUTH_SECRET ?? '',

  user: {
    modelName: 'users',
    fields: { image: 'avatar' },
    additionalFields: {
      language: { type: 'string', required: false, defaultValue: 'en-US', input: true },
      phoneNumber: { type: 'string', required: false, input: true },
      phoneNumberVerified: { type: 'boolean', required: false, defaultValue: false, input: false },
    },
    // Enables `auth.api.deleteUser` which the /api/account/delete wrapper
    // calls after our own business-ownership pre-check. Without this flag
    // better-auth returns NOT_FOUND from the endpoint. Sessions and
    // account rows cascade-delete via the FK on user_id; business_users
    // rows cascade-delete via FK on users.id as well.
    deleteUser: {
      enabled: true,
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    password: {
      hash: hashPassword,
      verify: ({ password, hash }) => verifyPassword(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      const language = (user as { language?: string }).language ?? 'en-US'
      await sendResetPasswordEmail({ email: user.email, url, language })
    },
  },

  // `sendOnSignIn` lives on `emailVerification` in better-auth 1.6.x (the
  // spec listed it under `emailAndPassword` which is its sibling). Re-send
  // verification email automatically when an unverified user attempts to
  // sign in so the OTP flow can resume.
  emailVerification: {
    sendOnSignIn: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: { enabled: true, maxAge: 5 * 60 }, // 5 min in-memory cache
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  socialProviders,

  // Cross-session cookie-cache poisoning defense.
  //
  // better-auth's POST /email-otp/verify-email identifies the user to
  // verify by `body.email` (not by the active session). On success it
  // also rewrites the CALLER's session cookie cache with
  // `emailVerified: true` — even when the caller's session belongs to
  // a different user than the one whose OTP just succeeded.
  //
  // Concretely (node_modules/better-auth/dist/plugins/email-otp/routes.mjs:336-345):
  //   const currentSession = await getSessionFromCtx(ctx)
  //   if (currentSession && updatedUser.emailVerified) {
  //     await setCookieCache(ctx, { session, user: { ...currentSession.user, emailVerified: true } })
  //   }
  //
  // Without this defense, an attacker who controls any verifiable
  // mailbox B can mint A's session, call verify-email for B, and have
  // A's `session.user.emailVerified` flip to true server-side for the
  // duration of `session.cookieCache.maxAge` (5 minutes) — bypassing
  // the EMAIL_NOT_VERIFIED gate in withAuth / requireBusinessAccess /
  // /api/invite/join etc.
  //
  // Targeted fix: a `before` hook that rejects /email-otp/verify-email
  // whenever there's an active session whose email doesn't match the
  // email being verified. Other paths and cookie caching are untouched
  // (no DB hit on every authenticated request). The unauthenticated
  // verify path used during signup still works because `currentSession`
  // is null there. The matching-email case still works because the
  // attacker would have to control the victim's mailbox to verify it,
  // at which point full account takeover is already possible via
  // password reset — the cookie-cache poisoning gains them nothing.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/email-otp/verify-email') return
      const body = ctx.body as { email?: string } | undefined
      const targetEmail = body?.email?.toLowerCase()
      if (!targetEmail) return
      const currentSession = await getSessionFromCtx(ctx).catch(() => null)
      if (!currentSession) return
      const sessionEmail = currentSession.user.email?.toLowerCase()
      if (sessionEmail && sessionEmail !== targetEmail) {
        throw new APIError('FORBIDDEN', {
          message: 'Cannot verify a different account while signed in. Sign out first.',
          code: 'CROSS_ACCOUNT_VERIFICATION_FORBIDDEN',
        })
      }
    }),
  },

  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      async sendVerificationOTP({ email, otp }) {
        const language = await lookupUserLanguage(email)
        await sendVerificationEmail({ email, otp, language })
      },
    }),
    // TOTP secrets and backup codes are stored encrypted at rest by
    // better-auth itself: the plugin runs symmetricEncrypt() against the
    // shared AUTH_SECRET on insert and symmetricDecrypt() on read (see
    // node_modules/better-auth/dist/plugins/two-factor/{index,totp/index}.mjs).
    // No additional encryption wrapper is needed for this version (1.6.x).
    // Note: rotating AUTH_SECRET invalidates every existing TOTP enrollment
    // because the stored ciphertext can no longer be decrypted — users would
    // need to re-enroll.
    twoFactor({
      issuer: 'Kasero',
    }),
  ],

  rateLimit: {
    enabled: true,
    // Cross-instance consistency requires database storage. The
    // `rate_limit` table is declared in packages/shared/src/db/schema.ts
    // and applied via packages/shared/migrations/2026-05-13-04-rate-limit-table.sql.
    storage: 'database',
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 3 },
      '/email-otp/send-verification-otp': { window: 60, max: 1 },
      '/email-otp/verify-email': { window: 60, max: 5 },
      '/forget-password': { window: 3600, max: 3 },
      '/two-factor/verify': { window: 60, max: 5 },
      '/two-factor/enable': { window: 3600, max: 3 },
    },
  },

  advanced: {
    cookiePrefix: 'kasero',
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: { enabled: false },
  },
})

export type Auth = typeof auth
export type Session = typeof auth.$Infer.Session
