# AI Product Pipeline Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the AI product creation pipeline so it (1) reliably picks an existing user category or suggests a new one, (2) captures a barcode as a second photo step (scan/generate/skip), and (3) consolidates the duplicated product form JSX into a single shared component.

**Architecture:** Two parallel changes share one consolidated form. The AI flow becomes a 2-photo wizard (product photo → barcode step → analyzing → optional suggested-category step → form). The product form is extracted from `AddProductModal` (steps 1 and 3) and `EditProductModal` (step 0) into a shared `<ProductForm />` component. Identification API gains category-awareness and an English prompt.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Drizzle/Turso, Vitest. Existing libraries: `html5-qrcode` (already wired via `useBarcodeScan`), `bwip-js` (already wired via `renderBarcodeSvg` and `generateInternalProductBarcode`), OpenAI GPT-4o Mini, fal.ai (Nano Banana, BiRefNet).

**Spec:** `.claude/docs/plans/2026-04-07-ai-pipeline-improvements-design.md`

---

## File Structure

**New files:**
- `src/components/products/ProductForm.tsx` — shared form JSX (icon picker + name + price + category + active toggle + barcode tab) consumed by Add (manual step), Add (AI-prefilled step), and Edit.
- `src/components/products/AiBarcodeStep.tsx` — wrapper that renders `BarcodeFields` inside an instructional step layout for the AI flow, with explicit "Skip" / "Continue" footer.
- `src/components/products/SuggestedCategoryStep.tsx` — renders the AI-suggested new category name as an editable input with "Create" and "Pick existing" actions.

**Modified files:**
- `src/app/api/ai/identify-product/route.ts` — accepts `categories[]`, English prompt, returns `{ name, categoryId | null, suggestedNewCategoryName | null }`, Zod-style runtime validation.
- `src/hooks/useAiProductPipeline.ts` — `startPipeline(imageBase64, { categories })` plumbs categories through; `PipelineResult` gains `categoryId` and `suggestedNewCategoryName`.
- `src/components/products/AddProductModal.tsx` — restructured step flow: 0 entry / 1 product photo / 2 barcode step / 3 analyzing / 4 suggested category (conditional) / 5 form / 6 success. Uses `<ProductForm />` for step 5.
- `src/components/products/EditProductModal.tsx` — uses `<ProductForm />` for step 0.
- `src/app/[businessId]/products/page.tsx` — passes `categories` into pipeline; on completion, populates form context (name, categoryId, icon); routes to suggested-category step when needed; handles new-category creation.
- `.claude/docs/ai-product-pipeline.md` — updated to document the new two-photo flow and new identify-product schema.

**Out of scope:** Schema changes, price detection, sales register, EditProductModal step structure beyond extracting the form JSX.

---

## Task 1: Update identify-product route — accept categories, English prompt, new response shape

**Files:**
- Modify: `src/app/api/ai/identify-product/route.ts` (full rewrite of the route handler)

- [ ] **Step 1: Replace the route file with category-aware English version**

```ts
// src/app/api/ai/identify-product/route.ts
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
```

- [ ] **Step 2: Manually verify the route compiles**

Run: `npm run lint -- --max-warnings=0 src/app/api/ai/identify-product/route.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/identify-product/route.ts
git commit -m "feat(ai): identify-product accepts categories, English prompt, new schema"
```

---

## Task 2: Update useAiProductPipeline — plumb categories, return categoryId/suggestedNewCategoryName

**Files:**
- Modify: `src/hooks/useAiProductPipeline.ts:17-19` (response type), `:39-44` (PipelineResult), `:303-422` (startPipeline signature + payload + result mapping)

- [ ] **Step 1: Update the response type**

Replace lines 17-19:

```ts
type IdentifyProductResponse = ApiResponse & {
  data: {
    name: string
    categoryId: string | null
    suggestedNewCategoryName: string | null
  }
}
```

- [ ] **Step 2: Extend PipelineResult**

Replace lines 39-44:

```ts
export interface PipelineResult {
  name: string
  categoryId: string | null
  suggestedNewCategoryName: string | null
  iconPreview: string      // base64 data URL
  iconBlob: Blob
  cachedBgRemoved: string  // For regeneration
}
```

- [ ] **Step 3: Add categories to PipelineOptions**

Replace lines 52-55:

```ts
interface PipelineOptions {
  /** Skip background removal steps (much faster on mobile, but icons have white bg) */
  skipBgRemoval?: boolean
  /** User's existing categories — passed to identify-product so the model can match */
  categories?: { id: string; name: string }[]
}
```

- [ ] **Step 4: Pass categories into the identify request and propagate result fields**

In `startPipeline`, replace the `Promise.all` call (around lines 324-337) and the success `setState` (around lines 386-396):

```ts
const [identifyResult, iconResult] = await Promise.all([
  apiPost<IdentifyProductResponse>(
    '/api/ai/identify-product',
    { image: imageBase64, categories: options?.categories ?? [] },
    { signal }
  ),
  apiPost<GenerateIconResponse>(
    '/api/ai/generate-icon',
    { image: imageBase64 },
    { signal }
  ),
])
```

And the success setState:

```ts
setState({
  step: 'complete',
  error: null,
  result: {
    name: identifyResult.data.name,
    categoryId: identifyResult.data.categoryId,
    suggestedNewCategoryName: identifyResult.data.suggestedNewCategoryName,
    iconPreview: transparentIconBase64,
    iconBlob: transparentIconBlob,
    cachedBgRemoved: imageBase64,
  },
})
```

(The intermediate `const productName = identifyResult.data.name` line is no longer needed — delete it.)

- [ ] **Step 5: Update regenerateIcon's PipelineResult to include the new fields**

In `regenerateIcon`, the local `result` (around line 497) and the `setState` that follows must include `categoryId` and `suggestedNewCategoryName` carried over from the previous result:

