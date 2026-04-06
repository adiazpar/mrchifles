# Barcode Scan-to-Search (Phase 3a)

## Overview

Add a scan button to the products page that lets the user identify a product by scanning its barcode. On a successful decode, look up the product by barcode via the API. If found, open the existing edit modal. If not, populate the search input with the scanned value so the existing empty state explains the absence.

This is the first half of the Phase 3 work in `2026-04-05-product-barcode-system.md`. Sales register scan-to-add (Phase 3b) is deferred.

## Goals

- Reuse the device-aware decode flow already shipped in `BarcodeFields` (hidden file input + `capture="environment"` so phones open the camera and desktops open the file picker).
- Keep the lookup authoritative against the database, not the in-memory product list.
- Add no new user-facing screens. All states are surfaced through controls already present on the products page.
- Factor the scan/decode logic into a shared hook so the third call site (sales register) can reuse it later.

## Non-Goals

- Offline lookup fallback. The app has no offline layer today (no service worker, no IndexedDB, no mutation queue), and adding a single offline-friendly feature would create an inconsistent experience. Offline support is deferred to a dedicated sprint that addresses reads, writes, and UI affordances together.
- "Create product with this barcode" CTA in the empty state. Noted as a follow-up enhancement; not built in this sprint.
- Sales register scan-to-add. Deferred to Phase 3b.
- Refactoring the products page error display. Reuse the existing `error` prop on `ProductsTab`.

## Architecture

### Shared hook: `useBarcodeScan`

New file: `src/hooks/useBarcodeScan.ts`.

Encapsulates the file-picker + `Html5Qrcode.scanFileV2` decode flow currently inlined in `BarcodeFields`. Exposes a small imperative API that any consumer can wire to a button.

**Shape:**
```ts
interface UseBarcodeScanOptions {
  onResult: (payload: { value: string; format: BarcodeFormat | null }) => void
  onError: (message: string) => void
}

interface UseBarcodeScanResult {
  open: () => void           // programmatically clicks the hidden file input
  busy: boolean              // true from file selection until decode completes
  hiddenInput: ReactElement  // the <input type="file"> + scan host element to render
}

function useBarcodeScan(options: UseBarcodeScanOptions): UseBarcodeScanResult
```

**Behavior:**
- Owns a hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment">` and a hidden host `<div>` for the temporary `Html5Qrcode` instance.
- `open()` calls `inputRef.current?.click()`. On phones this opens the rear camera. On desktops it opens the file picker.
- On file selection: instantiate a fresh `Html5Qrcode` with the supported barcode formats, call `scanFileV2(file, false)`, parse the result into `{ value, format }`, fire `onResult`. On failure, fire `onError('No barcode detected in that image. Try a clearer photo.')`.
- Always tears down the `Html5Qrcode` instance and clears the input value in a `finally` block, regardless of success.
- The `busy` flag is set true between file selection and decode completion (success or failure). It is not set while the picker is open, since that's a native OS overlay we can't observe.

The hook does not call any backend or own any error state. Both are the consumer's responsibility, which keeps it pure and reusable.

### `BarcodeFields` refactor

`src/components/products/BarcodeFields.tsx` is updated to consume the hook. The current decode logic (`handleScanFile`, the inline `Html5Qrcode` instance, the busy state, the hidden input markup) is removed. The "Reading..." button label and the inline scan-trigger button stay. Errors continue to flow through `useProductForm().setError`, which is already wired to the modal's standard error banner.

### API change

`src/app/api/businesses/[businessId]/products/route.ts` — extend the `GET` handler to accept an optional `?barcode=<value>` query param.

**Behavior:**
- When `barcode` is present, the handler returns at most one product whose `barcode` column exactly matches the supplied value, scoped to the current `businessId`.
- The response shape is unchanged: `{ success: true, products: Product[] }`. The array contains 0 or 1 element.
- The barcode value is trimmed before comparison. Empty after trim → treated as if the param were not supplied (returns the full list as today).
- The query uses the existing Drizzle query infrastructure. Since `(businessId, barcode)` already has a uniqueness constraint at the application level (duplicate active barcodes are rejected on write), the lookup is a single indexed equality check.
- Authentication and business-scope checks reuse the existing route guards. No new auth surface.

No new endpoint is added. Reusing the existing list route keeps the API surface small and means the products page does not need to know a second URL.

### New icon

A new SVG file already exists at `src/components/icons/Code-Barcode-Scan--Streamline-Freehand.svg`. Wrap it as a TSX component (e.g., `BarcodeScanIcon`) following the pattern of `CameraIcon.tsx`:
- `import type { IconProps } from './types'`
- Functional component accepting `size`, `className`, and spread props
- Inlined paths from the SVG, `fill="currentColor"`
- Exported from `src/components/icons/index.ts`

This icon is used as the scan button glyph in the products page header.

## User Flow

### Successful scan, product found

