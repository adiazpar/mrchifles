import 'server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { emailOTP, twoFactor } from 'better-auth/plugins'
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
    twoFactor({
      issuer: 'Kasero',
    }),
  ],

  rateLimit: {
    enabled: true,
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
