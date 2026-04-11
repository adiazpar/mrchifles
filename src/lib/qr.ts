/**
 * QR code generation utilities.
 */

'use client'

import bwipjs from 'bwip-js/browser'

const QR_OPTIONS = {
  bcid: 'qrcode',
  scale: 5,
  padding: 10,
  backgroundcolor: 'FFFFFF',
  barcolor: '0F172A',
}

/**
 * Generate a QR code data URL for an invite code.
 * @param inviteCode - The 6-character invite code
 * @returns Promise resolving to a data URL for the QR code image
 */
export async function generateInviteQRCode(inviteCode: string): Promise<string> {
  const registrationUrl = `${window.location.origin}/invite?code=${inviteCode}`
  const canvas = document.createElement('canvas')
  bwipjs.toCanvas(canvas, { ...QR_OPTIONS, text: registrationUrl })
  return canvas.toDataURL('image/png')
}