```ts
const result: PipelineResult = {
  name: '',
  categoryId: null,
  suggestedNewCategoryName: null,
  iconPreview: transparentIconBase64,
  iconBlob: transparentIconBlob,
  cachedBgRemoved: cachedBgRemoved,
}

setState(prev => ({
  ...prev,
  step: 'complete',
  error: null,
  result: {
    ...result,
    name: prev.result?.name || '',
    categoryId: prev.result?.categoryId ?? null,
    suggestedNewCategoryName: prev.result?.suggestedNewCategoryName ?? null,
  },
}))

return {
  ...result,
  name: state.result?.name || '',
  categoryId: state.result?.categoryId ?? null,
  suggestedNewCategoryName: state.result?.suggestedNewCategoryName ?? null,
}
```

(Note: the existing return value pattern is preserved — we just enrich it.)

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npm run lint -- src/hooks/useAiProductPipeline.ts`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useAiProductPipeline.ts
git commit -m "feat(ai): pipeline plumbs categories, returns categoryId/suggestedNewCategoryName"
```

---

## Task 3: Extract ProductForm component (icon, name, price, category, active, barcode tabs)

**Files:**
- Create: `src/components/products/ProductForm.tsx`

This component is a **pure JSX extraction** of the duplicated form blocks in `AddProductModal` step 1 / step 3 and `EditProductModal` step 0. It pulls all state from `useProductForm` (no new props for state), and accepts only the items that vary between consumers.

- [ ] **Step 1: Create the file**

```tsx
// src/components/products/ProductForm.tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Minus } from 'lucide-react'
import { BarcodeFields } from './BarcodeFields'
import { ImageAttachIcon } from '@/components/icons'
import { PRESET_ICONS, isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { TabContainer } from '@/components/ui'
import { useProductForm } from '@/contexts/product-form-context'
import type { ProductCategory } from '@/types'

export interface ProductFormProps {
  /** User's categories for the category select */
  categories: ProductCategory[]
  /** Stable id prefix so add/edit/AI variants don't collide on input ids */
  idPrefix: string
  /** Whether the modal/parent is currently open — used to reset the active tab on open */
  isOpen: boolean
  /** Whether to show the Active toggle (hidden in the AI review variant historically; we now show it everywhere) */
  showActiveToggle?: boolean
}

export function ProductForm({
  categories,
  idPrefix,
  isOpen,
  showActiveToggle = true,
}: ProductFormProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'barcode'>('details')

  useEffect(() => {
    if (isOpen) setActiveTab('details')
  }, [isOpen])

  const {
    name,
    setName,
    price,
    setPrice,
    categoryId,
    setCategoryId,
    active,
    setActive,
    iconPreview,
    setIconPreview,
    setGeneratedIconBlob,
    setIconType,
    setPresetEmoji,
    presetEmoji,
    clearIcon,
  } = useProductForm()

  return (
    <>
      <div className="section-tabs section-tabs--modal morph-item">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`section-tab ${activeTab === 'details' ? 'section-tab-active' : ''}`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('barcode')}
          className={`section-tab ${activeTab === 'barcode' ? 'section-tab-active' : ''}`}
        >
          Barcode
        </button>
      </div>

      <TabContainer
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'details' | 'barcode')}
        swipeable
      >
        <TabContainer.Tab id="details">
          {/* Icon picker */}
          <div className="modal-item">
            <label className="label">Icon</label>
            <div className="flex items-center gap-3">
              <div className="input-height aspect-square rounded-lg overflow-hidden bg-bg-muted flex items-center justify-center flex-shrink-0">
                {iconPreview && isPresetIcon(iconPreview) ? (
                  (() => {
                    const p = getPresetIcon(iconPreview)
                    return p ? <p.icon size={28} className="text-text-primary" /> : null
                  })()
                ) : iconPreview ? (
                  <Image
                    src={iconPreview}
                    alt="Product icon"
                    width={53}
                    height={53}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <ImageAttachIcon size={28} className="text-text-tertiary" />
                )}
              </div>
              <div className="w-px self-stretch bg-border flex-shrink-0" />
              <div className="input-height flex-1 min-w-0 rounded-lg bg-bg-muted overflow-hidden flex items-center">
                <div className="h-full flex items-center gap-3 px-3 overflow-x-auto scrollbar-hidden">
                  {PRESET_ICONS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (presetEmoji === preset.id) {
                          clearIcon()
                          return
                        }
                        setIconPreview(preset.id)
                        setGeneratedIconBlob(null)
                        setIconType('preset')
                        setPresetEmoji(preset.id)
                      }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${presetEmoji === preset.id ? 'bg-brand-subtle ring-2 ring-brand' : 'hover:bg-brand-subtle'}`}
                    >
                      <preset.icon
                        size={28}
                        className={presetEmoji === preset.id ? 'text-text-primary' : 'text-text-tertiary'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-text-tertiary">
                {!iconPreview
                  ? 'No icon'
                  : presetEmoji
                  ? `Preset ${PRESET_ICONS.findIndex((p) => p.id === presetEmoji) + 1}`
                  : 'Custom'}
              </span>
              <button
                type="button"
                onClick={() => clearIcon()}
                disabled={!iconPreview}
                className="text-sm text-error hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="modal-item">
            <label htmlFor={`${idPrefix}-name`} className="label">
              Name <span className="text-error">*</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="E.g.: Large Chips"
              autoComplete="off"
            />
          </div>

          {/* Price + Category */}
          <div className="modal-item">
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor={`${idPrefix}-price`} className="label">
                  Price ($) <span className="text-error">*</span>
                </label>
                <div className="input-number-wrapper">
                  <input
                    id={`${idPrefix}-price`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    onBlur={() => {
                      const num = parseFloat(price)
                      if (!isNaN(num)) setPrice(num.toFixed(2))
                    }}
                    className="input"
                    placeholder="0.00"
                  />
                  <div className="input-number-spinners">
                    <button
                      type="button"
                      className="input-number-spinner"
                      onClick={() => {
                        const current = parseFloat(price) || 0
                        setPrice((current + 1).toFixed(2))
                      }}
                      tabIndex={-1}
                      aria-label="Increase price"
                    >
                      <Plus />
                    </button>
                    <button
                      type="button"
                      className="input-number-spinner"
                      onClick={() => {
                        const current = parseFloat(price) || 0
                        setPrice(Math.max(0, current - 1).toFixed(2))
                      }}
                      tabIndex={-1}
                      aria-label="Decrease price"
                    >
                      <Minus />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor={`${idPrefix}-category`} className="label">Category</label>
                <select
                  id={`${idPrefix}-category`}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`input ${categoryId === '' ? 'select-placeholder' : ''}`}
                >
                  <option value="">N/A</option>
                  {categories
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {showActiveToggle && (
            <div className="modal-item">
              <div className="flex items-center justify-between">
                <div>
                  <span className="label mb-0">Active</span>
                  <span className="text-sm text-text-tertiary leading-tight">
                    Toggles visibility in sales page
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="toggle"
                />
              </div>
            </div>
          )}
        </TabContainer.Tab>

        <TabContainer.Tab id="barcode">
          <div className="modal-item">
            <BarcodeFields />
          </div>
        </TabContainer.Tab>
      </TabContainer>
    </>
  )
}
```

**Note on `modal-item` vs `<Modal.Item>`:** `Modal.Item` and `Modal.Footer` must remain direct children of `Modal.Step` per `.claude/docs/modal-system.md`. The form is rendered *inside* a `Modal.Step` by its consumers, but the form itself is not a direct child — so it cannot use `Modal.Item`. We use a plain `div.modal-item` with the same styling class.

- [ ] **Step 2: Verify the `modal-item` class exists in globals.css**

Run: `grep -n "modal-item" src/app/globals.css`
Expected: at least one match defining `.modal-item`. If it doesn't exist, add a minimal alias by inspecting how `<Modal.Item>` renders (most likely it wraps children in a `<div className="modal-item">`). If `Modal.Item` uses inline styling instead of a class, replace `<div className="modal-item">` in `ProductForm.tsx` with the equivalent inline style.

Verification command:
```bash
grep -rn "modal-item" src/components/ui/Modal* src/app/globals.css
```

If no class exists, open `src/components/ui/Modal.tsx` (or wherever `Modal.Item` is defined), copy its rendered class/style, and apply it inline in `ProductForm.tsx`.

- [ ] **Step 3: Lint the new file**

Run: `npm run lint -- src/components/products/ProductForm.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/products/ProductForm.tsx
git commit -m "feat(products): extract shared ProductForm component"
```

---

## Task 4: Replace AddProductModal step 1 (manual form) JSX with `<ProductForm />`

**Files:**
- Modify: `src/components/products/AddProductModal.tsx:230-429`

- [ ] **Step 1: Replace step 1 contents**

In `AddProductModal.tsx`, find the `{/* Step 1: Manual Form */}` block and replace its `Modal.Step` body with:

```tsx
{/* Step 1: Manual Form */}
<Modal.Step title="Add product">
  {error && (
    <Modal.Item>
      <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
        {error}
      </div>
    </Modal.Item>
  )}

  <Modal.Item>
    <ProductForm
      categories={categories}
      idPrefix="add-manual"
      isOpen={isOpen}
    />
  </Modal.Item>

  <Modal.Footer>
    <SaveButton onSubmit={onSubmit} />
  </Modal.Footer>
