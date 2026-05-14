import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { emailOTP } from 'better-auth/plugins'
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import * as schema from '@kasero/shared/db/schema'
import { sendVerificationEmail } from './email'

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
    deleteUser: { enabled: true },
  },

  // Passwordless by design. No password column is read or written by this
  // config; the legacy account.password column was dropped in migration
  // 2026-05-14-01-passwordless-cleanup.sql.

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    // Disable better-auth's default 24h sensitive-op freshness gate. We
    // gate destructive actions (delete account, change email, etc.) with
    // a fresh email-OTP step-up at the route level — that proves mailbox
    // control RIGHT NOW. The upstream freshAge check tests calendar age
    // from initial login, which is redundant with our OTP gate and would
    // produce SESSION_EXPIRED 500s for legitimate 6-day-old sessions.
    // See node_modules/better-auth/dist/api/routes/update-user.mjs:304-308.
    freshAge: 0,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  socialProviders,

  // Cross-session cookie-cache poisoning defense. better-auth's POST
  // /email-otp/verify-email identifies the user by `body.email` and updates
  // the CALLER's session cache with `emailVerified: true` even if the
  // caller's session belongs to a different user.
  // See node_modules/better-auth/dist/plugins/email-otp/routes.mjs:336-345
  // for the upstream code path this defends against.
  // We reject the request whenever there's an active session whose email
  // doesn't match the email being verified.
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
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      disableSignUp: false,
      async sendVerificationOTP({ email, otp }) {
        const language = await lookupUserLanguage(email)
        await sendVerificationEmail({ email, otp, language })
      },
    }),
  ],

  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: {
      '/email-otp/send-verification-otp': { window: 60, max: 1 },
      '/email-otp/verify-email': { window: 60, max: 5 },
      '/sign-in/email-otp': { window: 60, max: 5 },
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
