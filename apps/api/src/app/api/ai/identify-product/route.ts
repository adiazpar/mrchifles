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

// Cap on the price the model is allowed to return. Anything above this
// is treated as a hallucination and coerced to null — better to leave
// the field blank than to prefill an absurd number the owner may
// rubber-stamp.
const MAX_AI_PRICE = 100_000

// ISO 4217 currency codes are 3 ASCII letters. The prompt-injection
// surface here is the system prompt, so we accept only the canonical
// shape; anything else is dropped and we fall back to "USD".
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/
// Locale strings come from the client (e.g. "en-US", "es-PE", "ja-JP")
// and get rendered into the prompt. Cap length and restrict to the
// IETF BCP 47 character set to keep prompt content predictable.
const LOCALE_PATTERN = /^[A-Za-z0-9-]{2,20}$/

interface CategoryInput {
  id: string
  name: string
}

interface IdentifyRequestBody {
  image?: string
  categories?: CategoryInput[]
  locale?: string
  currency?: string
}

interface IdentifyResult {
  name: string
  categoryId: string | null
  suggestedNewCategoryName: string | null
  price: number | null
}

function buildSystemPrompt(
  categories: CategoryInput[],
  locale: string,
  currency: string,
): string {
  const hasCategories = categories.length > 0
  const categoryList = hasCategories
    ? categories.map((c) => `- ${c.name} (id: ${c.id})`).join('\n')
    : '(none)'

  return `You are a product identification assistant for a small business inventory app.

Analyze the image and produce:
1. A specific name in English. The image may show a packaged product, a fresh/loose item, or something that isn't a typical retail product at all — in EVERY case you MUST return a non-empty descriptive name. Examples by image type:
   * Packaged product with a readable label: include brand, flavor, size, or variant ("Lay's Classic Chips 1.5oz", "Coca-Cola Zero 355ml").
   * Packaged product without a readable label: describe the form ("Snack bag", "Glass jar of honey", "Plastic bottle of soda").
   * Fresh/loose produce, plants, or flowers: describe what you see ("Bouquet of mixed flowers", "Potted succulent", "Bunch of ripe bananas").
   * Non-product photos (person, scenery, pet, document, blurry frame): describe the subject ("Person in blue shirt", "Empty wooden table", "Out-of-focus photo"). Small businesses sometimes test the camera before scanning a real product — your job is to label what is in the frame, not to refuse.
   ABSOLUTELY NEVER return an empty string, null, "Unknown", "Product not identified", "Cannot identify", or any other placeholder for the name. Returning nothing is not an option — pick the best descriptive label you can and return it.
2. A category assignment.
3. A typical retail price.

The user's existing categories are:
${categoryList}

Category rules — follow strictly:
- STRONGLY PREFER assigning the product to one of the existing categories. Try hard to find a reasonable fit before giving up.
- If exactly one existing category is a reasonable fit, return its id in "categoryId" and set "suggestedNewCategoryName" to null.
- ONLY if no existing category is a reasonable fit (or the list is empty), return "categoryId": null and propose a short, generic, reusable category name (1-3 words, English, title case) in "suggestedNewCategoryName".
- Never invent a categoryId that is not in the list above.

Price rules — follow strictly. Default to null. Only return a number when you are highly confident in BOTH the identification and the price:
- The business sells in ${currency} (locale ${locale}). Return the price as a positive number expressed in that currency, with NO currency symbol and NO thousands separators.
- Estimate a typical retail price a small shop in that region would charge for this exact product. Use your knowledge of the brand, package size, and regional pricing.
- Identification gate — return null if ANY of the following is true:
  * Your product name is fewer than 2 words.
  * Your product name does NOT contain both a recognizable brand AND a specific model/variant/flavor/size identifier. ("A1" alone, "Chips", "Soda", "Bottle" are NOT enough; "Bambu Lab A1 Mini", "Lay's Classic Chips 1.5oz", "Coca-Cola Zero 355ml" ARE).
  * You inferred the product from packaging shape, color, or general appearance rather than reading a clear brand/model label.
  * You are guessing at any part of the product (brand, model, size, variant). Guessing means you don't know — return null.
  * You used a fallback descriptive name like "Snack bag", "Glass jar of honey", "Plastic bottle of soda".
- Region gate — return null if you have no concrete pricing signal for this product in ${currency} (e.g., a niche product whose price in ${currency} you would have to extrapolate from a different market).
- Price range sanity — return null if the plausible retail range for this exact product spans more than 3x (e.g., $10 to $40). Wide ranges mean low confidence.
- Never return 0, negative numbers, or values above ${MAX_AI_PRICE}.
- A null price is strictly better than a wrong one. The owner will see the prefilled value and may not double-check. When in any doubt, return null.

Respond with ONLY valid JSON in this exact shape:
{"name": "...", "categoryId": "..." | null, "suggestedNewCategoryName": "..." | null, "price": <number> | null}`
}

