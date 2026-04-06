# Modal System Guide

The modal system uses a compound component pattern with built-in multi-step navigation, animated transitions, and footer management.

**Source:** `src/components/ui/modal/`

---

## Quick Reference

```tsx
import { Modal, useMorphingModal } from '@/components/ui'

<Modal isOpen={isOpen} onClose={onClose} onExitComplete={onCleanup}>
  <Modal.Step title="Step One">
    <Modal.Item>
      <p>Content here</p>
    </Modal.Item>
    <Modal.Footer>
      <button className="btn btn-primary flex-1">Save</button>
    </Modal.Footer>
  </Modal.Step>
</Modal>
```

---

## Component API

### `<Modal>`

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Called when X/backdrop/ESC triggers close |
| `onExitComplete` | `() => void` | Called AFTER close animation finishes — use for state cleanup |
| `title` | `string` | Fallback title (overridden by step titles) |
| `size` | `'default' \| 'large'` | Modal width |
| `initialStep` | `number` | Starting step index (default: 0) |

### `<Modal.Step>`

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Step title shown in header |
| `hideBackButton` | `boolean` | Hide the back arrow |
| `backStep` | `number` | Override back button to go to specific step |
| `onBackStep` | `() => void` | Callback when back is pressed (e.g., abort processing) |

### `<Modal.Item>`

Wraps content sections with proper padding and staggered enter animation.

### `<Modal.Footer>`

Renders in a fixed footer area below the content. Animates height when present/absent.

### Navigation Buttons

| Component | Description |
|-----------|-------------|
| `<Modal.NextButton>` | Go to next step |
| `<Modal.BackButton>` | Go to previous step |
| `<Modal.CancelBackButton>` | Go back (or close if first step) |
| `<Modal.GoToStepButton step={n}>` | Jump to specific step |

### `useMorphingModal()` Hook

Access modal state and navigation from any child component:

```tsx
const { currentStep, goToStep, goNext, goBack, lock, unlock } = useMorphingModal()
```

---

## Critical Rules

### 1. Direct Children Only

Modal uses `Children.toArray()` with `_isModalStep` / `_isModalFooter` markers to find steps and footers. **Wrapper components are invisible** to this scan.

```tsx
// CORRECT
<Modal>
  <Modal.Step title="Confirm">
    <Modal.Item><p>Are you sure?</p></Modal.Item>
    <Modal.Footer><button>Yes</button></Modal.Footer>
  </Modal.Step>
</Modal>

// BROKEN - Modal.Step inside wrapper is not detected
<Modal>
  <DeleteConfirmationStep />  {/* Returns Modal.Step — invisible to Modal */}
</Modal>

// BROKEN - Modal.Footer inside wrapper is not detected
<Modal.Step title="Edit">
  <FormWithFooter />  {/* Returns Modal.Item + Modal.Footer — footer not extracted */}
</Modal.Step>
```

**If you need reusable step content:**
1. Extract content-only components that return `<Modal.Item>` elements
2. Extract button components that use `useMorphingModal()` for navigation
3. Keep `<Modal.Step>` and `<Modal.Footer>` as direct children in the modal JSX

### 2. Separate Add and Edit Modals

Do NOT combine add and edit flows into one modal with conditional rendering. The timing issues between `useEffect`-based state population and `initialStep` cause:
- Wrong step on open (form vs mode selection)
- Missing footer buttons (state not set on first render)
- Stale content on reopen

Instead, create separate modals:
```tsx
<AddItemModal isOpen={isOpen && !editingItem} ... />
<EditItemModal isOpen={isOpen && !!editingItem} ... />
```

### 3. Clean Up in onExitComplete, Not onClose

Never reset state in `onClose` — it fires when the close STARTS, causing content to flash empty during the fade-out animation.

```tsx
// WRONG — content blinks during close animation
const handleClose = () => {
  setEditingItem(null)  // Content changes mid-animation!
  setIsOpen(false)
}

// CORRECT — state cleanup after animation finishes
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onExitComplete={() => {
    setEditingItem(null)
    resetForm()
  }}
>
```

