import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { sendInviteViaWhatsApp, isTwilioConfigured } from '@/lib/twilio'
import { isValidE164 } from '@/lib/countries'
import type { InviteRole } from '@/types'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

/**
 * POST /api/invite/send-whatsapp
 *
 * Send invite code via WhatsApp. Owner only.
 *
 * Body: { phoneNumber: "+51987654321", inviteCode: "ABC123", role: "employee" }
 * Headers: { Authorization: "Bearer <token>" }
 * Response: { success: true } or { error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify user is owner
    const pb = new PocketBase(POCKETBASE_URL)
    pb.authStore.save(token, null)

    try {
      const authData = await pb.collection('users').authRefresh()
      const user = authData.record

      if (user.role !== 'owner') {
        return NextResponse.json(
          { error: 'Solo el dueno puede enviar invitaciones' },
          { status: 403 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Sesion invalida' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { phoneNumber, inviteCode, role } = body as {
      phoneNumber: string
      inviteCode: string
      role: InviteRole
    }

    // Validate phone number
    if (!phoneNumber || !isValidE164(phoneNumber)) {
      return NextResponse.json(
        { error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Check if phone number is already registered
    try {
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `phoneNumber = "${phoneNumber}"`,
      })
      if (existingUsers.totalItems > 0) {
        return NextResponse.json(
          { error: 'Este numero ya esta registrado en la app' },
          { status: 400 }
        )
      }
    } catch {
      // If check fails, continue anyway - registration will catch duplicates
      console.warn('Could not check for existing phone number')
    }

    // Validate invite code format
    if (!inviteCode || !/^[A-Z0-9]{6}$/.test(inviteCode)) {
      return NextResponse.json(
        { error: 'Codigo de invitacion invalido' },
        { status: 400 }
      )
    }

    // Validate role
    if (!role || !['partner', 'employee'].includes(role)) {
      return NextResponse.json(
        { error: 'Rol invalido' },
        { status: 400 }
      )
    }

    // Send invite via WhatsApp
    if (isTwilioConfigured()) {
      const result = await sendInviteViaWhatsApp(phoneNumber, inviteCode, role)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }
    } else {
      // In development without Twilio, log the invite
      const roleLabel = role === 'partner' ? 'Socio' : 'Empleado'
      console.warn(`[DEV] Invite for ${phoneNumber}: Role=${roleLabel}, Code=${inviteCode}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending WhatsApp invite:', error)
    return NextResponse.json(
      { error: 'Error al enviar la invitacion' },
      { status: 500 }
    )
  }
}
