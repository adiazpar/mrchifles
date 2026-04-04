# @dnd-kit Capabilities

Reference for what `@dnd-kit` can do beyond sortable lists.

## Installed Packages

- `@dnd-kit/core` - drag-and-drop engine
- `@dnd-kit/sortable` - sortable list preset
- `@dnd-kit/utilities` - CSS transform helpers

## Currently Used

- **Sortable vertical list** - product category reordering in Product Settings modal

## Other Capabilities

### Sortable Grids
Reorder items in a 2D grid layout. Uses `rectSortingStrategy` instead of `verticalListSortingStrategy`.

**Use case:** Reordering product images, dashboard widgets, or icon grids.

### Multiple Containers (Kanban)
Drag items between different lists/columns. Each column is a droppable container.

**Use case:** Order status boards (pending -> in progress -> complete), category assignment by dragging products between category buckets.

### Drag Overlay
Renders a floating copy of the dragged item that follows the cursor, while the original stays in place. Better visual feedback than moving the actual element.

**Use case:** Any drag interaction where you want a polished "lifted" appearance.

### Collision Detection Strategies
- `closestCenter` - default, best for lists
- `closestCorners` - better for grids
- `rectIntersection` - best for free-form layouts
- `pointerWithin` - precise pointer-based detection

### Accessibility
Built-in keyboard support via `KeyboardSensor`:
- Tab to focus drag handle
- Space/Enter to pick up
- Arrow keys to move
- Space/Enter to drop
- Escape to cancel

Screen reader announcements are automatic.

### Sensors
- `PointerSensor` - mouse and trackpad
- `TouchSensor` - mobile touch with configurable delay/tolerance
- `KeyboardSensor` - keyboard navigation
- Custom sensors possible (e.g., long-press only)

### Activation Constraints
Control when dragging starts:
- `distance` - minimum pixels moved before drag activates (prevents accidental drags)
- `delay` - minimum hold time before drag activates (good for touch)
- `tolerance` - allowed movement during delay period

### Modifiers
Transform the drag behavior:
- `restrictToVerticalAxis` - lock to vertical movement only
- `restrictToHorizontalAxis` - lock to horizontal
- `restrictToParentElement` - keep within container bounds
- `snapCenterToCursor` - snap item center to cursor position

Install: `@dnd-kit/modifiers`

### Tree / Nested Sorting
Sort items in a tree structure with indentation levels. Requires custom implementation on top of sortable.

**Use case:** Nested category hierarchies, folder structures.

## Performance Notes

- Uses CSS transforms (GPU-accelerated, no layout thrashing)
- Virtualization-compatible (works with windowed lists)
- Minimal re-renders (only dragged and displaced items re-render)