### 4. Optimistic Success Steps

For save/delete flows, navigate to the success step BEFORE the API call. Set the animation trigger state first, then fire the API in the background:

```tsx
function SaveButton({ onSubmit }) {
  const { goToStep } = useMorphingModal()

  const handleClick = () => {
    setSaved(true)     // Trigger Lottie animation
    goToStep(3)        // Navigate to success step
    onSubmit()         // API fires in background
  }

  return <button onClick={handleClick}>Save</button>
}
```

The success step gates the Lottie on the trigger state:
```tsx
<Modal.Step title="Saved" hideBackButton>
  <Modal.Item>
    <div className="flex flex-col items-center text-center py-4">
      <div style={{ width: 160, height: 160 }}>
        {saved && (
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
        style={{ opacity: saved ? 1 : 0 }}
      >
        Changes saved!
      </p>
    </div>
  </Modal.Item>
  <Modal.Footer>
    <button onClick={onClose} className="btn btn-primary flex-1">Done</button>
  </Modal.Footer>
</Modal.Step>
```

**Available Lottie animations:**
- `/animations/success.json` — green checkmark (save, create, receive)
- `/animations/error.json` — red X (deletions)

### 5. Step Indices Are Positional

Steps are numbered by their order as direct children of `<Modal>`. If you conditionally render steps, the indices shift and `goToStep(n)` breaks.

```tsx
// DANGEROUS — step indices change based on canDelete
<Modal.Step title="Form">...</Modal.Step>
{canDelete && <Modal.Step title="Confirm Delete">...</Modal.Step>}
<Modal.Step title="Success">...</Modal.Step>  {/* Is this step 1 or 2? */}

// SAFE — always render all steps, gate content instead
<Modal.Step title="Form">...</Modal.Step>
<Modal.Step title="Confirm Delete">...</Modal.Step>  {/* Always present */}
<Modal.Step title="Success">...</Modal.Step>          {/* Always step 2 */}
```

---

## TabContainer

For modals that need tabs within a single step (e.g., Details / Barcode tabs), use `TabContainer` from `@/components/ui`:

```tsx
import { TabContainer } from '@/components/ui'

<Modal.Step title="Edit product">
  {/* Tab buttons - add morph-item class so they fade with content */}
  <div className="section-tabs section-tabs--modal morph-item">
    <button onClick={() => setActiveTab('details')} className={`section-tab ${activeTab === 'details' ? 'section-tab-active' : ''}`}>
      Details
    </button>
    <button onClick={() => setActiveTab('barcode')} className={`section-tab ${activeTab === 'barcode' ? 'section-tab-active' : ''}`}>
      Barcode
    </button>
  </div>

  <TabContainer activeTab={activeTab}>
    <TabContainer.Tab id="details">
      <Modal.Item>...</Modal.Item>
      <Modal.Item>...</Modal.Item>
    </TabContainer.Tab>
    <TabContainer.Tab id="barcode">
      <Modal.Item>...</Modal.Item>
    </TabContainer.Tab>
  </TabContainer>

  <Modal.Footer>...</Modal.Footer>
</Modal.Step>
```

**How it works:**
- All tab content renders in a CSS grid stacked in the same cell
- Inactive tabs are `visibility: hidden` with `pointer-events: none`
- The container sizes to the tallest tab automatically (no resize on switch)
- Modal.Items inside tabs still receive enter/exit animations (via descendant selectors)

**Tabs styling:**
- Use `section-tabs--modal` modifier for modal context (no sticky positioning, no top padding)
- Add `morph-item` class to the tabs container so it participates in step transition animations

---

## Examples

**Simple edit modal:** `src/components/providers/ProviderModal.tsx`
**Add + AI flow:** `src/components/products/AddProductModal.tsx`
**Edit with delete/inventory:** `src/components/products/EditProductModal.tsx`
**Multi-step with review:** `src/components/products/NewOrderModal.tsx`
**Team management:** `src/app/[businessId]/team/page.tsx`
