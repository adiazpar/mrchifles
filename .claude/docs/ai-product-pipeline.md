# AI Product Creation Pipeline

This document describes the AI-powered product creation flow that allows business owners to add products by taking a product photo and optionally a barcode photo.

## Overview

The pipeline collects two photos (product + barcode), identifies the product and matches it to an existing category, generates an emoji-style icon with a transparent background, and pre-fills the product form.

```
┌──────────────────┐    ┌──────────────────┐    ┌────────────────────────────────┐
│  Step 1          │───►│  Step 2          │───►│  Step 3: PARALLEL EXECUTION    │
│  Product photo   │    │  Barcode photo   │    │  ┌──────────────────────────┐  │
│  (camera input)  │    │  scan/generate/  │    │  │ AI identifies (GPT-4o)   │  │
└──────────────────┘    │  skip            │    │  └──────────────────────────┘  │
                        └──────────────────┘    │  ┌──────────────────────────┐  │
                                                │  │ AI generates (Nano Ban)  │  │
                                                │  └──────────────────────────┘  │
                                                └────────────────────────────────┘
                                                            │
                                                            ▼
                                               ┌────────────────────────┐
                                               │  Step 4 (conditional)  │
                                               │  Suggested category    │
                                               │  (only if AI proposed  │
                                               │  a new category name)  │
                                               └────────────────────────┘
                                                            │
                                                            ▼
                                               ┌────────────────────────┐
                                               │  Step 5: Form          │
                                               │  (pre-filled by AI)    │
                                               └────────────────────────┘
```

**Parallel execution saves ~2-3 seconds** by running identification and icon generation simultaneously.

### AddProductModal Step Layout

| Step | Purpose | When shown |
|------|---------|------------|
| 0 | Entry — Manual add or AI flow choice | Always |
| 1 | AI: Take a product photo | AI flow |
| 2 | AI: Add a barcode (scan / generate / skip) | AI flow |
| 3 | AI: Analyzing (pipeline running) | AI flow |
| 4 | AI: Suggested category | AI flow + only when `suggestedNewCategoryName` is non-null |
| 5 | Product form (`<ProductForm />`) — empty (manual) or pre-filled (AI) | Always |
| 6 | Save success | Always |

**Manual flow:** 0 → 5 → 6

**AI flow:** 0 → 1 → 2 → 3 → (4) → 5 → 6

---

## Pipeline Steps

### Step 1: Photo Capture — Product

**Location:** `src/components/products/AddProductModal.tsx`

When the user taps "Open camera":
1. Image is captured via `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment">`
2. If HEIC/HEIF format detected, converted server-side via `heic-convert` (with `sips` fallback on macOS)
3. EXIF rotation is respected using `createImageBitmap({ imageOrientation: 'from-image' })`
4. Image is resized to max 768px dimension (sufficient for AI processing)
5. Compressed to JPEG at 70% quality (~60-150KB)

After capture the modal automatically advances to the barcode step.

**Why compress:** iPhone photos are typically 12+ megapixels (4-5MB). Compression reduces upload time and API costs.

### Step 2: Barcode Capture

**Location:** `src/components/products/AiBarcodeStep.tsx`

The user can choose one of three options:

| Option | Behavior |
|--------|----------|
| **Scan** | Opens `html5-qrcode` camera scanner; detected value is stored as the barcode |
| **Generate** | Calls `generateInternalProductBarcode()` to create an internal EAN-13 barcode |
| **Skip** | Proceeds with no barcode |

After any choice the modal advances to the analyzing step and `startPipeline()` is called.

### Step 3: Product Identification (AI — parallel)

**Location:** `src/app/api/ai/identify-product/route.ts`

| Property | Value |
|----------|-------|
| Model | OpenAI GPT-4o Mini Vision |
| Cost | ~$0.001 per image |
| Time | ~1-2 seconds |

Runs in parallel with icon generation. The compressed product photo and the user's existing category list are sent to GPT-4o Mini, which:
- Reads the product packaging/label
- Returns a specific product name in English (brand, flavor, variant if visible)
- Either matches an existing category by id, or proposes a new category name

