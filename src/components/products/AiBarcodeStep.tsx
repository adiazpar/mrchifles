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
