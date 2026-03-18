# MorphingModal Design Spec

**Date:** 2026-03-11
**Status:** Approved
**Replaces:** `src/components/ui/modal.tsx`

## Overview

A reusable multi-step modal component with smooth morphing transitions between steps. Replaces the existing Modal component with a unified solution that handles both single-step and multi-step flows.

### Goals

- Reusable orchestration layer for N-step modal flows
- Bidirectional navigation with directional animations
- Content-agnostic (modal doesn't know about form fields, buttons, etc.)
- Drop-in replacement for existing Modal component
- Extract and generalize the morphing pattern from CloseDrawerModal

### Non-Goals

- Form validation (consumer responsibility)
- Specific button configurations (consumer provides buttons)
- Step persistence/history (steps reset on close)

## Component API

### Basic Usage (Single-Step)

Backwards compatible with current Modal usage:

```tsx
<Modal isOpen={isOpen} onClose={onClose} title="Agregar producto">
  <p>Simple content, no steps needed</p>
  <Modal.Footer>
    <Button onClick={onClose}>Cancelar</Button>
    <Button onClick={handleSave}>Guardar</Button>
  </Modal.Footer>
</Modal>
```

### Multi-Step Usage

```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Step title="Paso 1">
    <Modal.Item>Field A</Modal.Item>
    <Modal.Item>Field B</Modal.Item>
    <Modal.Footer>
      <Modal.CancelBackButton />
      <Modal.NextButton>Siguiente</Modal.NextButton>
    </Modal.Footer>
  </Modal.Step>

  <Modal.Step title="Paso 2">
    <Modal.Item>Review content</Modal.Item>
    <Modal.Footer>
      <Modal.BackButton />
      <Button onClick={handleSubmit}>Confirmar</Button>
    </Modal.Footer>
  </Modal.Step>
</Modal>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Called on close/cancel |
| `title` | `string` | - | For single-step modals only |
| `size` | `'default' \| 'large'` | `'default'` | Modal width |
| `initialStep` | `number` | `0` | Starting step |
| `children` | `ReactNode` | required | Content or `<Modal.Step>` elements |

### Sub-components

| Component | Purpose |
|-----------|---------|
| `Modal.Step` | Wrapper for each step, has `title` prop |
| `Modal.Item` | Animated content item (staggered animation) |
| `Modal.Footer` | Footer container (animated with content) |
| `Modal.BackButton` | Pre-wired back button |
| `Modal.NextButton` | Pre-wired next button |
| `Modal.CancelBackButton` | Shows "Cancelar" on step 0, "Atras" otherwise |

## State Machine

### Internal State

```typescript
interface ModalState {
  currentStep: number
  targetStep: number
  phase: 'idle' | 'exiting' | 'transitioning' | 'entering'
  direction: 'forward' | 'backward'
  isLocked: boolean
}
```

### Phase Transitions

```
idle ──► exiting ──► transitioning ──► entering ──► idle
        (120ms+)     (300ms)          (120ms+)
```

**Timing:**

| Phase | Duration | Notes |
|-------|----------|-------|
| Exiting | 120ms + (items - 1) * 40ms | Staggered fade out |
| Transitioning | 300ms | Height collapse/expand via CSS Grid |
| Entering | 120ms + (items - 1) * 40ms | Staggered fade in |

### useMorphingModal Hook

```typescript
const {
  // State
  currentStep,
  stepCount,
  isFirstStep,
  isLastStep,
  isLocked,
  isTransitioning,

  // Navigation
  goNext,      // () => void
  goBack,      // () => void
  goToStep,    // (n: number) => void

  // Lock control
  lock,        // () => void
  unlock,      // () => void
} = useMorphingModal()
```

### Lock Behavior

When `isLocked === true`:
- ESC key disabled
- Backdrop click disabled
- `goBack()` / `goToStep()` no-op
- Close button disabled
- Back icon in header disabled

Consumer should disable their own buttons by checking `isLocked`.

## Header Behavior

### Single-Step Modal
```
┌────────────────────────────────────────┐
│  Title                             [×] │
└────────────────────────────────────────┘
```

### Multi-Step Modal (Step 0)
```
┌────────────────────────────────────────┐
│  Step Title                        [×] │
└────────────────────────────────────────┘
```

### Multi-Step Modal (Step > 0)
```
┌────────────────────────────────────────┐
│  [←]  Step Title                   [×] │
└────────────────────────────────────────┘
```

- Back icon appears when `currentStep > 0`
- Clicking back icon calls `goBack()`
- Back icon disabled when `isLocked` or `isTransitioning`
- Title comes from current `<Modal.Step title="...">` prop

## CSS Animations

### Forward Direction (step N → N+1)
- **Exit:** Items fade out + translate up (-8px)
- **Enter:** Items fade in + translate up from below (+12px → 0)

### Backward Direction (step N → N-1)
- **Exit:** Items fade out + translate down (+8px)
- **Enter:** Items fade in + translate down from above (-12px → 0)

### CSS Classes

```css
/* Forward transitions (existing) */
.morph-content-exit        /* fade out upward */
.morph-content-enter       /* fade in from below */

/* Backward transitions (new) */
.morph-content-exit-back   /* fade out downward */
.morph-content-enter-back  /* fade in from above */

/* Height animation (existing) */
.morph-panel
.morph-panel-visible       /* grid-template-rows: 1fr */
.morph-panel-hidden        /* grid-template-rows: 0fr */
```

### Dynamic Stagger Delays

Apply delays via inline styles instead of nth-child CSS:

```tsx
<div
  className="morph-item"
  style={{ animationDelay: `${index * 40}ms` }}
>
```

This supports any number of items without CSS limitations.

## File Structure

```
src/components/ui/
├── modal/
│   ├── index.ts              # Public exports
│   ├── Modal.tsx             # Main component
│   ├── ModalContext.tsx      # Context + useMorphingModal hook
│   ├── ModalStep.tsx         # Step wrapper
│   ├── ModalItem.tsx         # Animated item
│   ├── ModalFooter.tsx       # Footer wrapper
│   ├── ModalButtons.tsx      # BackButton, NextButton, CancelBackButton
│   └── types.ts              # Shared types
```

Replaces `src/components/ui/modal.tsx`.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `goNext()` on last step | No-op |
| `goBack()` on first step | No-op |
| `goToStep(n)` where n > stepCount | Clamp to last step |
| `goToStep(n)` where n < 0 | Clamp to 0 |
| Close during transition | Blocked until transition completes |
| Rapid navigation calls | Ignored while `isTransitioning` |
| Modal opens mid-transition | Reset to `initialStep`, phase = idle |
| Step has 0 items | No stagger, instant transition |

## Migration Plan

### Breaking Changes

| Old API | New API |
|---------|---------|
| `<Modal title="X">content</Modal>` | Same (backwards compatible) |
| `footer={<Buttons />}` prop | `<Modal.Footer>` child |

### CloseDrawerModal Refactor

After implementing the new Modal, refactor CloseDrawerModal to use it:
- Remove internal phase state machine (Modal handles it)
- Remove morph CSS class management
- Keep business logic (balance calculations, API calls)
- Wrap content in `<Modal.Step>` and `<Modal.Item>`

## Testing Strategy

### Unit Tests
- Phase transitions fire in correct order
- Navigation functions respect bounds
- Lock state prevents navigation/close
- Direction calculated correctly for forward/backward

### Integration Tests
- Multi-step flow completes successfully
- Backward navigation works
- Single-step modal behaves like old Modal
- ESC key respects lock state

### Visual Tests
- Animations render correctly in both directions
- Stagger timing looks smooth
- Height transitions don't flash
- Back icon appears/disappears correctly

## Open Questions

None - all decisions made during design review.

## Appendix: Design Decisions

1. **Compound components over config objects** - More React-idiomatic, easier to read
2. **Unified component** - Single Modal handles both simple and multi-step cases
3. **Reverse animations for backward** - Spatial consistency helps users orient
4. **Sequential + jump navigation** - Flexible without being complex
5. **Static steps with conditional rendering** - Consumer handles skip logic
6. **Lock state in Modal** - Prevents common close-during-submit bugs
7. **Dynamic stagger via inline styles** - No CSS item count limitations
8. **Folder structure** - Focused files easier to maintain than one large file