**System prompt behavior:**
- Strongly prefers matching an existing category; only proposes a new one when no reasonable fit exists
- Never returns placeholder names ("Unknown", "Product not identified", etc.); falls back to a best-guess description
- Output is English regardless of product origin

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "categories": [
    { "id": "cat_abc", "name": "Snacks" },
    { "id": "cat_def", "name": "Beverages" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Chicken Flavor Chips",
    "categoryId": "cat_abc",
    "suggestedNewCategoryName": null
  }
}
```

Exactly one of `categoryId` / `suggestedNewCategoryName` is non-null. If the model returns neither (or both), the server falls back to `suggestedNewCategoryName: "Miscellaneous"`.

### Step 4: Emoji Icon Generation (AI — parallel)

**Location:** `src/app/api/ai/generate-icon/route.ts`

| Property | Value |
|----------|-------|
| Model | Nano Banana (Gemini 2.5 Flash Image via fal.ai) |
| Cost | ~$0.039 per image |
| Time | ~2-5 seconds |

Runs in parallel with product identification. Sends the compressed photo to Nano Banana which transforms it into an Apple iOS emoji-style icon (square PNG with white background).

**Prompt:**
```
Transform into a clean Apple iOS emoji style icon. Simple centered single
object, vibrant saturated colors, cartoon-like, pure white background,
stylized like an official Apple emoji. No shadows, no gradients on background.
```

### Step 5: Background Removal

**Location:** `src/app/api/ai/remove-background/route.ts`

| Property | Value |
|----------|-------|
| Model | BiRefNet (via fal.ai) |
| Cost | ~FREE ($0 per compute second) |
| Time | ~1-3 seconds |

Removes the white background from the generated icon to produce a transparent PNG. The icon is then compressed client-side to fit upload size limits.

### Step 6: Icon Compression

**Location:** `src/hooks/useAiProductPipeline.ts`

The final icon is compressed to fit typical upload size limits:
- Target: 70KB max blob size
- Progressive resizing: 512 → 384 → 288 → ... until under limit
- Output: PNG with transparency preserved

---

## Suggested Category Flow

When `suggestedNewCategoryName` is non-null in the pipeline result, the modal inserts Step 4 (`SuggestedCategoryStep`) between analyzing and the form.

**Location:** `src/components/products/SuggestedCategoryStep.tsx`

The step offers two paths:

| Path | Behavior |
|------|---------|
| **Create new category** | Shows a pre-filled text input with the AI's suggestion. User can edit the name and confirm. Calls `useProductSettings.createCategory()`. On success, the new category id is set and the modal advances to the form. |
| **Pick existing category** | Shows a list of existing categories. Selecting one sets that category id and advances to the form. |

If `categoryId` is already non-null (AI matched an existing category), Step 4 is skipped entirely.

---

## Form Consolidation

**Location:** `src/components/products/ProductForm.tsx`

A single shared `<ProductForm />` component is used for all three product creation/editing contexts:

| Context | How form is populated |
|---------|-----------------------|
| Manual add | Form starts empty |
| AI-assisted add | Form pre-filled with `name`, `categoryId`, and `iconPreview` from pipeline result |
| Edit | Form pre-filled with existing product data |

State is managed via `ProductFormContext` (read/written by `useProductForm()`). This eliminated the duplicate form JSX that previously existed separately in `AddProductModal` (steps 1 and 3) and `EditProductModal` (step 0).

---

## Cost Analysis

### Per Product

| Step | Model/Library | Cost |
|------|---------------|------|
| Photo compression | Client-side | FREE |
| HEIC conversion | Server-side (heic-convert) | FREE |
| Product identification | GPT-4o Mini Vision | ~$0.001 |
| Emoji generation | Nano Banana (fal.ai) | ~$0.039 |
| Background removal | BiRefNet (fal.ai) | ~FREE |
| **Total** | | **~$0.04** |

### At Scale

| Products/month | Cost/month |
|----------------|------------|
| 100 | ~$4.00 |
| 500 | ~$20.00 |
| 1,000 | ~$40.00 |
| 10,000 | ~$400.00 |

---

## Caching Strategy

When a user regenerates an icon (doesn't like the first result):
- The original compressed photo is cached in React state (`cachedBgRemoved`)
- Only icon generation + background removal runs again (~$0.039)
- No additional photo processing or product identification needed

Cache is cleared when:
- User takes a new photo
- Product is saved
- User navigates away

---

## API Routes

### POST /api/ai/identify-product

Identifies a product from an image and matches it to user-provided categories.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "categories": [{ "id": "cat_abc", "name": "Snacks" }]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Chicken Flavor Chips",
    "categoryId": "cat_abc",
    "suggestedNewCategoryName": null
  }
}
```

### POST /api/ai/generate-icon

Generates an emoji-style icon from a product image.

**Request:**
```json
{
  "image": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "icon": "data:image/png;base64,..."
  }
}
```

### POST /api/convert-heic

Converts HEIC/HEIF images to JPEG (server-side).