</Modal.Step>
```

- [ ] **Step 2: Add the import**

At the top of `AddProductModal.tsx`, add:

```ts
import { ProductForm } from './ProductForm'
```

Remove now-unused imports: `Image`, `Plus`, `Minus`, `BarcodeFields`, `ImageAttachIcon`, `PRESET_ICONS`, `isPresetIcon`, `getPresetIcon`, `TabContainer` — but ONLY if they are unused after Task 5 also lands. For now, leave them; eslint will catch unused imports after Task 5.

Also remove the local `useState`/`useEffect` for `activeTab` at the top of the component body (lines 139-144), and the destructured form fields that are now consumed inside `ProductForm` itself. Keep ones still used elsewhere in the file (e.g., `cameraInputRef`, `aiProcessing`, `isSaving`, `error`, `productSaved` which are used by step 2/3/4).

- [ ] **Step 3: Verify the modal still renders by running the dev server**

Run: `npm run dev`
Then in the browser, open the products page, click "Add product", click "Add manually", and verify the form renders identically (icon picker, name, price/category, active toggle, barcode tab still functional).

Expected: visually identical to before. Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/components/products/AddProductModal.tsx
git commit -m "refactor(products): use ProductForm in AddProductModal manual step"
```

---

## Task 5: Replace AddProductModal step 3 (AI review) JSX with `<ProductForm />` and remove the barcode placeholder

**Files:**
- Modify: `src/components/products/AddProductModal.tsx:447-642`

- [ ] **Step 1: Replace step 3 contents**

Replace the `{/* Step 3: AI Review */}` block with:

```tsx
{/* Step 3: AI Review */}
<Modal.Step title="Review product" backStep={0}>
  {error && (
    <Modal.Item>
      <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
        {error}
      </div>
    </Modal.Item>
  )}

  <Modal.Item>
    <ProductForm
      categories={categories}
      idPrefix="add-ai"
      isOpen={isOpen}
    />
  </Modal.Item>

  <Modal.Footer>
    <Modal.BackButton
      onClick={() => {
        onPipelineReset()
        setName('')
        setPrice('')
      }}
      disabled={isSaving || aiProcessing}
    >
      Back
    </Modal.BackButton>
    <SaveButton onSubmit={onSubmit} />
  </Modal.Footer>
</Modal.Step>
```

- [ ] **Step 2: Clean up now-unused imports and locals**

Run: `npm run lint -- src/components/products/AddProductModal.tsx`
Remove every unused import / variable the lint reports (e.g., `Image`, `Plus`, `Minus`, `BarcodeFields`, `ImageAttachIcon`, `PRESET_ICONS`, `isPresetIcon`, `getPresetIcon`, `TabContainer`, `setIconPreview`, `setGeneratedIconBlob`, `setIconType`, `setPresetEmoji`, `presetEmoji`, `clearIcon`, `iconPreview`, `name`, `setName`, etc., but keep `setName`, `setPrice` because the back-button onClick still uses them, and keep `isSaving`, `aiProcessing`, `error`, `productSaved` for steps 2/3/4).

