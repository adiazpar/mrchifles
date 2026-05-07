import { NextResponse } from 'next/server'
import { errorResponse, withAuth, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { RateLimits } from '@/lib/rate-limit'
import { decodeAndSniffAiImage } from '@/lib/file-sniff'
import { logServerError } from '@/lib/server-logger'

// Decoded image cap for AI inputs. The wrapper Content-Length cap is
// 2 MB on the request envelope; base64 inflates ~33%, so the
// largest legit decoded image is ~1.5 MB. This bound also matches
// what the AI providers can ingest without their own size errors.
const MAX_AI_IMAGE_BYTES = 1_500_000

// Hard cap on the categories array that gets rendered into the
// system prompt. Each category contributes ~10-100 tokens; without
// this, an attacker could pass 10000 entries and 10x the OpenAI
// per-call cost while staying under the per-minute rate limit.
const MAX_CATEGORIES = 100
const MAX_CATEGORY_NAME_LENGTH = 80

const MAX_BODY_BYTES = 2 * 1024 * 1024

interface CategoryInput {
  id: string
  name: string
}

interface IdentifyRequestBody {
  image?: string
  categories?: CategoryInput[]
}

interface IdentifyResult {
  name: string
  categoryId: string | null
  suggestedNewCategoryName: string | null
}

function buildSystemPrompt(categories: CategoryInput[]): string {
  const hasCategories = categories.length > 0
  const categoryList = hasCategories
    ? categories.map((c) => `- ${c.name} (id: ${c.id})`).join('\n')
    : '(none)'

  return `You are a product identification assistant for a small business inventory app.

Analyze the product image and produce:
1. A specific product name in English. Be concrete: include brand, flavor, size, or variant if visible on the label. NEVER return "Product not identified", "Unknown", or any placeholder. If you genuinely cannot read a label, return your best descriptive guess (e.g., "Snack bag", "Glass jar of honey", "Plastic bottle of soda").
2. A category assignment.

The user's existing categories are:
${categoryList}

Category rules — follow strictly:
- STRONGLY PREFER assigning the product to one of the existing categories. Try hard to find a reasonable fit before giving up.
- If exactly one existing category is a reasonable fit, return its id in "categoryId" and set "suggestedNewCategoryName" to null.
- ONLY if no existing category is a reasonable fit (or the list is empty), return "categoryId": null and propose a short, generic, reusable category name (1-3 words, English, title case) in "suggestedNewCategoryName".
- Never invent a categoryId that is not in the list above.

Respond with ONLY valid JSON in this exact shape:
{"name": "...", "categoryId": "..." | null, "suggestedNewCategoryName": "..." | null}`
}

function validateResult(parsed: unknown, categories: CategoryInput[]): IdentifyResult {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Response is not an object')
  }
  const obj = parsed as Record<string, unknown>
  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  if (!name) throw new Error('Missing name')

  const rawCategoryId = obj.categoryId
  const rawSuggested = obj.suggestedNewCategoryName

  const categoryId =
    typeof rawCategoryId === 'string' && categories.some((c) => c.id === rawCategoryId)
      ? rawCategoryId
      : null
  const suggestedNewCategoryName =
    typeof rawSuggested === 'string' && rawSuggested.trim().length > 0
      ? rawSuggested.trim()
      : null

  // Exactly one of categoryId / suggestedNewCategoryName must be set.
  // If model returned neither (or both), fall back deterministically:
  // - If categories exist, force suggestedNewCategoryName to "Uncategorized item" so the user can correct it.
  // - If no categories exist, ensure suggestedNewCategoryName is set.
  if (categoryId && !suggestedNewCategoryName) {
    return { name, categoryId, suggestedNewCategoryName: null }
  }
  if (!categoryId && suggestedNewCategoryName) {
    return { name, categoryId: null, suggestedNewCategoryName }
  }
  // Neither set, or both set — fall back.
  return {
    name,
    categoryId: null,
    suggestedNewCategoryName: suggestedNewCategoryName || 'Miscellaneous',
  }
}

export const POST = withAuth(async (request, user) => {
  const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
  if (oversize) return oversize

  // Three-layer cost protection:
  //   1. Per-minute per-user (existing): smooths bursts.
  //   2. Per-day per-user: caps daily spend per account so registering
  //      fresh accounts to bypass the per-minute limit still hits a
  //      ceiling. failClosed.
  //   3. Global per-day: hard kill-switch on total deployment spend
  //      (~$500/day budget at $0.04/call for icon generation). Trips
  //      before fal.ai/OpenAI invoices ever reach four figures.
  // Order matters: cheapest check first (per-minute, in-memory cache
  // for active accounts).
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
    const body = (await request.json()) as IdentifyRequestBody
    const image = body.image
    // Cap categories first (truncate, don't reject — the prompt is
    // still useful with the first 100). Each name is also truncated
    // so a single 1 MB string can't blow up the prompt.
    const rawCategories: CategoryInput[] = Array.isArray(body.categories)
      ? body.categories.filter(
          (c): c is CategoryInput =>
            !!c && typeof c.id === 'string' && typeof c.name === 'string'
        )
      : []
    const categories = rawCategories.slice(0, MAX_CATEGORIES).map((c) => ({
      id: c.id.slice(0, 64),
      name: c.name.slice(0, MAX_CATEGORY_NAME_LENGTH),
    }))

    if (!image) {
      return errorResponse(ApiMessageCode.AI_IMAGE_REQUIRED, 400)
    }

    // Decode + content-sniff the image BEFORE forwarding to OpenAI.
    // Without this the route accepted any string and burned tokens
    // (and our budget) on the round trip. Re-encode using the
    // sniffed MIME so OpenAI sees a payload whose prefix matches.
    const sniffResult = decodeAndSniffAiImage(image, MAX_AI_IMAGE_BYTES)
    if (!sniffResult.ok) {
      return errorResponse(ApiMessageCode.AI_IMAGE_REQUIRED, 400)
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return errorResponse(ApiMessageCode.AI_NOT_CONFIGURED, 500)
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSystemPrompt(categories) },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify this product. Return only JSON.' },
              {
                type: 'image_url',
                image_url: {
                  // Use the re-encoded data URL whose MIME matches the
                  // sniffed bytes — never the client-declared prefix.
                  url: sniffResult.dataUrl,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 150,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // Upstream error body is provider-controlled and may include
      // request echoes; route through the safe-logger so the prod
      // log only shows the tag, not the body.
      logServerError(
        'ai.identify-product.openai-error',
        new Error(`openai responded ${response.status}`),
        { errorData },
      )
      return errorResponse(ApiMessageCode.AI_IDENTIFY_FAILED, 500)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return errorResponse(ApiMessageCode.AI_IDENTIFY_FAILED, 500)
    }

    try {
      const cleanContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      const parsed = JSON.parse(cleanContent)
      const result = validateResult(parsed, categories)
      return NextResponse.json({ success: true, data: result })
    } catch (err) {
      // `content` is the raw model output; pass via context so it's
      // available in dev but dropped in prod (could contain user-
      // provided text from the categories prompt).
      logServerError('ai.identify-product.parse-failed', err, { content })
      return errorResponse(ApiMessageCode.AI_IDENTIFY_FAILED, 500)
    }
  } catch (error) {
    logServerError('ai.identify-product', error)
    return errorResponse(ApiMessageCode.INTERNAL_ERROR, 500)
  }
})