**Request:** FormData with `file` field containing the HEIC file.

**Response:**
```json
{
  "success": true,
  "data": {
    "image": "data:image/jpeg;base64,..."
  }
}
```

**Platform support:**
- **Vercel/Linux/Windows:** Uses `heic-convert` library
- **macOS (fallback):** Uses native `sips` command

---

## Environment Variables

```bash
# Required for product identification
OPENAI_API_KEY=sk-...

# Required for emoji icon generation (Nano Banana on fal.ai)
# Get from: https://fal.ai/dashboard/keys
FAL_KEY=your-fal-api-key
```

---

## Error Handling

| Error | Cause | User-facing message |
|-------|-------|---------------------|
| 400 | Missing image | "Image is required" |
| 500 | API/parse error | "Failed to analyze image" |

---

## Performance Optimizations

| Optimization | Savings | Details |
|--------------|---------|---------|
| **Parallel execution** | ~2-3s | Identification + icon generation run simultaneously |
| **Direct API calls** | ~100-300ms | Using `fal.run()` instead of `fal.subscribe()` (no queue overhead) |
| **Lower resolution** | ~500ms-1s | 768px max dimension (sufficient for AI processing) |
| **Lower JPEG quality** | ~50-100ms | 70% quality (AI generates entirely new images, compression artifacts don't matter) |
| **Server-side bg removal** | ~7-12s | BiRefNet via fal.ai instead of client-side |

---

## Model Alternatives Considered

### Background Removal

| Option | Cost | Speed | Quality | Notes |
|--------|------|-------|---------|-------|
| **BiRefNet (fal.ai)** | ~FREE | 1-3s | Excellent | **CHOSEN** - Server-side, very fast |
| @imgly/background-removal | FREE | 10-30s | Excellent | Client-side, slow on mobile |
| Bria RMBG 2.0 | $0.018 | 1-2s | Excellent | Commercial license included |

### Emoji Generation

| Option | Cost | Speed | Notes |
|--------|------|-------|-------|
| **Nano Banana (fal.ai)** | $0.039 | 2-5s | **CHOSEN** - Best emoji quality, Gemini 2.5 Flash |
| FLUX Dev img2img | $0.03 | 2-3s | Good quality, slightly cheaper |
| Recraft V3 | $0.04 | 3-4s | Too literal |
| GPT Image 1 Mini | $0.005 | 20-25s | Previous choice, slow |
| FLUX Schnell Redux | $0.003 | 1s | Fast but no prompt guidance |

### Product Identification

| Option | Cost | Speed | Quality | Notes |
|--------|------|-------|---------|-------|
| **GPT-4o Mini Vision** | $0.001 | 1-2s | Excellent | **CHOSEN** - Cheapest, great quality |
| GPT-4o Vision | $0.005 | 1-2s | Excellent | Overkill for this task |
| Claude 3 Haiku | $0.001 | 1-2s | Good | Similar pricing |

---

## Files

| File | Purpose |
|------|---------|
| `src/app/api/ai/identify-product/route.ts` | Product identification API (GPT-4o Mini, category matching) |
| `src/app/api/ai/generate-icon/route.ts` | Icon generation API (Nano Banana) |
| `src/app/api/ai/remove-background/route.ts` | Background removal API (BiRefNet) |
| `src/app/api/convert-heic/route.ts` | HEIC to JPEG conversion API |
| `src/hooks/useAiProductPipeline.ts` | Pipeline orchestration with cancellation support |
| `src/components/products/AddProductModal.tsx` | Add product modal (manual + AI flows, 7-step layout) |
| `src/components/products/EditProductModal.tsx` | Edit product modal (uses shared ProductForm) |
| `src/components/products/ProductForm.tsx` | Shared product form (details + barcode tabs) |
| `src/components/products/AiBarcodeStep.tsx` | Barcode capture step (scan / generate / skip) |
| `src/components/products/SuggestedCategoryStep.tsx` | Suggested category step (create or pick existing) |
| `src/app/[businessId]/products/page.tsx` | Products page (mounts AddProductModal, passes categories) |
| `.claude/docs/ai-product-pipeline.md` | This documentation |

---

## References

- [fal.ai Dashboard](https://fal.ai/dashboard) - Get API key here
- [Nano Banana Edit API](https://fal.ai/models/fal-ai/nano-banana/edit/api)
- [BiRefNet API](https://fal.ai/models/fal-ai/birefnet/api) - Background removal
- [@fal-ai/client](https://www.npmjs.com/package/@fal-ai/client)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [heic-convert](https://github.com/catdad-experiments/heic-convert)
