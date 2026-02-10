# Accessibility Reference

## Table of Contents
1. [Why Accessibility is Non-Negotiable](#why-accessibility-is-non-negotiable)
2. [Color Contrast Requirements](#color-contrast-requirements)
3. [Focus States](#focus-states)
4. [Semantic HTML](#semantic-html)
5. [Screen Reader Support](#screen-reader-support)
6. [Motion and Reduced Motion](#motion-and-reduced-motion)
7. [System Preferences](#system-preferences)

---

## Why Accessibility is Non-Negotiable

Accessibility is not optional polish — it's a **structural system** requirement, like the spacing scale or color algorithm. Production-grade interfaces must be usable by everyone.

**The cognitive laws apply here too:**
- **Fitts's Law**: Touch targets must be large enough for motor impairments
- **Hick's Law**: Screen reader users need clear, simple navigation
- **Contrast**: Visual impairments require sufficient color differentiation

---

## Color Contrast Requirements

### WCAG 2.1 Minimums

| Content Type | Minimum Ratio | Level |
|--------------|---------------|-------|
| Body text | **4.5:1** | AA |
| Large text (18px+ or 14px bold) | **3:1** | AA |
| UI components (buttons, inputs) | **3:1** | AA |
| Enhanced (optional) | **7:1** | AAA |

### Testing Your Palette

Before finalizing colors, verify contrast ratios:

```css
/* PASSES AA (4.5:1) */
--text-primary: hsl(0, 0%, 93%);  /* On --bg-base: hsl(220, 5%, 10%) */
/* Ratio: ~11:1 ✓ */

/* PASSES AA (4.5:1) */
--text-secondary: hsl(0, 0%, 60%); /* On --bg-base: hsl(220, 5%, 10%) */
/* Ratio: ~5.5:1 ✓ */

/* FAILS AA - Too low contrast */
--text-muted: hsl(0, 0%, 35%); /* On --bg-base */
/* Ratio: ~2.8:1 ✗ - Don't use for essential content */
```

### The HSL Contrast Rule of Thumb

For dark mode with L=10% background:
- **Primary text**: L ≥ 85% (ensures ~8:1+)
- **Secondary text**: L ≥ 55% (ensures ~4.5:1)
- **Decorative only**: L < 45% (fails AA — don't use for content)

For light mode with L=98% background:
- **Primary text**: L ≤ 20% (ensures ~8:1+)
- **Secondary text**: L ≤ 45% (ensures ~4.5:1)

### Brand Color Accessibility

Your brand color must pass contrast on its background:

```css
/* Check: Brand on dark background */
--brand: hsl(220, 80%, 55%); /* L=55% on L=10% bg = ~4.7:1 ✓ */

/* If it fails, lighten for dark mode */
--brand-accessible: hsl(220, 80%, 65%); /* Lighter for better contrast */
```

---

## Focus States

**Every interactive element MUST have a visible focus state.** This is non-negotiable for keyboard navigation.

### The Focus-Visible Pattern

Use `:focus-visible` (not `:focus`) to show focus only for keyboard users:

```css
/* Base: Remove default outline */
button, a, input, select, textarea {
  outline: none;
}

/* Focus-visible: Keyboard users see this */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

/* Alternative: Ring style */
.focus-ring:focus-visible {
  box-shadow: 0 0 0 3px var(--bg-base), 0 0 0 5px var(--brand);
}
```

### Focus States by Component

```css
/* Buttons */
.button:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

/* Inputs */
.input:focus-visible {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px hsla(var(--brand-hue), 80%, 55%, 0.2);
}

/* Cards (when clickable) */
.card-link:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 4px;
  border-radius: var(--radius-lg);
}

/* Skip link (for keyboard nav) */
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: var(--space-2) var(--space-4);
  background: var(--brand);
  color: white;
  z-index: 9999;
}

.skip-link:focus {
  top: 0;
}
```

### Focus Order

Ensure logical tab order with proper HTML structure. Avoid `tabindex` values > 0.

```html
<!-- Good: Natural order follows visual order -->
<header>
  <a href="/">Logo</a>
  <nav><!-- Nav links --></nav>
</header>
<main><!-- Main content --></main>

<!-- Bad: Forced tab order creates confusion -->
<div tabindex="3">Third</div>
<div tabindex="1">First</div>
<div tabindex="2">Second</div>
```

---

## Semantic HTML

Semantic HTML provides structure for screen readers and improves SEO. **Use the right element for the job.**

### Structural Elements

```html
<header>    <!-- Site header, contains logo + nav -->
<nav>       <!-- Navigation links -->
<main>      <!-- Primary content (one per page) -->
<article>   <!-- Self-contained content (blog post, card) -->
<section>   <!-- Thematic grouping with heading -->
<aside>     <!-- Sidebar, related content -->
<footer>    <!-- Site footer -->
```

### Headings Hierarchy

Headings must follow logical order — never skip levels for styling:

```html
<!-- Good: Logical hierarchy -->
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Another Section</h2>

<!-- Bad: Skipped levels -->
<h1>Page Title</h1>
  <h4>I wanted smaller text</h4> <!-- Wrong! Use CSS for sizing -->
```

### Interactive Elements

```html
<!-- Buttons for actions -->
<button type="button" onclick="doSomething()">Action</button>

<!-- Links for navigation -->
<a href="/page">Go somewhere</a>

<!-- Never: Divs with click handlers -->
<div onclick="doSomething()">Don't do this</div>
```

### Form Accessibility

```html
<form>
  <!-- Always associate labels with inputs -->
  <label for="email">Email address</label>
  <input type="email" id="email" name="email" required>

  <!-- Group related fields -->
  <fieldset>
    <legend>Shipping Address</legend>
    <!-- Address fields -->
  </fieldset>

  <!-- Describe errors -->
  <input type="email" id="email" aria-describedby="email-error" aria-invalid="true">
  <span id="email-error" role="alert">Please enter a valid email</span>
</form>
```

---

## Screen Reader Support

### Visually Hidden Text

For screen-reader-only content:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Usage:

```html
<!-- Icon-only button needs label -->
<button aria-label="Close dialog">
  <svg><!-- X icon --></svg>
</button>

<!-- Or with sr-only text -->
<button>
  <svg aria-hidden="true"><!-- X icon --></svg>
  <span class="sr-only">Close dialog</span>
</button>
```

### ARIA Attributes

Use ARIA sparingly — semantic HTML is preferred:

```html
<!-- Live regions for dynamic content -->
<div aria-live="polite">
  <!-- Content updates announced to screen readers -->
  Items in cart: 3
</div>

<!-- Expanded/collapsed state -->
<button aria-expanded="false" aria-controls="menu">
  Menu
</button>
<nav id="menu" hidden><!-- Menu content --></nav>

<!-- Current page in navigation -->
<nav>
  <a href="/" aria-current="page">Home</a>
  <a href="/about">About</a>
</nav>
```

### Images

```html
<!-- Informative image: Describe it -->
<img src="chart.png" alt="Sales increased 25% in Q4 2024">

<!-- Decorative image: Empty alt -->
<img src="decoration.svg" alt="">

<!-- Complex image: Link to description -->
<figure>
  <img src="complex-diagram.png" alt="System architecture" aria-describedby="diagram-desc">
  <figcaption id="diagram-desc">
    Detailed description of the diagram...
  </figcaption>
</figure>
```

---

## Motion and Reduced Motion

Respect user preferences for reduced motion:

```css
/* Default: Enable animations */
.animate-in {
  animation: fadeInUp 0.5s ease-out forwards;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Safe Motion

Some motion is safe even with `prefers-reduced-motion`:
- Opacity fades (no spatial movement)
- Color transitions
- Instant state changes

```css
@media (prefers-reduced-motion: reduce) {
  /* Still allow opacity transitions */
  .fade-safe {
    transition: opacity 0.2s ease;
  }
}
```

---

## System Preferences

### Color Scheme Detection

```css
/* Dark mode (default in this skill) */
:root {
  --bg-base: hsl(220, 5%, 10%);
  --text-primary: hsl(0, 0%, 93%);
}

/* Light mode via system preference */
@media (prefers-color-scheme: light) {
  :root {
    --bg-base: hsl(220, 20%, 98%);
    --text-primary: hsl(220, 10%, 8%);
  }
}

/* Or via data attribute (for manual toggle) */
[data-theme="light"] {
  --bg-base: hsl(220, 20%, 98%);
  --text-primary: hsl(220, 10%, 8%);
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  :root {
    --border: hsl(0, 0%, 50%); /* More visible borders */
    --text-secondary: hsl(0, 0%, 70%); /* Stronger secondary text */
  }

  .button {
    border: 2px solid currentColor; /* Visible button edges */
  }
}
```

---

## Accessibility Checklist

Before shipping, verify:

- [ ] **Contrast**: All text meets 4.5:1 (or 3:1 for large text)
- [ ] **Focus**: Every interactive element has visible focus state
- [ ] **Keyboard**: All functionality works with keyboard only
- [ ] **Headings**: Logical h1→h2→h3 hierarchy, no skipped levels
- [ ] **Labels**: All form inputs have associated labels
- [ ] **Alt text**: All informative images have descriptions
- [ ] **Motion**: `prefers-reduced-motion` is respected
- [ ] **Semantics**: Using correct HTML elements (button, a, nav, etc.)
- [ ] **Color alone**: Information isn't conveyed by color alone
- [ ] **Touch targets**: Minimum 48×48px on mobile (satisfies iOS 44pt + Android 48dp)
