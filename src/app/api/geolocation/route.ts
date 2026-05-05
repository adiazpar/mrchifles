import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geolocation
 * Returns the user's geolocation based on Vercel's edge headers.
 *
 * SECURITY NOTE (audit L-14): the `x-vercel-ip-*` headers are set by
 * Vercel at the edge and CANNOT be sent by the client when the
 * request goes through Vercel's network. On any non-Vercel deploy
 * (self-hosted, docker, etc.) these headers ARE spoofable. The
 * values returned here are used only for hint data on the
 * create-business locale picker — they never authorize or authenticate
 * anything. Do NOT use this data to make security decisions; if you
 * need a verified country code, integrate a proper IP-geolocation
 * service that authenticates the source.
 */
export async function GET(request: NextRequest) {
  // Vercel automatically provides these headers at the edge.
  const country = request.headers.get('x-vercel-ip-country') || null
  const region = request.headers.get('x-vercel-ip-country-region') || null
  const city = request.headers.get('x-vercel-ip-city') || null
  const timezone = request.headers.get('x-vercel-ip-timezone') || null

  return NextResponse.json({
    country,
    region,
    city,
    timezone,
  })
}
