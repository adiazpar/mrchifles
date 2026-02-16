import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import {
  generateOTP,
  getOTPExpiration,
  sendOTPViaWhatsApp,
  isRateLimited,
  recordOTPAttempt,
  isTwilioConfigured,
} from '@/lib/twilio'
import { isValidE164 } from '@/lib/countries'
import type { OTPPurpose } from '@/types'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

/**
 * POST /api/otp/send
 *
 * Send OTP code via WhatsApp for phone verification.
 *
 * Body: { phoneNumber: "+51987654321", purpose: "registration" }
 * Response: { success: true, expiresIn: 300 } or { error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, purpose } = body as {
      phoneNumber: string
      purpose: OTPPurpose
    }

    // Validate phone number format
    if (!phoneNumber || !isValidE164(phoneNumber)) {
      return NextResponse.json(
        { error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Validate purpose
    const validPurposes: OTPPurpose[] = ['registration', 'login', 'reset']
    if (!purpose || !validPurposes.includes(purpose)) {
      return NextResponse.json(
        { error: 'Proposito invalido' },
        { status: 400 }
      )
    }

    // Check rate limit (max 3 OTPs per phone per hour)
    if (isRateLimited(phoneNumber)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera una hora.' },
        { status: 429 }
      )
    }

    // Generate OTP
    const code = generateOTP()
    const expiresAt = getOTPExpiration()

    // Store OTP in database (using admin auth for server-side access)
    const pb = new PocketBase(POCKETBASE_URL)

    // Authenticate as admin for otp_codes access
    const adminEmail = process.env.PB_ADMIN_EMAIL
    const adminPassword = process.env.PB_ADMIN_PASSWORD

    if (adminEmail && adminPassword) {
      try {
        await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword)
      } catch (authError) {
        console.error('Admin auth failed:', authError)
        return NextResponse.json(
          { error: 'Error del servidor' },
          { status: 500 }
        )
      }
    }

    // For registration, check if phone is already registered (saves WhatsApp API cost)
    if (purpose === 'registration') {
      try {
        const existingUsers = await pb.collection('users').getList(1, 1, {
          filter: `phoneNumber = "${phoneNumber}"`,
        })
        if (existingUsers.totalItems > 0) {
          return NextResponse.json(
            { error: 'Este numero ya esta registrado' },
            { status: 400 }
          )
        }
      } catch {
        // If check fails, continue - registration will catch duplicates later
        console.warn('Could not check for existing phone number')
      }
    }

    // Delete any existing unused OTPs for this phone
    try {
      const existingOtps = await pb.collection('otp_codes').getList(1, 100, {
        filter: `phoneNumber = "${phoneNumber}" && used = false`,
      })
      for (const otp of existingOtps.items) {
        await pb.collection('otp_codes').delete(otp.id)
      }
    } catch {
      // Ignore errors when cleaning up old OTPs
    }

    // Create new OTP record
    await pb.collection('otp_codes').create({
      phoneNumber,
      code,
      expiresAt: expiresAt.toISOString(),
      used: false,
      purpose,
    })

    // Send OTP via WhatsApp
    if (isTwilioConfigured()) {
      const result = await sendOTPViaWhatsApp(phoneNumber, code)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }
    } else {
      // In development without Twilio, log the code
      console.warn(`[DEV] OTP for ${phoneNumber}: ${code}`)
    }

    // Record attempt for rate limiting
    recordOTPAttempt(phoneNumber)

    return NextResponse.json({
      success: true,
      expiresIn: 300, // 5 minutes in seconds
      // In dev mode without Twilio, include the code for testing
      ...(process.env.NODE_ENV === 'development' && !isTwilioConfigured()
        ? { devCode: code }
        : {}),
    })
  } catch (error) {
    console.error('Error sending OTP:', error)
    return NextResponse.json(
      { error: 'Error al enviar el codigo' },
      { status: 500 }
    )
  }
}