Re-run: `npm run lint -- src/components/products/AddProductModal.tsx`
Expected: no warnings or errors.

- [ ] **Step 3: Smoke test the AI flow end-to-end with the existing pipeline**

This step verifies that the form consolidation didn't break anything before we restructure the AI flow steps. The barcode tab in AI review will now work (it didn't before).

Run: `npm run dev`. Open the products page → Add → Snap to Add → take a photo. After processing, verify the review form renders with the AI-generated name and icon, and that the barcode tab is now functional (scan/generate/manual entry).

- [ ] **Step 4: Commit**

```bash
git add src/components/products/AddProductModal.tsx
git commit -m "refactor(products): use ProductForm in AddProductModal AI review step"
```

---

## Task 6: Replace EditProductModal step 0 JSX with `<ProductForm />`

**Files:**
- Modify: `src/components/products/EditProductModal.tsx:186-397`

- [ ] **Step 1: Replace step 0 contents**

Replace the `{/* Step 0: Edit Form */}` body with:

```tsx
{/* Step 0: Edit Form */}
<Modal.Step title="Edit product">
  {error && (
    <Modal.Item>
      <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
        {error}
      </div>
    </Modal.Item>
  )}

  <Modal.Item>
    <ProductForm
      categories={categories}
      idPrefix="edit"
      isOpen={isOpen}
    />
  </Modal.Item>

  <Modal.Footer>
    {canDelete && (
      <Modal.GoToStepButton step={2} className="btn btn-secondary btn-icon">
        <TrashIcon className="text-error" style={{ width: 16, height: 16 }} />
      </Modal.GoToStepButton>
    )}
    <Modal.GoToStepButton step={1} className="btn btn-secondary btn-icon">
      <SlidersIcon className="text-brand" style={{ width: 16, height: 16 }} />
    </Modal.GoToStepButton>
    <SaveButton onSubmit={onSubmit} />
  </Modal.Footer>
</Modal.Step>
```

- [ ] **Step 2: Add import + clean up unused imports**

Add at top:
```ts
import { ProductForm } from './ProductForm'
```

Run: `npm run lint -- src/components/products/EditProductModal.tsx`
Remove all unused imports (`Image`, `Plus`, `Minus`, `BarcodeFields`, `ImageAttachIcon`, `PRESET_ICONS`, `TabContainer`) and unused destructured fields (`setIconPreview`, `setGeneratedIconBlob`, etc.). Keep `iconPreview`, `isPresetIcon`, `getPresetIcon`, `editingProduct` because the inventory adjustment step (step 1) still uses them.

Re-run lint until clean.

- [ ] **Step 3: Smoke test the edit flow**

Run: `npm run dev`. Open an existing product → verify edit modal renders identically, and verify the adjust-inventory and delete steps still work.

- [ ] **Step 4: Commit**

```bash
git add src/components/products/EditProductModal.tsx
git commit -m "refactor(products): use ProductForm in EditProductModal"
```

---

## Task 7: Create AiBarcodeStep component

**Files:**
- Create: `src/components/products/AiBarcodeStep.tsx`

This is a thin wrapper around the existing `BarcodeFields` to give the AI flow a dedicated "barcode" step with explicit Skip / Continue actions and an instructional title. It does not introduce any new state — it just renders inside a `Modal.Step` and lets the existing context absorb whatever the user enters.

- [ ] **Step 1: Create the file**

```tsx
// src/components/products/AiBarcodeStep.tsx
'use client'

import { BarcodeFields } from './BarcodeFields'

/**
 * Body content for the AI flow's barcode step. Renders inside a Modal.Step.
 * Footer (Skip / Continue buttons) is provided by the parent Modal.Step.
 */
export function AiBarcodeStepBody() {
  return (
    <>
      <div className="text-sm text-text-secondary mb-4 px-1">
        Scan the product&apos;s existing barcode, generate a new one to print and
        stick on your items, or skip if this product has no barcode.
      </div>
      <BarcodeFields />
    </>
  )
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint -- src/components/products/AiBarcodeStep.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/products/AiBarcodeStep.tsx
git commit -m "feat(products): add AiBarcodeStep body for AI flow barcode capture"
```

---

## Task 8: Create SuggestedCategoryStep component

**Files:**
- Create: `src/components/products/SuggestedCategoryStep.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/products/SuggestedCategoryStep.tsx
'use client'

import { useState, useEffect } from 'react'
import { Spinner } from '@/components/ui'
import type { ProductCategory } from '@/types'

export interface SuggestedCategoryStepProps {
  /** The AI-suggested name for a brand-new category */
  suggestedName: string
  /** Existing categories, in case the user wants to pick one instead */
  categories: ProductCategory[]
  /** Called when the user confirms creating the new category. Returns the new category id. */
  onCreate: (name: string) => Promise<string | null>
  /** Called when the user picks an existing category instead */
  onPickExisting: (categoryId: string) => void
}

export function SuggestedCategoryStep({
  suggestedName,
  categories,
  onCreate,
  onPickExisting,
}: SuggestedCategoryStepProps) {
  const [name, setName] = useState(suggestedName)
  const [isCreating, setIsCreating] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(suggestedName)
  }, [suggestedName])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Category name is required')
      return
    }
    setError('')
    setIsCreating(true)
    try {
      const newId = await onCreate(trimmed)
      if (!newId) setError('Failed to create category')
    } finally {
      setIsCreating(false)
    }
  }

  if (showPicker) {
    return (
      <>
        <div className="text-sm text-text-secondary mb-3 px-1">
          Pick an existing category for this product:
        </div>
        <div className="space-y-2">
          {categories
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onPickExisting(cat.id)}
                className="w-full text-left px-4 py-3 rounded-lg bg-bg-muted hover:bg-brand-subtle transition-colors"
              >
                {cat.name}
              </button>
            ))}
        </div>
        <button
          type="button"
          onClick={() => setShowPicker(false)}
          className="text-sm text-text-tertiary hover:text-text-secondary mt-3 px-1"
        >
          Back to suggestion
        </button>
      </>
    )
  }

  return (
    <>
      <div className="text-sm text-text-secondary mb-3 px-1">
        We couldn&apos;t fit this product into one of your existing categories.
        Create a new one to keep things organized:
      </div>

      <label htmlFor="suggested-category-name" className="label">
        New category name
      </label>
      <input
        id="suggested-category-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input"
        autoComplete="off"
        autoFocus
      />

      {error && (
        <div className="mt-3 p-3 bg-error-subtle text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !name.trim()}
          className="btn btn-primary flex-1"
        >
          {isCreating ? <Spinner /> : 'Create and continue'}
        </button>
      </div>

      {categories.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="text-sm text-brand hover:text-brand mt-3 px-1"
        >
          Pick existing category instead
        </button>
      )}
    </>
  )
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint -- src/components/products/SuggestedCategoryStep.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/products/SuggestedCategoryStep.tsx
git commit -m "feat(products): add SuggestedCategoryStep for AI category creation flow"
```

