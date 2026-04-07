# AI Product Pipeline Improvements — Design

**Date:** 2026-04-07
**Status:** Approved, ready for implementation plan

## Goals

1. Improve AI product identification so it never returns "Product not identified" and reliably picks an existing category, or suggests a new one when nothing fits.
2. Capture barcode as part of the AI flow via a dedicated second photo step (scan, generate, or skip).
3. Consolidate the duplicated product form JSX (manual add, AI review, edit) into a single shared `<ProductForm />` component.
4. Replace the placeholder barcode tab in the product form with a real scanner + generator.

Out of scope: schema changes, price detection, sales register changes.

## Non-Goals

- AI price detection (unreliable from photos).
- New visual indicators on AI-filled fields (no banners, no badges).
- Schema changes — the existing `products.barcode*` and `product_categories` tables are sufficient.

## Architecture

Two parallel improvements that share one consolidated form:

1. **Two-photo AI pipeline** — product photo, then barcode photo (scan / generate / skip), then parallel AI calls, then populated form.
2. **Form consolidation** — extract `<ProductForm />` used by manual add, AI-prefilled add, and edit.

There is no separate AI review screen and no AI summary banner. The form is the destination for both manual and AI flows.

## AddProductModal Step Flow

| # | Step | Shown when |
|---|------|-----------|
| 0 | Entry (Manual / AI) | Always |
| 1 | Product photo capture | AI only |
| 2 | Barcode photo (Scan / Generate / Skip) | AI only |
| 3 | Analyzing spinner | AI only |
| 3a | Suggested category | AI only, only if AI proposes a new category or no categories exist |
| 4 | Product form (empty or pre-filled) | Always |
| 5 | Success | Always |

Manual flow: 0 → 4 → 5.
AI flow: 0 → 1 → 2 → 3 → (3a if needed) → 4 → 5.

The form (step 4) always receives a valid existing `categoryId`. Step 3a guarantees this by either creating the suggested category or letting the user pick an existing one before the form opens.

## Two-Photo Capture

### Step 1 — Product photo

- Same camera input pattern as today.
- Same compression: max 768px, JPEG quality 70.
- Stored in pipeline state. Not sent until both photos are committed (or barcode is skipped/generated).

### Step 2 — Barcode photo

A single sub-component (`BarcodeCapture`) with three options, presented as tabs or buttons:

**Scan existing**
- Camera input at full resolution (no compression).
- Decoded client-side with `html5-qrcode` against the original full-resolution bytes.
- On successful decode, attach `{ value, format, source: 'scan' }` and advance.
- On failure, show inline error: "Couldn't read barcode — try again or skip."

**Generate new**
- Generates a unique internal barcode value (CODE128 or EAN-13).
- Renders a preview with `bwip-js`.
- Short explainer: "Print and stick on your items so they scan at checkout."
- On confirm, attach `{ value, format, source: 'generated' }` and advance.

**Skip**
- Advance with no barcode attached.

This same `BarcodeCapture` component is reused inside `<ProductForm />`'s barcode tab so manual-add and edit flows get the same scanner/generator instead of the current placeholder.

### Step 3 — Analyzing

Once both photos (or photo + skipped/generated barcode) are committed, the pipeline fires in parallel:

- `identify-product` — now also receives the user's category list and returns a resolved categoryId or a suggested new category name.
- `generate-icon` → `remove-background` (unchanged).

## identify-product API Changes

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "categories": [
    { "id": "cat_123", "name": "Snacks" },
    { "id": "cat_456", "name": "Beverages" }
  ]
}
```

**Prompt changes:**
- Pass the user's category list inline.
- Instruct GPT-4o to **strongly prefer matching** an existing category. Try hard before giving up.
- Only suggest a new category name when no existing one is a reasonable fit.
- Never return "Product not identified" — always return a best-guess name (brand, product type, or generic descriptor).
- All output in **English**. Audit and convert any remaining Spanish strings in `identify-product/route.ts` and `useAiProductPipeline.ts`.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Chicken Flavor Chips",
    "categoryId": "cat_123",
    "suggestedNewCategoryName": null
  }
}
```

**Validation (Zod refinement):** exactly one of `categoryId` or `suggestedNewCategoryName` is non-null. If `categories` is empty, `categoryId` must be null and `suggestedNewCategoryName` must be set.

## Step 3a — Suggested Category

Shown only when the API response has `suggestedNewCategoryName` set.

UI: a single card with the suggested name as an editable text field, plus two actions:

- **Create and continue** → `POST /categories`, get the new categoryId, advance to step 4 with it pre-selected.
- **Pick existing instead** → opens the existing category picker; user picks one, advance to step 4.

Categories have no icons in the schema, so this step has no icon picker — name only.

## ProductForm Consolidation

Extract a single shared component from the duplicated JSX in `AddProductModal` step 1 (current manual form) and step 3 (current AI review form), and `EditProductModal`.

**Component contract:**
```tsx
<ProductForm
  values={formState}
  onChange={setFormState}
  categories={categories}
  mode="add" | "edit"
  onRequestNewCategory={() => goToStep('category-creation')}
/>
```

- Fully controlled — parent owns state.
- Renders all fields: name, price, stock, category, barcode tab, icon.
- The barcode tab uses the same `BarcodeCapture` component as AI step 2 (scan, generate, manual entry as needed). This replaces the current placeholder.
- The form has no knowledge of AI vs manual. It just renders whatever values it's given.

**Consumers:**
- `AddProductModal` step 4 — manual flow starts empty; AI flow starts pre-filled.
- `EditProductModal` — initial values from the existing product.

**Why now:** `AddProductModal` is 684 lines and `EditProductModal` is 548. Extracting the form shrinks both significantly and eliminates drift between them. We're touching these files anyway for the new step flow.

## Files Touched

**New:**
- `src/components/products/ProductForm.tsx` — shared form component.
- `src/components/products/BarcodeCapture.tsx` — scan / generate / skip sub-component reused by AI step 2 and ProductForm's barcode tab.
- `src/lib/barcode.ts` — helpers for generating internal barcode values (only if not already present).

**Modified:**
- `src/components/products/AddProductModal.tsx` — new step flow, uses ProductForm.
- `src/components/products/EditProductModal.tsx` — uses ProductForm.
- `src/hooks/useAiProductPipeline.ts` — accepts two photos, returns `{ name, categoryId, suggestedNewCategoryName, barcode, icon }`.
- `src/app/api/ai/identify-product/route.ts` — accepts categories array, English prompt, new response shape, Zod validation.
- `src/app/[businessId]/products/page.tsx` — wire the two-photo handlers and the new pipeline shape.
- `.claude/docs/ai-product-pipeline.md` — update to reflect the new flow.

## UI / Styling Constraints

- All new UI uses existing primitives: `Modal.Step`, existing form inputs, existing button classes, CSS variables from `globals.css`.
- No new design language. Match the layouts already used in `AddProductModal` and `EditProductModal`.
- No emojis in UI strings (per project guideline).
- All copy in English.

## Risks

- `html5-qrcode` reliability on lower-end devices for 1D barcodes — mitigated by using full-resolution capture and providing the Skip option.
- Category list passed in the prompt grows token cost slightly per identify call — negligible at expected scale.
- Form extraction is the largest mechanical change — must verify both add and edit flows still work end-to-end after refactor.
