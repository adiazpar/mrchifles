import twilio from 'twilio'

// ============================================
// TWILIO CLIENT
// ============================================

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'

// Only create client if credentials exist (server-side only)
const client = accountSid && authToken ? twilio(accountSid, authToken) : null

/**
 * Check if Twilio is configured
 */
export function isTwilioConfigured(): boolean {
  return !!client
}

// ============================================
// OTP GENERATION
// ============================================

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  // Use crypto for secure random generation
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  // Convert each byte to a digit (0-9)
  return Array.from(array)
    .map(byte => (byte % 10).toString())
    .join('')
}

/**
 * Get OTP expiration time (5 minutes from now)
 */
export function getOTPExpiration(): Date {
  const date = new Date()
  date.setMinutes(date.getMinutes() + 5)
  return date
}

// ============================================
// WHATSAPP MESSAGES
// ============================================

/**
 * Send OTP code via WhatsApp
 * @param phoneNumber E.164 format (e.g., +51987654321)
 * @param code 6-digit OTP code
 */
export async function sendOTPViaWhatsApp(
  phoneNumber: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!client) {
    console.error('Twilio not configured')
    return { success: false, error: 'Servicio de mensajeria no configurado' }
  }

  try {
    await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${phoneNumber}`,
      body: `Tu codigo de verificacion para Mr. Chifles es: ${code}\n\nEste codigo expira en 5 minutos.`,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send WhatsApp OTP:', error)
    return {
      success: false,
      error: 'Error al enviar el codigo. Intenta de nuevo.',
    }
  }
}

/**
 * Send team invite via WhatsApp
 * @param phoneNumber E.164 format
 * @param inviteCode 6-character invite code
 * @param role 'partner' or 'employee'
 */
export async function sendInviteViaWhatsApp(
  phoneNumber: string,
  inviteCode: string,
  role: 'partner' | 'employee'
): Promise<{ success: boolean; error?: string }> {
  if (!client) {
    console.error('Twilio not configured')
    return { success: false, error: 'Servicio de mensajeria no configurado' }
  }

  const roleLabel = role === 'partner' ? 'Socio' : 'Empleado'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mrchifles.vercel.app'

  try {
    await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${phoneNumber}`,
      body: `Te invito a Mr. Chifles como ${roleLabel}.\n\nTu codigo: ${inviteCode}\n\nRegistrate aqui: ${appUrl}/invite?code=${inviteCode}`,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send WhatsApp invite:', error)
    return {
      success: false,
      error: 'Error al enviar la invitacion. Intenta de nuevo.',
    }
  }
}

// ============================================
// RATE LIMITING (Simple in-memory for demo)
// In production, use Redis or database
// ============================================

const otpAttempts = new Map<string, { count: number; resetAt: number }>()

/**
 * Check if phone number has exceeded OTP rate limit
 * @param phoneNumber E.164 format
 * @returns true if rate limited
 */
export function isRateLimited(phoneNumber: string): boolean {
  const now = Date.now()
  const record = otpAttempts.get(phoneNumber)

  if (!record) {
    return false
  }

  // Reset if past the reset time
  if (now > record.resetAt) {
    otpAttempts.delete(phoneNumber)
    return false
  }

  // Max 3 OTPs per hour
  return record.count >= 3
}

/**
 * Record an OTP attempt for rate limiting
 * @param phoneNumber E.164 format
 */
export function recordOTPAttempt(phoneNumber: string): void {
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const record = otpAttempts.get(phoneNumber)

  if (!record || now > record.resetAt) {
    otpAttempts.set(phoneNumber, { count: 1, resetAt: now + oneHour })
  } else {
    record.count += 1
  }
}