---

## Task 9: Restructure AddProductModal AI flow steps

**Files:**
- Modify: `src/components/products/AddProductModal.tsx`

This task changes the step indices and adds the new product-photo, barcode, and suggested-category steps. The manual flow remains, but moves to the new index. The existing `AiPipelineNavigator` is updated for the new indices.

**New step indices:**
| # | Purpose |
|---|---------|
| 0 | Entry (manual / AI) |
| 1 | AI: product photo (instruction + camera trigger) |
| 2 | AI: barcode step |
| 3 | AI: analyzing |
| 4 | AI: suggested category (conditional — only entered if pipeline returned `suggestedNewCategoryName`) |
| 5 | Form (manual or AI-prefilled) |
| 6 | Success |

The manual flow goes 0 → 5 → 6. The AI flow goes 0 → 1 → 2 → 3 → (4) → 5 → 6.

- [ ] **Step 1: Update SaveButton's success step**

Replace the `goToStep(4)` call inside `SaveButton.handleClick` with `goToStep(6)`.

- [ ] **Step 2: Update AiPipelineNavigator for new indices**

Replace the navigator with:

```tsx
function AiPipelineNavigator({
  needsCategory,
}: {
  needsCategory: boolean
}) {
  const { pipelineStep, isCompressing } = useProductForm()
  const { goToStep, currentStep } = useMorphingModal()
  const goToStepRef = useRef(goToStep)

  useLayoutEffect(() => {
    goToStepRef.current = goToStep
  })

  // While the pipeline is running, ensure we're on the analyzing step (3)
  useEffect(() => {
    const inProgress =
      isCompressing ||
      (pipelineStep !== 'idle' &&
        pipelineStep !== 'complete' &&
        pipelineStep !== 'error')
    if (inProgress && currentStep === 2) {
      goToStepRef.current(3)
    }
  }, [isCompressing, pipelineStep, currentStep])

  // When the pipeline completes, advance to either suggested-category (4) or form (5)
  useEffect(() => {
    if (currentStep === 3 && pipelineStep === 'complete') {
      goToStepRef.current(needsCategory ? 4 : 5)
    }
  }, [pipelineStep, currentStep, needsCategory])

  return null
}
```

- [ ] **Step 3: Add a new `aiPipelineResult` prop and `onCreateCategory` prop, then add new steps**

Update `AddProductModalProps`:

```ts
export interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onAbortAiProcessing: () => void
  onPipelineReset: () => void
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onOpenSettings: () => void
  /** AI suggested category name when no existing category fits */
  suggestedCategoryName: string | null
  /** Create a new category and select it for the current product. Returns the new id. */
  onCreateCategory: (name: string) => Promise<string | null>
}
```

In the component body, compute:

```ts
const needsCategory = !!suggestedCategoryName
```

Pass it to the navigator: `<AiPipelineNavigator needsCategory={needsCategory} />`.

- [ ] **Step 4: Replace the modal body with the new step layout**

Inside `<Modal>`, the steps in order:

