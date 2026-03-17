# AI Pipeline Optimization Plan

This document outlines implemented optimizations and future strategies for improving speed and reducing costs in the AI product creation pipeline.

## Implemented Optimizations

These optimizations are already in production:

| Optimization | Savings | Details | Files Modified |
|--------------|---------|---------|----------------|
| **Parallel execution** | ~2-3s | Identification + icon generation run simultaneously via `Promise.all()` | `useAiProductPipeline.ts` |
| **Direct API calls** | ~100-300ms | Using `fal.run()` instead of `fal.subscribe()` (no queue overhead) | `generate-icon/route.ts`, `remove-background/route.ts` |
| **Lower resolution** | ~500ms-1s | 768px instead of 1024px (sufficient for AI processing) | `useImageCompression.ts` |
| **Lower JPEG quality** | ~50-100ms | 70% instead of 80% (sufficient for AI processing) | `useImageCompression.ts` |
| **Server-side bg removal** | ~7-12s | BiRefNet via fal.ai instead of client-side | `remove-background/route.ts` |

**Total estimated time savings: ~10-16 seconds per product scan**

---

## App-Level Code Optimizations (Future)

### 1. Perceptual Image Hashing (Duplicate Detection)

**Problem:** Users might scan the same product multiple times, wasting API calls.

**Solution:** Use perceptual hashing (pHash) to detect near-duplicate images *before* calling AI APIs.

```typescript
// Install: npm install sharp-phash
import phash from 'sharp-phash'

async function getImageHash(imageBuffer: Buffer): Promise<string> {
  return await phash(imageBuffer)
}

function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++
  }
  return distance
}

// If Hamming distance <= 3, images are likely duplicates
// Suggest: "This looks like [existing product]. Use existing?"
```

**Savings:** Prevents 100% of duplicate API calls. Real-world estimate: 10-30% of product scans could be duplicates.

**Implementation effort:** Medium (requires storing hashes in PocketBase)

---

### 2. Client-Side Pre-Validation

**Problem:** Invalid images (too blurry, too dark, no product visible) waste API calls.

**Solution:** Add client-side checks before submitting:

```typescript
// Blur detection using Laplacian variance
async function isImageBlurry(imageData: ImageData): Promise<boolean> {
  // Calculate Laplacian variance
  // If variance < threshold (e.g., 100), image is blurry
  return variance < 100
}

// Brightness check
function isImageTooDarkOrBright(imageData: ImageData): boolean {
  const avgBrightness = calculateAverageBrightness(imageData)
  return avgBrightness < 30 || avgBrightness > 225
}
```

**Savings:** Prevents 5-15% of wasted API calls on unusable images.

**Implementation effort:** Low

---

### 3. Manual Name Option (Skip Identification)

**Problem:** GPT-4o Mini Vision costs $0.001 per image for identification.

**Solution:** Allow users to manually enter product name, skipping the identification step.

```typescript
// In startPipeline:
if (manualName) {
  // Skip identification API call entirely
  const productName = manualName
  // Only run icon generation
}
```

**Savings:** $0.001 per product (100% of identification cost when used)

**Implementation effort:** Low

---

### 4. Debounced Camera Input

**Problem:** Users might accidentally trigger multiple scans rapidly.

**Solution:** Debounce the camera input (300-500ms) to prevent accidental double-submissions.

```typescript
import { useDebouncedCallback } from 'use-debounce'

const debouncedStartPipeline = useDebouncedCallback(
  (imageBase64: string) => startPipeline(imageBase64),
  300
)
```

**Savings:** Prevents accidental duplicate API calls.

**Implementation effort:** Low

---

## Cost Savings Strategies at Scale

### Tier 1: Multi-Tenant Cost Attribution

When distributing to multiple businesses, track API costs per tenant:

```typescript
// Tag each API request with tenant_id for cost tracking
// Store in a usage_logs collection in PocketBase

interface UsageLog {
  tenant_id: string
  timestamp: Date
  api_endpoint: 'identify' | 'generate-icon' | 'remove-bg'
  cost: number
  success: boolean
}

// On each API call:
await pb.collection('usage_logs').create({
  tenant_id: currentTenant.id,
  timestamp: new Date(),
  api_endpoint: 'generate-icon',
  cost: 0.039,
  success: true,
})
```

**Benefits:**
- Per-tenant billing (pass costs to customers)
- Abuse detection (identify high-usage tenants)
- Usage analytics per business

---

### Tier 2: Caching Strategies

