import { NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import sharp from 'sharp'

// Configure fal.ai client at module load instead of per-request.
// fal is a singleton — concurrent requests racing on `fal.config()`
// would technically be safe today (every call passes the same key)
// but the per-request invocation was a footgun for any future
// per-tenant key rotation, and module-scope is faster.
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY })
}
import { errorResponse, withAuth, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { RateLimits } from '@/lib/rate-limit'
import { decodeAndSniffAiImage } from '@/lib/file-sniff'
import { logServerError } from '@/lib/server-logger'

// See identify-product for rationale on these caps.
const MAX_AI_IMAGE_BYTES = 1_500_000
// Cap on the fal.ai response we re-fetch: a misbehaving (or
// compromised) fal endpoint could otherwise stream hundreds of MB
// into Lambda memory before the arrayBuffer() resolved.
const MAX_FAL_RESPONSE_BYTES = 10 * 1024 * 1024
// Bound the icon we return so /api/ai/remove-background (2 MB body cap)
// can always accept it. Nano Banana sometimes emits 1024×1024 PNGs that
// exceed 2 MB raw — large product photos with busy color landed callers
// in a 413 loop on remove-bg. JPEG is fine here: the prompt forces a
// pure white background, and the next stage's job is to mask it out.
const MAX_ICON_DIMENSION = 768
const ICON_JPEG_QUALITY = 85
// Sharp's default limitInputPixels is ~268M. Tighten to 16M (4096×4096)
// — defense against a decompression-bomb PNG masquerading as Nano Banana
// output. Matches the cap used in remove-background.
const SHARP_PIXEL_LIMIT = 16_777_216

// Locked target aesthetic for every product icon: Microsoft Fluent /
// Notion flat. Built from Google's official sticker/icon template
// (https://ai.google.dev/gemini-api/docs/image-generation):
//   "A [style] sticker of a [subject], featuring [key characteristics]
//    and a [color palette]. The design should have [line style] and
//    [shading style]. The background must be white."
//
// Edit-mode variant — opens with a strong restyle verb (per the
// Google Developers Blog edit-mode guidance), names two concrete
// style anchors the model has strong learned priors for, and
// explicitly forbids photo-realistic preservation. The anti-photo
// clause matters: Nano Banana otherwise leaves clean marketing
// renders nearly untouched because it reads them as "already iconic."
//
// Identity-fidelity guards (silhouette/proportions/distinctive
// features/color palette + an explicit "do not invent" enumeration)
// sit BEFORE the restyle license so identity reads as a constraint
// the restyle must honor. Without them the model hallucinated new
// structural hardware (a second gantry column, an invented filament
// dock) on machinery-rich inputs.
//
// Known trade-off accepted with this prompt: on clean source images
// (marketing renders, official product photos with simple backgrounds)
// the model sometimes reads the input as already satisfying the
// fidelity constraints and returns the source nearly unchanged. We
// prefer this passthrough failure mode to the alternative — invented
// hardware that misrepresents the product — because a stylized-but-
// faithful photograph is still a usable product icon, whereas a
// confidently-rendered icon with the wrong structural detail is not.
// The proper architectural fix is reference-image grounding (passing
// known-good icons as Nano Banana edit references), not more prompt
// language.
//
// White background is mandatory — the model cannot produce
// transparency; BiRefNet strips the white downstream.
const ICON_PROMPT =
  'Recreate the main object from this photograph as a flat, modern ' +
  'emoji-style product icon in the visual language of Microsoft Fluent ' +
  'emoji and Notion product icons. Keep the object\'s identity intact: ' +
  'match its overall silhouette and proportions, preserve the ' +
  'characteristic features that identify this specific kind of product ' +
  '(a dial, a spout, a distinctive arm, a screen, a unique frame shape), ' +
  'and stay faithful to its dominant color palette. Do not invent new ' +
  'structural elements (extra columns, posts, arms, handles, attachments, ' +
  'accessories) that are not visible in the source, and do not introduce ' +
  'colors that the source does not have. With identity fixed, redraw the ' +
  'rendering style from scratch: render the subject as a single, centered ' +
  'illustration with clean geometric forms, 2–3 flat color tones, soft ' +
  'cel-shading, gentle inner highlights, and a vibrant saturated ' +
  'interpretation of the source colors. Strip away all packaging text, ' +
  'labels, hands, backgrounds, props, photographic lighting, and realistic ' +
  'texture. The subject should fill roughly 75% of the frame, perfectly ' +
  'centered, and remain easily recognizable at small icon sizes. The ' +
  'background must be a flat pure white (#FFFFFF) with nothing else in the ' +
  'frame. The output must not be a photograph or realistic 3D render of ' +
  'the source — only a stylized flat illustration that faithfully ' +
  'represents the original object\'s shape and color.'

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
        prompt: ICON_PROMPT,
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

    // Resize + re-encode so the icon fits comfortably inside the next
    // route's body cap. JPEG is intentional — the prompt mandates a
    // pure white background, and BiRefNet will discard it anyway.
    const boundedBuffer = await sharp(Buffer.from(imageBuffer), {
      limitInputPixels: SHARP_PIXEL_LIMIT,
    })
      .resize(MAX_ICON_DIMENSION, MAX_ICON_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: ICON_JPEG_QUALITY })
      .toBuffer()

    const base64 = boundedBuffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64}`

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
