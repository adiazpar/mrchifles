# CSS Patterns Reference

## Table of Contents
1. [The Spacing System](#the-spacing-system)
2. [Fluid Sizing Patterns](#fluid-sizing-patterns)
3. [Shadow Systems](#shadow-systems)
4. [Gradient Techniques](#gradient-techniques)
5. [Layout Patterns](#layout-patterns)
6. [Motion & Animation](#motion--animation)
7. [Glass & Blur Effects](#glass--blur-effects)
8. [Form Input States](#form-input-states)

---

## The Spacing System

### The 4px Base Multiplier

All spacing (margins, padding, gaps) should be multiples of **4px**. This creates predictable visual rhythm and eliminates arbitrary values.

**The Scale:**
```
4px → 8px → 12px → 16px → 24px → 32px → 48px → 64px
```

The scale uses 4px increments for small values (4, 8, 12, 16) then larger jumps for breathing room (24, 32, 48, 64).

| Token | Value | Use Case |
|-------|-------|----------|
| `--space-1` | 4px | Tight: icon-to-text, inline elements |
| `--space-2` | 8px | Compact: form input padding, small gaps |
| `--space-3` | 12px | Default: button padding, list item spacing |
| `--space-4` | 16px | Standard: card padding, component gaps |
| `--space-6` | 24px | Comfortable: section padding, group separation |
| `--space-8` | 32px | Roomy: major section breaks |
| `--space-12` | 48px | Large: page section margins |
| `--space-16` | 64px | Huge: hero padding, major divisions |

### CSS Implementation

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border Radius Scale */
  --radius-sm: 4px;   /* Inputs, small elements */
  --radius-md: 8px;   /* Buttons, tags */
  --radius-lg: 12px;  /* Cards, modals */
  --radius-xl: 16px;  /* Large cards, hero sections */
  --radius-full: 9999px; /* Pills, avatars */
}
```

### Gap vs Margin: Prefer Gap

**Always prefer `gap` over `margin` for internal spacing.**

| Property | Belongs To | Behavior |
|----------|------------|----------|
| `margin` | Child element (intrinsic) | Can cause "double margins" when siblings both have margins |
| `gap` | Parent container (contextual) | Consistent spacing, no doubling, easier reordering |

```css
/* BAD: Margins on children */
.card-list .card {
  margin-bottom: 16px;
}
.card-list .card:last-child {
  margin-bottom: 0; /* Must remove last margin */
}

/* GOOD: Gap on parent */
.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
/* No special handling needed for last child */
```

**When gap works:**
- Flex containers (`display: flex`)
- Grid containers (`display: grid`)

**When you still need margin:**
- Spacing between unrelated elements
- One-off adjustments
- Elements not in flex/grid context

### Proximity Rule

The space *between* groups must always exceed the space *within* groups:

```css
/* WRONG: Equal spacing everywhere */
.form-group { margin-bottom: 16px; }
.form-group label { margin-bottom: 16px; }

/* RIGHT: Proximity-based spacing */
.form-group {
  margin-bottom: var(--space-6); /* 24px between groups */
}
.form-group label {
  margin-bottom: var(--space-1); /* 4px between label and input */
}
```

Visual representation:
```
[Label]      ← 4px (related)
[Input]
             ← 24px (separate groups)
[Label]      ← 4px (related)
[Input]
```

### Fixed vs Fluid Spacing: When to Use Which

| Context | Use | Why |
|---------|-----|-----|
| **Component internals** | Fixed (`--space-1` to `--space-4`) | Button padding, card padding, form gaps — these should stay consistent regardless of viewport |
| **Section spacing** | Fluid (`clamp()`) | Hero padding, section margins — these should breathe on larger screens |
| **Grid gaps** | Fixed or fluid depending on content | Card grids often use fixed; hero layouts often use fluid |

**Rule of thumb:** If it's *inside* a component, use fixed. If it's *between* sections or affects page-level rhythm, consider fluid.

```css
/* Component: Fixed spacing */
.button {
  padding: var(--space-3) var(--space-4); /* Always 12px 16px */
}

/* Section: Fluid spacing */
.hero {
  padding: clamp(2rem, 8vw, 6rem); /* Adapts to viewport */
}
```

---

## Fluid Sizing Patterns

### The clamp() Function

Fluid values that scale smoothly without breakpoints:

```css
/* Syntax: clamp(MIN, PREFERRED, MAX) */

/* Typography */
.hero-title {
  font-size: clamp(2rem, 5vw + 1rem, 4rem);
}

.body-text {
  font-size: clamp(0.875rem, 1vw + 0.5rem, 1.125rem);
}

/* Spacing */
.section {
  padding: clamp(2rem, 8vw, 6rem);
}

/* Container width - for marketing pages and content sites */
.container {
  width: clamp(320px, 90%, 1200px);
  margin-inline: auto;
}
/* NOTE: Do NOT use .container for dashboards/web apps.
   Dashboards need full viewport width. See interface-types.md for dashboard layouts. */
```

### Fluid Spacing Scale

```css
:root {
  --space-xs: clamp(0.25rem, 0.5vw, 0.5rem);
  --space-sm: clamp(0.5rem, 1vw, 0.75rem);
  --space-md: clamp(1rem, 2vw, 1.5rem);
  --space-lg: clamp(1.5rem, 4vw, 3rem);
  --space-xl: clamp(2rem, 6vw, 5rem);
  --space-2xl: clamp(3rem, 10vw, 8rem);
}
```

### Container Queries (Modern)

```css
.card-container {
  container-type: inline-size;
}

.card {
  display: grid;
  grid-template-columns: 1fr;
}

@container (min-width: 400px) {
  .card {
    grid-template-columns: 150px 1fr;
  }
}
```

---

## Shadow Systems

### Dual-Layer Shadow (Ambient + Diffuse)

```css
/* The realistic shadow formula */
.card {
  box-shadow: 
    0px 1px 2px rgba(0, 0, 0, 0.3),    /* Ambient: tight, dark */
    0px 8px 16px rgba(0, 0, 0, 0.1);   /* Diffuse: soft, spread */
}
```

### Elevation Scale

```css
:root {
  /* Elevation 1 - Subtle raise */
  --shadow-sm: 
    0px 1px 2px rgba(0, 0, 0, 0.2),
    0px 2px 4px rgba(0, 0, 0, 0.1);
  
  /* Elevation 2 - Cards, buttons */
  --shadow-md: 
    0px 1px 3px rgba(0, 0, 0, 0.25),
    0px 6px 12px rgba(0, 0, 0, 0.12);
  
  /* Elevation 3 - Dropdowns, popovers */
  --shadow-lg: 
    0px 2px 4px rgba(0, 0, 0, 0.2),
    0px 12px 24px rgba(0, 0, 0, 0.15);
  
  /* Elevation 4 - Modals */
  --shadow-xl: 
    0px 4px 8px rgba(0, 0, 0, 0.2),
    0px 24px 48px rgba(0, 0, 0, 0.2);
}
```

### Colored Shadows (For CTAs)

```css
.button-primary {
  background: hsl(220, 80%, 55%);
  box-shadow: 
    0px 1px 2px rgba(0, 0, 0, 0.2),
    0px 8px 16px hsla(220, 80%, 55%, 0.35);
}
```

### Inset Shadows (For Inputs)

```css
.input {
  box-shadow: inset 0px 2px 4px rgba(0, 0, 0, 0.15);
}

.input:focus {
  box-shadow: 
    inset 0px 2px 4px rgba(0, 0, 0, 0.1),
    0px 0px 0px 3px hsla(220, 80%, 55%, 0.3);
}
```

---

## Gradient Techniques

### Subtle Surface Gradients

```css
/* Simulate surface curvature - rotate hue 10-15° */
.card {
  background: linear-gradient(
    135deg,
    hsl(220, 15%, 18%) 0%,
    hsl(235, 15%, 14%) 100%
  );
}
```

### Gradient Borders

```css
.card-gradient-border {
  background: 
    linear-gradient(var(--bg-surface), var(--bg-surface)) padding-box,
    linear-gradient(135deg, hsl(231, 77%, 66%) 0%, hsl(271, 37%, 46%) 100%) border-box;
  border: 2px solid transparent;
  border-radius: 12px;
}
```

### Gradient Text

```css
.gradient-text {
  background: linear-gradient(135deg, hsl(231, 77%, 66%) 0%, hsl(271, 37%, 46%) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  /* Fallback for older browsers */
  color: hsl(231, 77%, 66%);
}

@supports (background-clip: text) {
  .gradient-text {
    color: transparent;
  }
}
```

### Mesh Gradients (Modern)

```css
.hero {
  background: 
    radial-gradient(at 20% 30%, hsla(220, 80%, 60%, 0.4) 0%, transparent 50%),
    radial-gradient(at 80% 70%, hsla(280, 80%, 60%, 0.3) 0%, transparent 50%),
    radial-gradient(at 50% 50%, hsla(320, 80%, 60%, 0.2) 0%, transparent 50%),
    var(--bg-base);
}
```

### Noise Texture Overlay

```css
.textured {
  position: relative;
}

.textured::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
}
```

---

## Layout Patterns

### Flex Ratios (Not Pixels)

```css
/* Sidebar layout with ratio */
.layout {
  display: flex;
  gap: var(--space-md);
}

.sidebar { flex: 1; min-width: 250px; }
.main { flex: 3; }

/* The sidebar is always 1/4 of content area */
```

### Holy Grail Layout (Grid)

Generic 3-column layout with fluid sidebars. **For web application dashboards, use the specific patterns in [interface-types.md](interface-types.md#web-applications) instead** — they include proper responsive breakpoints and grid-area definitions.

```css
.page {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: minmax(200px, 1fr) minmax(0, 3fr) minmax(200px, 1fr);
  min-height: 100vh;
}

.header { grid-column: 1 / -1; }
.footer { grid-column: 1 / -1; }
.nav { grid-column: 1; }
.main { grid-column: 2; }
.aside { grid-column: 3; }
```

### Auto-Fit Grid (Responsive Cards)

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-md);
}
```

### Scroll Snap Container

```css
.scroll-container {
  scroll-snap-type: y mandatory;
  overflow-y: scroll;
  height: 100vh;
}

.scroll-section {
  scroll-snap-align: start;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Horizontal Scroll (Cards)

```css
.horizontal-scroll {
  display: flex;
  gap: var(--space-md);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: var(--space-sm); /* Space for scrollbar */
  
  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.horizontal-scroll::-webkit-scrollbar {
  display: none;
}

.horizontal-scroll > * {
  scroll-snap-align: start;
  flex-shrink: 0;
}
```

---

## Motion & Animation

### Transition Timing

```css
:root {
  /* Duration scale */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
  
  /* Easing functions */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Button Hover Pattern

```css
.button {
  transition: 
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.button:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
```

### Staggered Entry Animation

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp var(--duration-slow) var(--ease-out) forwards;
  opacity: 0;
}

/* Stagger children */
.animate-in:nth-child(1) { animation-delay: 0ms; }
.animate-in:nth-child(2) { animation-delay: 100ms; }
.animate-in:nth-child(3) { animation-delay: 200ms; }
.animate-in:nth-child(4) { animation-delay: 300ms; }
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Glass & Blur Effects

### Frosted Glass Card

```css
.glass-card {
  background: hsla(220, 20%, 20%, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid hsla(0, 0%, 100%, 0.1);
  border-radius: 16px;
}
```

### Glass Navigation

```css
.glass-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  
  background: hsla(220, 20%, 10%, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.05);
}
```

### Light Leak / Glow Effect

```css
.glow-card {
  position: relative;
}

.glow-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(135deg, hsl(231, 77%, 66%), hsl(271, 37%, 46%));
  z-index: -1;
  filter: blur(20px);
  opacity: 0.5;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.glow-card:hover::before {
  opacity: 0.8;
}
```

---

## Form Input States

### Base Input Styling

```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm);
  line-height: 1.5;

  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);

  color: var(--text-primary);
  transition:
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.input::placeholder {
  color: var(--text-muted);
}
```

### Focus State

```css
.input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px hsla(var(--brand-hue), 80%, 55%, 0.2);
}

/* For keyboard-only focus indication */
.input:focus-visible {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px hsla(var(--brand-hue), 80%, 55%, 0.2);
}
```

### Error State

```css
.input-error {
  border-color: var(--error);
  background: hsla(var(--error-hue), 75%, 55%, 0.05);
}

.input-error:focus {
  border-color: var(--error);
  box-shadow: 0 0 0 3px hsla(var(--error-hue), 75%, 55%, 0.2);
}

.error-message {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--error);
}
```

### Success/Valid State

```css
.input-success {
  border-color: var(--success);
}

.input-success:focus {
  box-shadow: 0 0 0 3px hsla(var(--success-hue), 70%, 45%, 0.2);
}
```

### Disabled State

```css
.input:disabled {
  background: var(--bg-base);
  border-color: var(--border);
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.6;
}
```

### Complete Form Group

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-group + .form-group {
  margin-top: var(--space-4);
}

.label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.label-required::after {
  content: ' *';
  color: var(--error);
}

.help-text {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}
```

### Checkbox & Radio

```css
.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.checkbox:checked {
  background: var(--brand);
  border-color: var(--brand);
}

.checkbox:checked::after {
  content: '';
  display: block;
  width: 5px;
  height: 9px;
  margin: 1px auto;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox:focus-visible {
  box-shadow: 0 0 0 3px hsla(var(--brand-hue), 80%, 55%, 0.2);
}

/* Radio - same but circular */
.radio {
  border-radius: 50%;
}

.radio:checked::after {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  margin: 3px;
  background: white;
  border-radius: 50%;
}
```

### Select Dropdown

```css
.select {
  appearance: none;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  padding-right: var(--space-8); /* Room for arrow */

  font-size: var(--font-size-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;

  /* Custom dropdown arrow */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
}

.select:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px hsla(var(--brand-hue), 80%, 55%, 0.2);
}
```

---

## CSS Pitfalls & Common Mistakes

### Property Resetting Across Breakpoints

CSS properties persist across media queries unless explicitly overridden. This is especially dangerous with positioning:

```css
/* WRONG: top: 0 persists to mobile, breaking bottom positioning */
.sidebar {
  position: sticky;
  top: 0;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    bottom: 0; /* top: 0 still applies! Element stays at top. */
  }
}

/* CORRECT: Explicitly reset all position properties */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: auto;    /* Reset inherited top */
    bottom: 0;
    left: 0;
    right: 0;
  }
}
```

**Rule:** When changing positioning strategy across breakpoints, explicitly set ALL four position properties (top, right, bottom, left) or use `inset`.

### Equal-Width Flex Items in Navigation

When converting a sidebar to a bottom tab bar, nav items must be equal width regardless of content length:

```css
/* WRONG: Items size based on content, causing uneven widths */
.tab-bar {
  display: flex;
  justify-content: space-around; /* Distributes SPACE, not item width */
}

/* CORRECT: Items take equal width */
.tab-bar {
  display: flex;
}

.nav-item {
  flex: 1; /* Each item takes equal share of available space */
  text-align: center;
}
```

**Rule:** For bottom tab bars, always use `flex: 1` on nav items to ensure equal widths regardless of label length.

### Other Common Pitfalls

| Mistake | Problem | Fix |
|---------|---------|-----|
| `z-index` without `position` | z-index ignored | Add `position: relative` |
| `overflow: hidden` on parent | Cuts off positioned children | Use `overflow: visible` or restructure |
| `flex-shrink` not reset | Items shrink unexpectedly | Add `flex-shrink: 0` for fixed items |
| `min-width: 0` missing on flex items | Text overflow doesn't work | Add `min-width: 0` to allow shrinking |
| Forgetting `box-sizing` | Padding adds to width | Use `box-sizing: border-box` globally |
