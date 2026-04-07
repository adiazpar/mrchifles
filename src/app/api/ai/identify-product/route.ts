import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IdentifyRequestBody
    const image = body.image
    const categories: CategoryInput[] = Array.isArray(body.categories)
      ? body.categories.filter(
          (c): c is CategoryInput =>
            !!c && typeof c.id === 'string' && typeof c.name === 'string'
        )
      : []

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API not configured' },
        { status: 500 }
      )
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
                  url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
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
      console.error('OpenAI API error:', errorData)
      return NextResponse.json(
        { success: false, error: 'Failed to analyze image' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Could not identify product' },
        { status: 500 }
      )
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
      console.error('Failed to parse GPT response:', content, err)
      return NextResponse.json(
        { success: false, error: 'Failed to process response' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in identify-product:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
