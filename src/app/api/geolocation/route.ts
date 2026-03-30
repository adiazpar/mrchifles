import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/geolocation
 * Returns the user's geolocation based on Vercel's edge headers
 */
export async function GET(request: NextRequest) {
  // Vercel automatically provides these headers at the edge
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