```tsx
{/* Step 0: Mode Selection */}
<Modal.Step title="Add product">
  <AiPipelineNavigator needsCategory={needsCategory} />
  <Modal.Item>
    <div className="caja-actions caja-actions--stacked">
      <Modal.GoToStepButton step={1} className="caja-action-btn caja-action-btn--large">
        <CameraIcon className="caja-action-btn__icon text-brand" />
        <div className="caja-action-btn__text">
          <span className="caja-action-btn__title">Snap to Add</span>
          <span className="caja-action-btn__desc">Take a photo and AI fills the data</span>
        </div>
      </Modal.GoToStepButton>

      <Modal.GoToStepButton step={5} className="caja-action-btn caja-action-btn--large">
        <JoinIcon className="caja-action-btn__icon text-text-secondary" />
        <div className="caja-action-btn__text">
          <span className="caja-action-btn__title">Add manually</span>
          <span className="caja-action-btn__desc">Enter the product data yourself</span>
        </div>
      </Modal.GoToStepButton>
    </div>
  </Modal.Item>
  <Modal.Footer>
    <Modal.CancelBackButton />
    <button type="button" onClick={onOpenSettings} className="btn btn-primary flex-1">
      Settings
    </button>
  </Modal.Footer>
</Modal.Step>

{/* Step 1: AI - Product photo */}
<Modal.Step title="Take a product photo" backStep={0}>
  <Modal.Item>
    <p className="text-sm text-text-secondary mb-4">
      Take a clear, well-lit photo of the product. Center it in the frame and avoid glare.
    </p>
    <button
      type="button"
      onClick={() => cameraInputRef.current?.click()}
      className="caja-action-btn caja-action-btn--large w-full"
    >
      <CameraIcon className="caja-action-btn__icon text-brand" />
      <div className="caja-action-btn__text">
        <span className="caja-action-btn__title">Open camera</span>
        <span className="caja-action-btn__desc">We&apos;ll move on once you snap the photo</span>
      </div>
    </button>
  </Modal.Item>

  <input
    ref={cameraInputRef}
    type="file"
    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
    capture="environment"
    onChange={async (e) => {
      await onAiPhotoCapture(e)
      // After photo is captured + compressed, advance to barcode step
      // (the page-level handler stores the compressed image in pipeline state
      //  but does NOT call startPipeline yet — see Task 11)
    }}
    className="hidden"
  />

  <Modal.Footer>
    <Modal.BackButton>Back</Modal.BackButton>
  </Modal.Footer>
</Modal.Step>

{/* Step 2: AI - Barcode */}
<Modal.Step title="Add a barcode" backStep={1}>
  <Modal.Item>
    <AiBarcodeStepBody />
  </Modal.Item>
  <Modal.Footer>
    <Modal.BackButton>Back</Modal.BackButton>
    <button
      type="button"
      onClick={() => {
        // Trigger the pipeline; AiPipelineNavigator will move us to step 3
        onStartAiPipeline()
      }}
      className="btn btn-primary flex-1"
    >
      Continue
    </button>
  </Modal.Footer>
</Modal.Step>

{/* Step 3: Analyzing */}
<Modal.Step title="Analyzing..." backStep={0} onBackStep={onAbortAiProcessing}>
  <Modal.Item>
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner className="spinner-lg mb-4" />
      <p className="text-sm text-text-secondary">Analyzing product...</p>
      <p className="text-xs text-text-tertiary mt-1">This may take a few seconds</p>
    </div>
  </Modal.Item>
  <Modal.Footer>
    <Modal.CancelBackButton>Cancel</Modal.CancelBackButton>
  </Modal.Footer>
</Modal.Step>

{/* Step 4: Suggested category (conditional) */}
<Modal.Step title="New category" backStep={3}>
  <Modal.Item>
    <SuggestedCategoryStep
      suggestedName={suggestedCategoryName ?? ''}
      categories={categories}
      onCreate={async (newName) => {
        const newId = await onCreateCategory(newName)
        if (newId) {
          setCategoryId(newId)
          // advance to form
          goToStep(5)
        }
        return newId
      }}
      onPickExisting={(id) => {
        setCategoryId(id)
        goToStep(5)
      }}
    />
  </Modal.Item>
  <Modal.Footer>
    <Modal.BackButton>Back</Modal.BackButton>
  </Modal.Footer>
</Modal.Step>

{/* Step 5: Form (manual or AI-prefilled) */}
<Modal.Step title="Add product" backStep={0}>
  {error && (
    <Modal.Item>
      <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
    </Modal.Item>
  )}
  <Modal.Item>
    <ProductForm categories={categories} idPrefix="add" isOpen={isOpen} />
  </Modal.Item>
  <Modal.Footer>
    <SaveButton onSubmit={onSubmit} />
  </Modal.Footer>
</Modal.Step>

{/* Step 6: Save success */}
<Modal.Step title="Product created" hideBackButton>
  <Modal.Item>
    <div className="flex flex-col items-center text-center py-4">
      <div style={{ width: 160, height: 160 }}>
        {productSaved && (
          <LottiePlayer
            src="/animations/success.json"
            loop={false}
            autoplay={true}
            delay={300}
            style={{ width: 160, height: 160 }}
          />
        )}
      </div>
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
        style={{ opacity: productSaved ? 1 : 0 }}
      >
        Product added!
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
        style={{ opacity: productSaved ? 1 : 0 }}
      >
        The product has been created successfully
      </p>
    </div>
  </Modal.Item>
  <Modal.Footer>
    <button type="button" onClick={onClose} className="btn btn-primary flex-1">
      Done
    </button>
  </Modal.Footer>
</Modal.Step>
```

You will need to add the following to the destructured `useProductForm()` hook in this component:
```ts
const { /* existing */, setCategoryId } = useProductForm()
```

And import:
```ts
import { ProductForm } from './ProductForm'
import { AiBarcodeStepBody } from './AiBarcodeStep'
import { SuggestedCategoryStep } from './SuggestedCategoryStep'
```

You will also need access to `goToStep` inside the modal body to wire the SuggestedCategoryStep callbacks. Wrap that step's contents in a small inline component or use `useMorphingModal()` at the top of the modal body — whichever the existing modal pattern allows. If `useMorphingModal()` cannot be called inside `<Modal>` directly, create a small inline `SuggestedCategoryStepWrapper` component that calls `useMorphingModal()`:

```tsx
function SuggestedCategoryStepWrapper({
  suggestedCategoryName,
  categories,
  onCreateCategory,
}: {
  suggestedCategoryName: string | null
  categories: ProductCategory[]
  onCreateCategory: (name: string) => Promise<string | null>
}) {
  const { setCategoryId } = useProductForm()
  const { goToStep } = useMorphingModal()
  return (
    <SuggestedCategoryStep
      suggestedName={suggestedCategoryName ?? ''}
      categories={categories}
      onCreate={async (newName) => {
        const newId = await onCreateCategory(newName)
        if (newId) {
          setCategoryId(newId)
          goToStep(5)
        }
        return newId
      }}
      onPickExisting={(id) => {
        setCategoryId(id)
        goToStep(5)
      }}
    />
  )
}
```

And in step 4 use `<SuggestedCategoryStepWrapper ... />` instead of inlining.

- [ ] **Step 5: Add `onStartAiPipeline` prop**

The "Continue" button on step 2 needs to actually fire the pipeline. Add this to `AddProductModalProps`:

```ts
onStartAiPipeline: () => void
```

This gets wired in Task 11.

- [ ] **Step 6: Lint and fix any errors**