1. User taps the scan button between the search input and the filter button.
2. Native picker opens (camera on phone, file picker on Mac).
3. User captures or selects an image.
4. Picker dismisses; scan button enters busy state (icon swapped for spinner, button disabled).
5. `scanFileV2` decodes the image and yields a barcode value.
6. Page handler issues `GET /api/businesses/[businessId]/products?barcode=<value>`.
7. Response contains one product. Page calls the existing `handleEditProduct(product)`, opening the edit modal in its normal state.
8. Busy state clears.

### Successful scan, no product found

1-6 same as above.
7. Response contains zero products. Page calls `setSearchQuery(value)`.
8. The existing list filter narrows to nothing matching, and `ProductsTab`'s built-in "No products found matching that criteria" empty state appears.
9. The scanned barcode value is visible in the search input. The user can clear it via the existing X button or open Add Product to create a new one.
10. Busy state clears.

### Scan decoded but lookup failed (network or server error)

1-5 same as the success path.
6. Fetch throws or response is not OK.
7. Page sets the existing `error` state to a message like `Unable to look up barcode. Please try again.`.
8. The error renders in the page-level banner already present at the top of `ProductsTab`.
9. Busy state clears.

### Decode failure (no barcode in image)

1-4 same as the success path.
5. `scanFileV2` rejects.
6. Hook calls `onError('No barcode detected in that image. Try a clearer photo.')`.
7. Page handler routes the message to `setError`, which renders in the page-level error banner.
8. Busy state clears.

### User cancels the picker

1. User taps the scan button.
2. Picker opens.
3. User dismisses without selecting a file.
4. The file input's `onChange` does not fire. Nothing happens. Busy state never sets.

## Components Touched

| File | Change |
|---|---|
| `src/hooks/useBarcodeScan.ts` | **New** — shared scan + decode hook |
| `src/components/icons/BarcodeScanIcon.tsx` | **New** — TSX wrapper around `Code-Barcode-Scan--Streamline-Freehand.svg` |
| `src/components/icons/index.ts` | Export `BarcodeScanIcon` |
| `src/components/products/BarcodeFields.tsx` | Refactor to consume `useBarcodeScan`; drop the inlined decode logic, hidden input markup, and local busy state |
| `src/components/products/ProductsTab.tsx` | Add the scan button between search input and filter button; accept `onScanClick`, `scanBusy`, and `scanHiddenInput` props; render the hidden input alongside the row |
| `src/app/[businessId]/products/page.tsx` | Wire `useBarcodeScan` with an `onResult` callback that performs the lookup and routes to edit modal / search input / error banner; pass props into `ProductsTab` |
| `src/app/api/businesses/[businessId]/products/route.ts` | Extend `GET` to accept optional `?barcode=<value>` query param; trim and exact-match against the business's products |

## Data Flow Diagram

```
User taps Scan button (ProductsTab)
        ↓
useBarcodeScan.open() (in products page via prop)
        ↓
Hidden <input type="file"> click → native picker
        ↓
File selected → busy = true
        ↓
Html5Qrcode.scanFileV2(file)
        ↓
   ┌────────────┴────────────┐
   ↓                         ↓
onResult({ value, format })  onError("No barcode detected...")
   ↓                         ↓
fetch ?barcode=<value>       page setError(message)
   ↓                         ↓
   ┌─────────┬────────┐      banner shows
   ↓         ↓        ↓
1 product  0 products fetch error
   ↓         ↓        ↓
handleEdit setSearch  setError
Product()  Query()    (banner)
```

## Error Handling

All scan-related errors surface through the products page's existing error banner (the `error` prop on `ProductsTab`, rendered at the top of the page body via the `bg-error-subtle` block already in place). No new error UI is introduced.

| Failure mode | Surface |
|---|---|
| Decode failure | Page error banner: `No barcode detected in that image. Try a clearer photo.` |
| Network/server failure on lookup | Page error banner: `Unable to look up barcode. Please try again.` |
| User cancels picker | Silent — no error |
| Decode succeeds but no match | Not an error — search input populates and existing empty state appears |

The error banner is cleared at the start of every new scan attempt so stale messages don't linger.

## Testing

Verified manually on the following paths:

- **Phone, real barcode, product exists** → camera opens, scan decodes, edit modal opens
- **Phone, real barcode, product does not exist** → search input populates, empty state appears
- **Mac, image upload, product exists** → file picker opens, image decodes, edit modal opens
- **Mac, image upload, no decodable barcode** → error banner shows "No barcode detected..."
- **Mac, picker cancelled** → no state change, no error
- **Network offline during lookup** → error banner shows "Unable to look up barcode..."

No automated tests are added in this sprint. The decode pipeline depends on `html5-qrcode` parsing real images and is awkward to mock meaningfully; the API change is a small filter on an existing route and is exercised by manual scan flows.

## Open Items

None. All decisions made during brainstorming are captured above.

## Follow-ups (deferred)

- Empty-state CTA: "Create product with this barcode" → opens AddProductModal pre-filled
- Phase 3b: sales register scan-to-add (third call site for `useBarcodeScan`)
- Offline support sprint: read cache, write queue, sync indicator