| Strategy | Savings | Implementation |
|----------|---------|----------------|
| **Product icon cache** | 100% on repeat | Store generated icons in PocketBase, never regenerate for same product |
| **Perceptual hash dedup** | 10-30% | Detect similar products across tenant, suggest reuse |
| **Semantic caching** | 30-50% | Cache similar product names for identification (e.g., "Chifles Pollo" variations) |

---

### Tier 3: Model Routing (At Scale)

At 50,000+ products/month, route requests based on complexity:

```typescript
// Simple products (single item, clear label)
// → Use GPT-4o Mini for identification only
// → Skip identification if product name is manually entered

// Complex products (bundles, unclear labels)
// → Full pipeline with identification

function getModelTier(image: string): 'simple' | 'complex' {
  // Could use image classification or user selection
  return 'simple'
}
```

**Savings:** 50-70% reduction by routing simple cases to cheaper/no AI.

---

### Tier 4: Pricing Tiers for End Users

Recommended pricing structure:

| Tier | Price | Products/Month | Your Cost | Margin |
|------|-------|----------------|-----------|--------|
| Free | $0 | 10 | $0.40 | Loss leader |
| Starter | $5/mo | 100 | $4.00 | 20% |
| Pro | $15/mo | 500 | $20.00 | -25% (value in other features) |
| Business | $40/mo | 2,000 | $80.00 | Bundle with analytics, support |

**Key insight:** At scale, AI cost becomes negligible compared to value provided. Focus on volume and bundling with other features.

---

### Tier 5: Volume Discounts (fal.ai)

At 50,000+ images/month:
- Contact fal.ai for enterprise pricing (typically 20-40% discount)
- Consider self-hosting BiRefNet (already ~$0 anyway)
- Batch processing for non-urgent requests (50% discount on some providers)

---

### Tier 6: Alternative Models at Scale

| Current | Alternative | Savings | Trade-off |
|---------|-------------|---------|-----------|
| Nano Banana ($0.039) | FLUX Dev img2img ($0.03) | 23% | Slightly different style |
| Nano Banana ($0.039) | GPT Image 1 Mini ($0.005) | 87% | Much slower (20-25s) |
| GPT-4o Mini Vision ($0.001) | Skip if manual name | 100% | Requires user input |

---

## Implementation Priority

### Immediate (No Code Changes Needed)
1. Product icon caching - already stored in PocketBase, just don't regenerate

### Short-term (Easy Wins)
2. **Manual name option** - Skip identification if user types name
3. **Debounced camera input** - Prevent accidental double-scans
4. **Client-side blur detection** - Reject unusable images before API call

### Medium-term (Multi-Tenant Prep)
5. **Tenant cost tracking** - Essential for billing
6. **Usage quotas** - Prevent abuse, enable tiered pricing
7. **Perceptual hashing** - Detect duplicate products

### Long-term (Scale)
8. **Model routing** - Route simple cases to cheaper options
9. **Enterprise pricing** - Negotiate with fal.ai at 50k+/month
10. **Batch processing** - For non-time-sensitive operations

---

## Current Cost Structure

### Per Product (Current)

| Step | Cost |
|------|------|
| Photo compression | FREE |
| HEIC conversion | FREE |
| Product identification (GPT-4o Mini) | $0.001 |
| Emoji generation (Nano Banana) | $0.039 |
| Background removal (BiRefNet) | ~FREE |
| **Total** | **~$0.04** |

### At Scale (Projected)

| Products/Month | Current Cost | With Optimizations |
|----------------|--------------|-------------------|
| 100 | $4.00 | $3.00 (-25%) |
| 1,000 | $40.00 | $28.00 (-30%) |
| 10,000 | $400.00 | $240.00 (-40%) |
| 50,000 | $2,000.00 | $1,000.00 (-50%) |

---

## References

- [fal.ai Pricing](https://fal.ai/pricing)
- [fal.ai Synchronous vs Queue](https://fal.ai/docs/model-apis/model-endpoints/synchronous-requests)
- [10 AI Cost Optimization Strategies for 2026](https://www.aipricingmaster.com/blog/10-AI-Cost-Optimization-Strategies-for-2026)
- [Perceptual Hashing in Node.js](https://www.brand.dev/blog/perceptual-hashing-in-node-js-with-sharp-phash-for-developers)
- [AI API Pricing Comparison 2026](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026)
- [How to Control Token Usage and Cut AI API Costs](https://www.edenai.co/post/how-to-control-token-usage-and-cut-costs-on-ai-apis)
