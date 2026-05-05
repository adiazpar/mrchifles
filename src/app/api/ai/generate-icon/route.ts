import { NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

// Configure fal.ai client at module load instead of per-request.
// fal is a singleton — concurrent requests racing on `fal.config()`
// would technically be safe today (every call passes the same key)
// but the per-request invocation was a footgun for any future
// per-tenant key rotation, and module-scope is faster.
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY })
}
import { errorResponse, withAuth, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { RateLimits } from '@/lib/rate-limit'
import { decodeAndSniffAiImage } from '@/lib/file-sniff'
import { logServerError } from '@/lib/server-logger'

// See identify-product for rationale on these caps.
const MAX_AI_IMAGE_BYTES = 1_500_000
// Cap on the fal.ai response we re-fetch: a misbehaving (or
// compromised) fal endpoint could otherwise stream hundreds of MB
// into Lambda memory before the arrayBuffer() resolved.
const MAX_FAL_RESPONSE_BYTES = 10 * 1024 * 1024

/**
 * POST /api/ai/generate-icon
 *
 * Generates an emoji-style icon from a product image.
 * Uses Nano Banana (Gemini 2.5 Flash Image) on fal.ai.
 *
 * Cost: ~$0.039/image
 * Speed: ~2-5 seconds
 *
 * Request body:
 * { image: string } // base64 encoded image (data URL)
 *
 * Auth: required. Rate limit: shared AI budget (see RateLimits.ai).
 * Content-Length cap: 2 MB (accommodates base64-encoded pre-compressed images).
 */

const MAX_BODY_BYTES = 2 * 1024 * 1024

export const POST = withAuth(async (request, user) => {
  const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
  if (oversize) return oversize

  // See identify-product for the three-layer rationale. generate-icon
  // is the most expensive AI call (~$0.04 each); the daily caps are
  // the primary defense against runaway spend during an Upstash blip.
  const rateLimited = await applyRateLimit(`ai:${user.userId}`, RateLimits.ai)
  if (rateLimited) return rateLimited
  const userDailyLimited = await applyRateLimit(
    `ai-daily:${user.userId}`,
    RateLimits.aiDaily,
    ApiMessageCode.AI_RATE_LIMITED,
  )
  if (userDailyLimited) return userDailyLimited
  const today = new Date().toISOString().slice(0, 10)
  const globalLimited = await applyRateLimit(
    `ai-global:${today}`,
    RateLimits.aiGlobalDaily,
    ApiMessageCode.AI_RATE_LIMITED,
  )
  if (globalLimited) return globalLimited

  try {
    const { image } = await request.json()

    // Decode + content-sniff before forwarding to fal.ai. Same
    // rationale as identify-product — non-image strings still cost
    // the round-trip, and a fal endpoint that's ever pointed at an
    // SSRF-vulnerable resolver would render the typeof check
    // meaningless. Re-encode using the sniffed MIME so the data URL
    // sent to fal can never lie about its payload.
    const sniffResult = decodeAndSniffAiImage(image, MAX_AI_IMAGE_BYTES)
    if (!sniffResult.ok) {
      return errorResponse(ApiMessageCode.AI_IMAGE_REQUIRED, 400)
    }

    if (!process.env.FAL_KEY) {
      return errorResponse(ApiMessageCode.AI_NOT_CONFIGURED, 500)
    }

    // ========================================
    // Generate emoji icon using Nano Banana (Gemini 2.5 Flash Image)
    // Cost: ~$0.039/image
    // Speed: ~2-5 seconds
    // ========================================
    const startTime = Date.now()

    // Use run() instead of subscribe() for faster direct execution (no queue overhead)
    const result = await fal.run('fal-ai/nano-banana/edit', {
      input: {
        prompt:
          'Transform into a clean Apple iOS emoji style icon. Simple centered single object, vibrant saturated colors, cartoon-like, pure white background, stylized like an official Apple emoji. No shadows, no gradients on background.',
        // Use the SNIFFED data URL — never the client-declared one.
        image_urls: [sniffResult.dataUrl],
      },
    })

    const _elapsed = Date.now() - startTime

    // Extract the generated image URL from response
    const images = result.data?.images
    if (!images || images.length === 0 || !images[0].url) {
      logServerError(
        'ai.generate-icon.no-image',
        new Error('fal returned no image in response'),
        { resultData: result.data },
      )
      return errorResponse(ApiMessageCode.AI_ICON_FAILED, 500)
    }

    const imageUrl = images[0].url

    // Fetch the image and convert to base64 data URL for client.
    // Cap the response size so a misbehaving (or compromised) fal
    // endpoint can't OOM the Lambda by streaming hundreds of MB.
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      logServerError(
        'ai.generate-icon.fetch-failed',
        new Error(`fal image fetch returned ${imageResponse.status}`),
      )
      return errorResponse(ApiMessageCode.AI_ICON_FAILED, 500)
    }
    const declaredLength = Number(imageResponse.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_FAL_RESPONSE_BYTES) {
      logServerError(
        'ai.generate-icon.oversize-response',
        new Error(`fal response declared ${declaredLength} bytes, cap is ${MAX_FAL_RESPONSE_BYTES}`),
      )
      return errorResponse(ApiMessageCode.AI_ICON_FAILED, 502)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    if (imageBuffer.byteLength > MAX_FAL_RESPONSE_BYTES) {
      // Defense-in-depth: if Content-Length was missing or a lie,
      // catch oversized payloads after the fact.
      return errorResponse(ApiMessageCode.AI_ICON_FAILED, 502)
    }
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/png'
    const dataUrl = `data:${contentType};base64,${base64}`

    return NextResponse.json({
      success: true,
      data: {
        icon: dataUrl,
      },
    })
  } catch (error) {
    logServerError('ai.generate-icon', error)

    // Check for rate limit
    if (error instanceof Error && (error.message.includes('rate') || error.message.includes('quota'))) {
      return errorResponse(ApiMessageCode.AI_RATE_LIMITED, 429)
    }

    return errorResponse(ApiMessageCode.AI_ICON_FAILED, 500)
  }
})
