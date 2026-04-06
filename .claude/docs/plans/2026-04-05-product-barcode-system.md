# Product Barcode System

## Overview

Attach physical product barcodes to products for identification, display, search, generation, and printing.

## Current State

- `barcode` and `barcode_format` exist in products schema
- `barcode_source` exists in products schema
- Barcode create/update flows persist value, format, and source
- `BarcodeScanner` is wired for 1D product barcodes and auto-detects the scanned format
- Add/Edit product modals now support scan, generate, and manual barcode attachment
- Manual and generated barcodes default to `CODE_128`
- Barcode preview is rendered in the barcode tab from stored `barcode` + `barcodeFormat`
- Barcode tab metadata now distinguishes `scanned`, `generated`, and `manual` sources
- Print action is wired from the barcode tab and opens the native browser print flow
- Product form context tracks barcode changes including format
- Duplicate active barcodes are rejected per business
- Copy and scan-to-search are still pending

## Scope

### Phase 1: Attach + Display (current sprint)

**Scanner improvements:**
- Detect scanned format (UPC, EAN, Code128, etc.) and store alongside value
- Store as `barcode` (value) + `barcodeFormat` (format string) in DB
- Store `barcodeSource` to track whether the barcode was scanned, generated, or entered manually
- Treat barcode scanning as the primary attachment flow for products with existing packaging codes
- Do not require users to manually identify the barcode type after a scan

**Barcode generation:**
- Add a "Generate code" action for products that do not already have a physical barcode
- Generate internal product barcodes using `CODE_128`
- Store generated values in the same `barcode` + `barcodeFormat` fields as scanned values
- Allow users to regenerate before saving if needed
- Use `CODE_128` as the default for manual barcode entry unless the user explicitly changes the type

**Display in modals:**
- After scanning or generating, show the rendered barcode image in the edit modal
- Use `bwip-js` for barcode rendering (UPC, EAN, Code128, etc.)
- Render as inline SVG or canvas below the scan button
- Show the raw value as text below the image
- Show the barcode format as supporting metadata
- Keep barcode type selection as an advanced/manual override, not a required scanner step
- Reuse the same rendering path for future print output

**Display in product list:**
- Small barcode indicator icon on products that have a barcode attached
- No inline barcode image (too small to be useful)

### Phase 2: Copy + Print

**Copy to clipboard:**
- Copy button next to barcode display
- Copies the raw barcode value string

**Print barcode label:**
- Print button next to barcode display
- Opens a print-friendly view with:
  - Product name
  - Barcode image (rendered at print-appropriate size)
  - Raw value text below
- Uses `window.print()` with a print-only stylesheet
- Consider batch printing multiple products
- Status: implemented for single-barcode printing from the product modal

### Phase 3: Search + Sales (future)

**Product search by scan:**
- Scan icon button on products page next to search/filter
- Opens camera scanner
- Scans barcode -> queries DB for matching product -> opens edit modal
- If no match found, show "Product not found" message

**Sales integration:**
- Scan button on sales register page
- Scan barcode -> find product -> add to cart
- Fast checkout flow for physical retail

## Technical Decisions

### Libraries
- `html5-qrcode` (already installed) - camera scanning, used for 1D barcode capture
- `bwip-js` - barcode generation (UPC, EAN, Code128, Code39, etc.)

### Data Model
```
products.barcode       TEXT  -- the raw value (e.g., "7501234567890")
products.barcode_format TEXT  -- the format (e.g., "EAN_13", "UPC_A", "CODE_128")
products.barcode_source TEXT  -- 'scanned', 'generated', or 'manual'
```

### Format Detection
`html5-qrcode` returns the format in its callback. Supported formats:
- EAN_13, EAN_8
- UPC_A, UPC_E
- CODE_128, CODE_39, CODE_93
- CODABAR
- ITF

### Rendering Logic
```
use bwip-js to render the barcode based on barcodeFormat
default generated format: CODE_128
default manual-entry format: CODE_128
scanned format: use the scanner-detected format
prefer UPC/EAN only when the scanned barcode already uses those standards
```

## Implementation Order

1. Add `barcode_format` to schema + DB migration
2. Update scanner to capture and store barcode format
3. Install `bwip-js`
4. Create barcode value generator for internal product labels (`CODE_128`)
5. Create `BarcodeDisplay` component that renders based on format
6. Integrate scan/generate/display into Add/Edit product modals
7. Add print functionality
8. Add copy-to-clipboard button
9. Add barcode indicator to product list items
10. (Future) Search by scan on products page
11. (Future) Sales register scan-to-add
