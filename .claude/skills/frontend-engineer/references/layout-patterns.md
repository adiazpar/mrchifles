# Layout Patterns Reference

## Table of Contents
1. [Bento Box Layouts](#bento-box-layouts)
2. [Asymmetrical Patterns](#asymmetrical-patterns)
3. [Breaking the Grid Intentionally](#breaking-the-grid-intentionally)
4. [Responsive Transformations](#responsive-transformations)

---

## Bento Box Layouts

**Bento ≠ 2x2 grid.** A 2x2 of equal boxes is still boring symmetry.

True bento requires **one dominant element** that breaks the grid:

```css
/* WRONG: 2x2 equal grid (not bento) */
.bad-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  /* All 4 cells equal = boring */
}

/* RIGHT: Dominant hero + supporting elements */
.dashboard {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto auto;
  gap: var(--space-4);
}

.balance-card {
  grid-row: span 2; /* SPANS 2 ROWS - visually dominant */
}

.transactions {
  grid-row: span 2; /* Fills right side */
}

.quick-actions {
  grid-column: span 2; /* FULL WIDTH strip at bottom */
}
```

**The rule:** At least one element must span multiple rows OR columns. If everything fits in equal boxes, it's not bento.

---

## Asymmetrical Patterns

| Pattern | Structure | Use Case |
|---------|-----------|----------|
| **2:1 Split** | Large left, narrow right | Dashboard with main content + sidebar data |
| **Hero + Grid** | Full-width hero, grid below | Landing pages, portfolios |
| **Staggered** | Alternating wide/narrow rows | Editorial, case studies |
| **Masonry** | Variable heights, fitted | Image galleries, card collections |
| **F-Pattern** | Heavy top-left, lighter elsewhere | Content-heavy pages (follows eye movement) |

### 2:1 Split Implementation

```css
.split-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-lg);
}

@media (max-width: 768px) {
  .split-layout {
    grid-template-columns: 1fr;
  }
}
```

### Hero + Grid Implementation

```css
.hero-grid-layout {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-xl);
}

.hero {
  grid-column: 1 / -1; /* Full width */
  min-height: 60vh;
}

.grid-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-md);
}
```

---

## Breaking the Grid Intentionally

### Full-Bleed Elements

```css
/* Element that breaks out of container */
.full-bleed {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
}
```

### Overlapping Elements for Depth

```css
.overlap-card {
  margin-top: -4rem;
  position: relative;
  z-index: 10;
}
```

### Offset Positioning

```css
.offset-right {
  transform: translateX(2rem);
}

.offset-up {
  transform: translateY(-1rem);
}
```

### Negative Space Hero

```css
.asymmetric-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
}

.hero-content {
  padding-right: 20%; /* Asymmetric padding creates tension */
}

.hero-image {
  margin-right: -10%; /* Bleeds past grid */
}
```

---

## Responsive Transformations

### Choosing Your Responsive Approach

The correct approach depends on **interface type**, not personal preference:

| Interface Type | Approach | Media Queries | Why |
|----------------|----------|---------------|-----|
| Marketing sites | Mobile-first | `min-width` | Content flows naturally, progressively enhance |
| Content pages | Mobile-first | `min-width` | Reading works at any width |
| **Dashboards/Web apps** | **Desktop-first** | `max-width` | Complex layouts designed for desktop, gracefully degrade |
| Native mobile | Mobile-only | None | No desktop version |

### Mobile-First Pattern (Marketing Sites, Content Pages)

Use `min-width` queries — start with mobile, expand for desktop:

```css
/* Mobile: Stacked */
.layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Tablet+: Side by side */
@media (min-width: 768px) {
  .layout {
    flex-direction: row;
  }
  .main { flex: 2; }
  .sidebar { flex: 1; }
}

/* Desktop: Bento grid */
@media (min-width: 1024px) {
  .layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: auto auto;
  }
  .hero { grid-row: span 2; }
}
```

### Transformation Patterns

| Mobile | Desktop |
|--------|---------|
| Single column stack | Multi-column grid |
| Full-width cards | Bento asymmetry |
| Hamburger menu | Horizontal nav |
| Bottom sheet | Sidebar panel |
| Tap targets (48px) | Hover states (32px) |

### Container Queries for Component-Level Responsiveness

```css
.card-container {
  container-type: inline-size;
}

.card {
  display: flex;
  flex-direction: column;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
  }

  .card-image {
    flex: 0 0 150px;
  }
}
```

### Dashboard Layouts

For dashboard-specific grid patterns with responsive breakpoints, see [interface-types.md](interface-types.md#web-applications) — the Web Applications section includes complete dashboard layout code.