Run: `npm run lint -- src/components/products/AddProductModal.tsx`
Fix all reported errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/products/AddProductModal.tsx
git commit -m "feat(products): restructure AddProductModal AI flow into 7 steps"
```

---

## Task 10: Update ProductFormData/payload to include `productSaved` step index correctly + audit step references

**Files:**
- Modify: `src/components/products/AddProductModal.tsx` (verify), `src/components/products/EditProductModal.tsx` (no changes — its step indices are independent)

This task is just a verification pass to make sure no other code in `AddProductModal` references the old step indices (e.g., `goToStep(2)`, `goToStep(3)`, `goToStep(4)`) with stale meanings.

- [ ] **Step 1: Grep for stale step references**

Run:
```bash
grep -n "goToStep(\|step={\|step=\"\|backStep=" src/components/products/AddProductModal.tsx
```

For each result, verify the step number matches the new layout from Task 9. Fix any that don't.

- [ ] **Step 2: Run lint + a manual end-to-end smoke test**

Run: `npm run dev`
- Verify manual flow: Add → Add manually → form (step 5) → Save → success (step 6).
- Verify AI flow up to analyzing: Add → Snap to Add → step 1 photo → step 2 barcode (skip) → Continue → step 3 analyzing.
- The form pre-fill from AI is still wired in Task 11, so for now the analyzing step will hang or error — that's expected.

- [ ] **Step 3: Commit**

```bash
git add src/components/products/AddProductModal.tsx
git commit -m "fix(products): audit AddProductModal step references after restructure"
```

---

## Task 11: Wire page-level handlers — categories into pipeline, deferred start, populate form on completion

**Files:**
- Modify: `src/app/[businessId]/products/page.tsx`

The current `handleAiPhotoCapture` calls `pipeline.startPipeline(compressedBase64)` immediately. We need to:
1. Stash the compressed image instead of starting the pipeline.
2. Add a separate `handleStartAiPipeline` that fires the pipeline using the stashed image AND the categories list.
3. On pipeline completion, populate the form context fields (`setName`, `setCategoryId` if matched, icon).
4. Add `onCreateCategory` that POSTs to `/api/businesses/[businessId]/categories`.

- [ ] **Step 1: Find and read the current handlers**

Run: `grep -n "handleAiPhotoCapture\|pipeline\\.\|setName\|setCategoryId\|categories" src/app/[businessId]/products/page.tsx`

Identify:
- Where `pipeline = useAiProductPipeline()` is initialized.
- The current `handleAiPhotoCapture` body.
- Where `categories` state is held (likely a local state from the products fetch).
- Whether the page already has access to the form context's setters (it may not — the context is a wrapper around the modals).

- [ ] **Step 2: Stash the compressed image instead of starting the pipeline**

Replace the body of `handleAiPhotoCapture` with:

```ts
const handleAiPhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  const compressedBase64 = await compression.compressImage(file)
  if (!compressedBase64) return
  setPendingAiImage(compressedBase64)
  // Modal will advance to barcode step automatically because the user
  // already navigated from step 0 -> step 1 by tapping "Snap to Add",
  // and the camera input lives inside step 1. The Modal.GoToStepButton
  // for step 2 (barcode) is NOT used — instead, the AddProductModal
  // listens for `pendingAiImage` becoming non-null and calls goToStep(2).
}, [compression])
```

We need a small effect inside `AddProductModal` that watches for the parent signaling "photo captured, advance to step 2." The simplest approach: pass an `onPhotoCaptured` callback from the page that calls `goToStep(2)`. But the page doesn't have `goToStep`. So instead, expose an `onPhotoCaptured` ref / state from the modal to the page.

**Simpler approach:** put `setPendingAiImage` AND a `goToStep(2)` call inline in step 1's `<input onChange>` handler, by inlining via a small wrapper component inside `AddProductModal` that has access to `useMorphingModal()`. Adjust Task 9's step 1 to use a wrapper:

```tsx
function AiPhotoStepInput({
  onAiPhotoCapture,
}: {
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}) {
  const { goToStep } = useMorphingModal()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="caja-action-btn caja-action-btn--large w-full"
      >
        <CameraIcon className="caja-action-btn__icon text-brand" />
        <div className="caja-action-btn__text">
          <span className="caja-action-btn__title">Open camera</span>
          <span className="caja-action-btn__desc">We&apos;ll move on once you snap the photo</span>
        </div>
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={async (e) => {
          await onAiPhotoCapture(e)
          goToStep(2)
        }}
        className="hidden"
      />
    </>
  )
}
```

Use `<AiPhotoStepInput onAiPhotoCapture={onAiPhotoCapture} />` inside step 1's `<Modal.Item>`. This avoids needing to plumb `goToStep` to the page. **Update Task 9 step 4 to use this wrapper.**

- [ ] **Step 3: Add `pendingAiImage` state and `handleStartAiPipeline` to page**

In `src/app/[businessId]/products/page.tsx`:

```ts
const [pendingAiImage, setPendingAiImage] = useState<string | null>(null)

const handleStartAiPipeline = useCallback(() => {
  if (!pendingAiImage) return
  pipeline.startPipeline(pendingAiImage, {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
  })
}, [pendingAiImage, pipeline, categories])
```

Pass `onStartAiPipeline={handleStartAiPipeline}` to `<AddProductModal />` (via the existing `AddProductModalWrapper`).

- [ ] **Step 4: Watch pipeline result and populate form context fields**

The page component does NOT directly hold the form context — the context lives inside the modal tree. Add an effect inside `AddProductModalWrapper` (which IS inside the context provider) that reacts to `pipeline.state.result`:

```ts
// inside AddProductModalWrapper
const { setName, setCategoryId, setGeneratedIconBlob, setIconPreview, setIconType, setPresetEmoji } = useProductForm()