// Fallback name returned when the model — despite the prompt forbidding
// it — sends back an empty/missing/placeholder name. Kept in English to
// match the existing "Miscellaneous" category fallback below; the client
// renders it verbatim and the owner will rename on the review screen.
// The whole point of the fallback is that the pipeline never face-plants
// just because GPT refused to label a photo: the user lands on Review
// and edits like normal.
const FALLBACK_NAME = 'Untitled product'

function validateResult(parsed: unknown, categories: CategoryInput[]): IdentifyResult {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Response is not an object')
  }
  const obj = parsed as Record<string, unknown>
  const rawName = typeof obj.name === 'string' ? obj.name.trim() : ''
  // Model is instructed never to return placeholders, but it does anyway
  // on flowers, scenery, blurry frames, etc. Treat known placeholders as
  // missing so we fall back instead of leaking them into the form.
  const isPlaceholder =
    /^(unknown|product not identified|cannot identify|not identified|n\/?a|none)$/i.test(rawName)
  const name = !rawName || isPlaceholder ? FALLBACK_NAME : rawName

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

  // Price is intentionally lenient: any value that isn't a finite,
  // strictly-positive number inside the cap collapses to null. We'd
  // rather leave the field blank than prefill a hallucination the
  // owner may rubber-stamp without checking.
  const rawPrice = obj.price
  const price =
    typeof rawPrice === 'number' &&
    Number.isFinite(rawPrice) &&
    rawPrice > 0 &&
    rawPrice <= MAX_AI_PRICE
      ? rawPrice
      : null

  // Exactly one of categoryId / suggestedNewCategoryName must be set.
  // If model returned neither (or both), fall back deterministically:
  // - If categories exist, force suggestedNewCategoryName to "Uncategorized item" so the user can correct it.
  // - If no categories exist, ensure suggestedNewCategoryName is set.
  if (categoryId && !suggestedNewCategoryName) {
    return { name, categoryId, suggestedNewCategoryName: null, price }
  }
  if (!categoryId && suggestedNewCategoryName) {
    return { name, categoryId: null, suggestedNewCategoryName, price }
  }
  // Neither set, or both set — fall back.
  return {
    name,
    categoryId: null,
    suggestedNewCategoryName: suggestedNewCategoryName || 'Miscellaneous',
    price,
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

    const locale =
      typeof body.locale === 'string' && LOCALE_PATTERN.test(body.locale)
        ? body.locale
        : 'en-US'
    const currency =
      typeof body.currency === 'string' && CURRENCY_PATTERN.test(body.currency)
        ? body.currency.toUpperCase()
        : 'USD'

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
          { role: 'system', content: buildSystemPrompt(categories, locale, currency) },
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
      // Surface upstream quota / billing exhaustion as a distinct
      // envelope so the UI can tell the owner the AI service ran out
      // of credits (a deployment-wide condition) vs. a transient
      // identification failure they could retry. OpenAI returns 429
      // with `error.code === 'insufficient_quota'` for billing limits
      // (we treat token credits / monthly cap the same way) and a
      // bare 429 with `rate_limit_exceeded` for short-window throttling.
      const openaiError =
        errorData && typeof errorData === 'object' && 'error' in errorData
          ? (errorData as { error?: { code?: unknown; type?: unknown } }).error
          : null
      const errorCode =
        openaiError && typeof openaiError.code === 'string' ? openaiError.code : ''
      const errorType =
        openaiError && typeof openaiError.type === 'string' ? openaiError.type : ''
      if (
        response.status === 429 &&
        (errorCode === 'insufficient_quota' || errorType === 'insufficient_quota')
      ) {
        return errorResponse(ApiMessageCode.AI_QUOTA_EXHAUSTED, 503)
      }
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
