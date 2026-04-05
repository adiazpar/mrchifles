# Barcode/QR Code System

## Overview

Attach physical barcodes or QR codes to products for identification, display, search, and printing.

## Current State

- `barcode` field exists in products schema (nullable string, indexed)
- `BarcodeScanner` component exists using `html5-qrcode` (camera-based)
- Barcode field in Add/Edit product modals with scan button
- API routes accept barcode on create/update
- Form context tracks barcode with change detection
- No format detection, display, copy, print, or search integration yet

## Scope

### Phase 1: Attach + Display (current sprint)

**Scanner improvements:**
- Detect scanned format (QR, UPC, EAN, Code128, etc.) and store alongside value
- Store as `barcode` (value) + `barcodeFormat` (format string) in DB
- Schema change: add `barcode_format` column to products table

**Display in modals:**
- After scanning, show the rendered barcode/QR image in the edit modal
- Use `bwip-js` for traditional barcodes (UPC, EAN, Code128, etc.)
- Use `qrcode` package for QR codes
- Render as inline SVG or canvas below the scan button
- Show the raw value as text below the image

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
  - Barcode/QR image (rendered at print-appropriate size)
  - Raw value text below
- Uses `window.print()` with a print-only stylesheet
- Consider batch printing multiple products

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
- `html5-qrcode` (already installed) - camera scanning, returns format + value
- `bwip-js` - barcode generation (UPC, EAN, Code128, Code39, etc.)
- `qrcode` - QR code generation

### Data Model
```
products.barcode       TEXT  -- the raw value (e.g., "7501234567890")
products.barcode_format TEXT  -- the format (e.g., "EAN_13", "QR_CODE", "CODE_128")
```

### Format Detection
`html5-qrcode` returns the format in its callback. Supported formats:
- QR_CODE
- EAN_13, EAN_8
- UPC_A, UPC_E
- CODE_128, CODE_39, CODE_93
- CODABAR
- ITF
- DATA_MATRIX
- AZTEC
- PDF_417

### Rendering Logic
```
if format starts with "QR" or "DATA_MATRIX" or "AZTEC":
  use qrcode library to render
else:
  use bwip-js to render (barcode format)
```

## Implementation Order

1. Add `barcode_format` to schema + DB migration
2. Update scanner to capture and store format
3. Install `bwip-js` and `qrcode`
4. Create `BarcodeDisplay` component that renders based on format
5. Integrate display into Edit modal (below scan button when barcode exists)
6. Add copy-to-clipboard button
7. Add print functionality
8. Add barcode indicator to product list items
9. (Future) Search by scan on products page
10. (Future) Sales register scan-to-add