useEffect(() => {
  const result = pipeline.state.result
  if (!result || pipeline.state.step !== 'complete') return
  setName(result.name)
  if (result.categoryId) {
    setCategoryId(result.categoryId)
  }
  // Icon
  setGeneratedIconBlob(result.iconBlob)
  setIconPreview(result.iconPreview)
  setIconType('generated')
  setPresetEmoji(null)
}, [pipeline.state.step, pipeline.state.result, setName, setCategoryId, setGeneratedIconBlob, setIconPreview, setIconType, setPresetEmoji])
```

Add `pipeline` to the wrapper's props (it currently receives `pipelineStep`, etc., individually — we need the full pipeline state.result). Find the call site of `AddProductModalWrapper` and pass `pipeline={pipeline}`.

- [ ] **Step 5: Pass `suggestedCategoryName` and `onCreateCategory` to AddProductModal**

In `AddProductModalWrapper`:

```ts
const suggestedCategoryName = pipeline.state.result?.suggestedNewCategoryName ?? null
```

And pass it to `<AddProductModal suggestedCategoryName={suggestedCategoryName} ... />`.

For `onCreateCategory`, add a handler that POSTs to the categories API:

```ts
const handleCreateCategory = useCallback(async (name: string): Promise<string | null> => {
  try {
    const response = await fetch(`/api/businesses/${businessId}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await response.json()
    if (!response.ok || !data.success) return null
    // Add to local categories so the form select shows it immediately
    setCategories((prev) => [...prev, data.data])
    return data.data.id as string
  } catch {
    return null
  }
}, [businessId])
```

Pass `onCreateCategory={handleCreateCategory}` to `<AddProductModal />`. Note: `setCategories` must be the parent state setter — verify the wrapper has access (it likely does via the context hook). If not, lift the handler to the page component and pass it down.

**Verify the categories API response shape** by reading the route file:

```bash
grep -n "POST\|export" src/app/api/businesses/\[businessId\]/categories/route.ts
```

Adjust the `data.data.id` access if the response shape differs. The Drizzle insert pattern in this codebase typically returns the inserted row.

- [ ] **Step 6: Reset `pendingAiImage` on modal close and pipeline reset**

In `handleCloseModal` and `onPipelineReset` callbacks, also call `setPendingAiImage(null)`.

- [ ] **Step 7: Lint, then full smoke test**

Run: `npm run lint -- src/app/[businessId]/products/page.tsx`
Fix all errors.

Run: `npm run dev` and walk through:
1. **Manual flow** — still works end to end.
2. **AI flow with existing matching category** — Add → Snap → photo → barcode (skip) → Continue → analyzing → form opens with name + matched category + icon prefilled. Save → success.
3. **AI flow with suggested new category** — same path but uses a product the AI cannot fit. After analyzing, suggested category step appears. Type a name → Create and continue → form opens with the new category selected. Save → success.
4. **AI flow with no categories existing** — same as #3.
5. **Cancel mid-pipeline** — back button on analyzing step aborts and returns to step 0.

Note: scenario 2 vs 3 depends on what the AI returns. To force scenario 3 deterministically during testing, temporarily delete all categories from the test business before running the AI flow.

- [ ] **Step 8: Commit**

```bash
git add src/app/[businessId]/products/page.tsx src/components/products/AddProductModal.tsx
git commit -m "feat(ai): two-photo AI flow with category suggestion and form pre-fill"
```

---

## Task 12: Update documentation

**Files:**
- Modify: `.claude/docs/ai-product-pipeline.md`

- [ ] **Step 1: Replace the Overview and Pipeline Steps sections**

Update the document to describe:
- The new 2-photo flow (product photo step → barcode step → analyzing → optional suggested category → form).
- The new `identify-product` request shape (with `categories[]`) and response shape (with `categoryId` / `suggestedNewCategoryName`).
- The English prompt.
- That the form is now a single shared `<ProductForm />` consumed by add (manual), add (AI), and edit.
- That the barcode step in the AI flow reuses the existing `BarcodeFields` component.

Also remove any references to "Spanish" / "Producto no identificado" in the doc.

- [ ] **Step 2: Commit**

```bash
git add .claude/docs/ai-product-pipeline.md
git commit -m "docs: update AI product pipeline doc for two-photo flow and category awareness"
```

---

## Task 13: Final verification

- [ ] **Step 1: Run lint and tests**

```bash
npm run lint
npm run test
```

Expected: both pass with no new errors.

- [ ] **Step 2: Manual smoke test checklist**

- [ ] Manual add product works (no regressions)
- [ ] Edit product works (no regressions)
- [ ] AI flow: matched existing category → form pre-filled correctly
- [ ] AI flow: suggested new category → step appears, can create, returns to form with new category selected
- [ ] AI flow: suggested new category → can pick existing instead
- [ ] AI flow: barcode scan → barcode value populates form
- [ ] AI flow: barcode generate → barcode value populates form
- [ ] AI flow: barcode skip → form has no barcode
- [ ] AI flow: cancel during analyzing → returns to step 0
- [ ] Identify-product returns English names for known products
- [ ] Identify-product never returns "Product not identified" or similar placeholder

- [ ] **Step 3: Final commit if any cleanup is needed**

```bash
git status
```

If there are any straggling changes, commit them with a descriptive message. Otherwise, this task is a no-op.

---

## Self-Review Notes

- **Spec coverage:** Every spec section maps to a task. API changes → Task 1. Pipeline plumbing → Task 2. Form consolidation → Tasks 3-6. New AI step components → Tasks 7-8. Modal restructure → Tasks 9-10. Page wiring → Task 11. Docs → Task 12. Verification → Task 13.
- **No new design language:** Tasks 7-8 reuse `BarcodeFields`, `Modal.Step`, `caja-action-btn`, `input`, `label`, `btn-primary`, `btn-secondary`, `bg-bg-muted`, `text-text-*`, etc. — all existing.
- **Risk areas:** Task 9 step layout is the largest single change. Task 11's effect to populate form context from pipeline result depends on `AddProductModalWrapper` being inside the `ProductFormProvider` — verify this before writing the effect. Task 11 also depends on the categories POST endpoint shape.
- **Type consistency:** `PipelineResult.categoryId` and `suggestedNewCategoryName` are nullable strings throughout. `IdentifyResult` matches. `SuggestedCategoryStepProps.suggestedName` is non-null string (parent passes `?? ''`).
