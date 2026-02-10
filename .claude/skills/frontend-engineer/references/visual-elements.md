# Visual Elements Reference

## Table of Contents
1. [The Card Trap](#the-card-trap)
2. [When to Visualize Data](#when-to-visualize-data)
3. [CSS-Only Charts](#css-only-charts)
4. [SVG Visualizations](#svg-visualizations)
5. [Visual Variety Patterns](#visual-variety-patterns)
6. [Mobile Visual Richness](#mobile-visual-richness)

---

## The Card Trap

> **Cards are a container, not content. Stop putting everything in cards.**

AI-generated UIs over-rely on cards because they're a safe, familiar pattern. But cards alone create monotonous, generic interfaces.

### Signs of Card Over-Reliance

- Every piece of content is wrapped in a rounded rectangle
- Lists become "card lists" instead of actual lists
- Numbers sit in cards instead of being visualized
- Mobile views are just stacked cards
- No visual hierarchy — everything has the same visual weight

### The Rule

**Before creating a card, ask: "What does this content actually need?"**

| Content Type | Better Than Cards |
|--------------|-------------------|
| Single number/metric | Large typography, sparkline, progress ring |
| Trend over time | Line chart, area chart, bar chart |
| Proportion/percentage | Progress bar, donut chart, gauge |
| Comparison | Bar chart, side-by-side stats |
| List of items | Actual list with separators, no card wrappers |
| Status | Badge, indicator dot, icon |
| Geographic | Map, location pin |
| Flow/process | Diagram, timeline, stepper |

### When Cards ARE Appropriate

- Truly independent, browsable items (product cards, user profiles)
- Content that leads to a detail view (click to expand)
- Grouped related information that needs visual separation
- Interactive elements that need clear tap/click boundaries

> **Why cards work (when appropriate):** See [Law of Common Region](cognitive-laws.md#law-of-common-region) — elements sharing a visual boundary are perceived as grouped. Cards leverage this cognitive principle, but only when the content truly needs grouping.

---

## When to Visualize Data

> **Numbers want to be pictures. Let them.**

### The Visualization Decision Tree

```
Is it a single number?
├── Does it have context (goal, previous, comparison)?
│   ├── YES → Progress bar, gauge, comparison stat
│   └── NO → Large typography with label
│
Is it multiple numbers over time?
├── YES → Line chart, area chart, bar chart
│
Is it parts of a whole?
├── YES → Donut chart, stacked bar, progress segments
│
Is it a comparison between items?
├── YES → Bar chart, grouped stats
│
Is it a status or state?
├── YES → Icon, badge, indicator dot
```

### Visualization Triggers

When you see these in requirements, think visualization:

| Keyword | Visualization |
|---------|--------------|
| "balance", "total", "amount" | Large number + trend indicator or sparkline |
| "progress", "completion", "goal" | Progress bar, progress ring |
| "trend", "over time", "history" | Line chart, area chart |
| "breakdown", "by category", "distribution" | Donut chart, stacked bar |
| "compare", "vs", "difference" | Bar chart, side-by-side stats |
| "status", "state", "health" | Indicator dot, badge, icon |
| "activity", "recent", "feed" | Timeline, activity graph |
| "analytics", "metrics", "stats" | Dashboard with mixed visualizations |

---

## CSS-Only Charts

> **You don't need Chart.js for simple visualizations.**

### Progress Bar

```css
.progress-bar {
  height: 8px;
  background: var(--bg-surface);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: var(--brand);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Gradient variant */
.progress-bar__fill--gradient {
  background: linear-gradient(90deg, var(--brand), var(--brand-light));
}

/* Striped animated variant */
.progress-bar__fill--striped {
  background: repeating-linear-gradient(
    45deg,
    var(--brand),
    var(--brand) 10px,
    var(--brand-dark) 10px,
    var(--brand-dark) 20px
  );
  background-size: 200% 100%;
  animation: progress-stripe 1s linear infinite;
}

@keyframes progress-stripe {
  from { background-position: 0 0; }
  to { background-position: 28px 0; }
}
```

### Horizontal Bar Chart

```css
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bar-chart__item {
  display: grid;
  grid-template-columns: 100px 1fr 60px;
  align-items: center;
  gap: var(--space-3);
}

.bar-chart__label {
  font-size: 14px;
  color: var(--text-secondary);
}

.bar-chart__bar {
  height: 24px;
  background: var(--bg-surface);
  border-radius: 4px;
  overflow: hidden;
}

.bar-chart__fill {
  height: 100%;
  background: var(--brand);
  border-radius: 4px;
  /* Width set via inline style: style="width: 75%" */
}

.bar-chart__value {
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}
```

### Vertical Bar Chart (CSS Grid)

```css
.vertical-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 200px;
  gap: var(--space-2);
  padding-top: var(--space-4);
}

.vertical-bars__bar {
  flex: 1;
  background: var(--brand);
  border-radius: 4px 4px 0 0;
  min-width: 20px;
  max-width: 60px;
  transition: height 0.3s ease;
  /* Height set via inline style: style="height: 75%" */
}

.vertical-bars__bar:hover {
  background: var(--brand-light);
}

/* With labels */
.vertical-bars__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
}

.vertical-bars__label {
  margin-top: var(--space-2);
  font-size: 12px;
  color: var(--text-secondary);
}
```

### Progress Ring (CSS)

```css
.progress-ring {
  width: 120px;
  height: 120px;
  position: relative;
}

.progress-ring__circle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(
    var(--brand) calc(var(--progress) * 1%),
    var(--bg-surface) calc(var(--progress) * 1%)
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring__inner {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  background: var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring__value {
  font-size: 24px;
  font-weight: 700;
}

/* Usage: style="--progress: 75" */
```

### Sparkline (CSS Clip-Path)

```css
/* Sparkline using clip-path polygon */
.sparkline {
  width: 100px;
  height: 32px;
  background: linear-gradient(to top, var(--brand-alpha-20), transparent);
  clip-path: polygon(
    0% 80%,
    15% 60%,
    30% 70%,
    45% 40%,
    60% 50%,
    75% 20%,
    90% 35%,
    100% 10%,
    100% 100%,
    0% 100%
  );
  /* Points would be calculated from data */
}

/* With line on top */
.sparkline-container {
  position: relative;
}

.sparkline-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: none;
  border: none;
  /* Use SVG for the actual line */
}
```

### Stat with Trend Indicator

```css
.stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat__value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat__trend {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 14px;
  font-weight: 500;
}

.stat__trend--up {
  color: var(--success);
}

.stat__trend--down {
  color: var(--error);
}

.stat__trend-icon {
  width: 16px;
  height: 16px;
}

.stat__label {
  font-size: 14px;
  color: var(--text-secondary);
}
```

---

## SVG Visualizations

> **SVG gives you precise control for complex visualizations.**

### Simple Line Chart

```html
<svg viewBox="0 0 400 200" class="line-chart">
  <!-- Grid lines -->
  <line x1="0" y1="50" x2="400" y2="50" stroke="var(--border)" stroke-dasharray="4"/>
  <line x1="0" y1="100" x2="400" y2="100" stroke="var(--border)" stroke-dasharray="4"/>
  <line x1="0" y1="150" x2="400" y2="150" stroke="var(--border)" stroke-dasharray="4"/>

  <!-- Area fill -->
  <path
    d="M0,160 L57,140 L114,120 L171,80 L228,100 L285,60 L342,40 L400,70 L400,200 L0,200 Z"
    fill="url(#gradient)"
    opacity="0.3"
  />

  <!-- Line -->
  <polyline
    points="0,160 57,140 114,120 171,80 228,100 285,60 342,40 400,70"
    fill="none"
    stroke="var(--brand)"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Data points -->
  <circle cx="171" cy="80" r="4" fill="var(--brand)"/>
  <circle cx="285" cy="60" r="4" fill="var(--brand)"/>
  <circle cx="342" cy="40" r="4" fill="var(--brand)"/>

  <!-- Gradient definition -->
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="var(--brand)"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
  </defs>
</svg>
```

### Donut Chart

```html
<svg viewBox="0 0 100 100" class="donut-chart">
  <!-- Background circle -->
  <circle
    cx="50" cy="50" r="40"
    fill="none"
    stroke="var(--bg-surface)"
    stroke-width="12"
  />

  <!-- Segment 1: 60% -->
  <circle
    cx="50" cy="50" r="40"
    fill="none"
    stroke="var(--brand)"
    stroke-width="12"
    stroke-dasharray="150.8 251.3"
    stroke-dashoffset="0"
    transform="rotate(-90 50 50)"
  />

  <!-- Segment 2: 25% -->
  <circle
    cx="50" cy="50" r="40"
    fill="none"
    stroke="var(--success)"
    stroke-width="12"
    stroke-dasharray="62.8 251.3"
    stroke-dashoffset="-150.8"
    transform="rotate(-90 50 50)"
  />

  <!-- Center text -->
  <text x="50" y="50" text-anchor="middle" dy="0.35em" class="donut-chart__label">
    $24,847
  </text>
</svg>

<style>
.donut-chart {
  width: 200px;
  height: 200px;
}

.donut-chart__label {
  font-size: 12px;
  font-weight: 700;
  fill: var(--text-primary);
}

/* Calculate stroke-dasharray:
   circumference = 2 * π * r = 2 * 3.14159 * 40 = 251.3
   segment = percentage * circumference / 100
   60% = 150.8, 25% = 62.8
*/
</style>
```

### Gauge / Speedometer

```html
<svg viewBox="0 0 200 120" class="gauge">
  <!-- Background arc -->
  <path
    d="M20,100 A80,80 0 0,1 180,100"
    fill="none"
    stroke="var(--bg-surface)"
    stroke-width="16"
    stroke-linecap="round"
  />

  <!-- Value arc (75%) -->
  <path
    d="M20,100 A80,80 0 0,1 180,100"
    fill="none"
    stroke="var(--brand)"
    stroke-width="16"
    stroke-linecap="round"
    stroke-dasharray="188.5"
    stroke-dashoffset="47.1"
  />

  <!-- Value text -->
  <text x="100" y="90" text-anchor="middle" class="gauge__value">75%</text>
  <text x="100" y="110" text-anchor="middle" class="gauge__label">Efficiency</text>
</svg>

<style>
.gauge__value {
  font-size: 24px;
  font-weight: 700;
  fill: var(--text-primary);
}

.gauge__label {
  font-size: 12px;
  fill: var(--text-secondary);
}

/* Arc length calculation:
   Semi-circle = π * r = 3.14159 * 80 = 251.3
   But we're using a smaller arc (about 75% of semi-circle) = 188.5
   75% fill: offset = 188.5 * 0.25 = 47.1
*/
</style>
```

### Activity Graph (GitHub-style)

```css
.activity-graph {
  display: grid;
  grid-template-columns: repeat(52, 1fr);
  grid-template-rows: repeat(7, 1fr);
  gap: 2px;
}

.activity-graph__cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--bg-surface);
}

.activity-graph__cell--level-1 { background: hsla(var(--brand-hue), 80%, 50%, 0.25); }
.activity-graph__cell--level-2 { background: hsla(var(--brand-hue), 80%, 50%, 0.50); }
.activity-graph__cell--level-3 { background: hsla(var(--brand-hue), 80%, 50%, 0.75); }
.activity-graph__cell--level-4 { background: hsl(var(--brand-hue), 80%, 50%); }
```

---

## Visual Variety Patterns

> **Mix different visual elements to create engaging interfaces.**

### The Visual Variety Checklist

A rich interface should have a mix of:

- [ ] **Large numbers** with context (trend, comparison)
- [ ] **At least one chart** (line, bar, donut, gauge)
- [ ] **Progress indicators** (bars, rings, steps)
- [ ] **Status indicators** (dots, badges, icons)
- [ ] **Visual hierarchy** through size and color variation
- [ ] **White space** — not everything needs a container

### Dashboard Composition Formula

```
Hero Metric (largest visual)
├── Big number + sparkline + trend
│
Supporting Metrics (row of 3-4)
├── Stat cards with icons OR
├── Progress rings OR
├── Mini charts
│
Primary Chart (takes up significant space)
├── Line/area chart OR
├── Bar chart
│
Data Table or List (if needed)
├── With inline status indicators
├── With inline sparklines for trends
│
Activity/Timeline (if applicable)
├── Visual timeline OR
├── Activity graph
```

### Breaking Card Monotony

```css
/* Instead of: everything in cards */

/* Try: Mix of card and non-card elements */
.dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 300px;
  gap: var(--space-6);
}

/* Hero stat: NO card, just big typography */
.hero-stat {
  grid-column: span 2;
  /* No background, no border, no shadow */
}

.hero-stat__value {
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
}

/* Chart: Card with subtle styling */
.chart-section {
  grid-column: span 2;
  padding: var(--space-6);
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
}

/* Stats: Inline, no individual cards */
.stats-row {
  display: flex;
  gap: var(--space-8);
  /* No card wrapper, just spacing */
}

/* Sidebar: Different treatment */
.sidebar-panel {
  background: var(--bg-elevated);
  border-left: 1px solid var(--border);
  padding: var(--space-4);
  /* Not a card — a panel */
}
```

---

## Mobile Visual Richness

> **Mobile doesn't mean "stack the cards." It means "focus the visuals."**

### Mobile Visualization Principles

1. **Hero visualization first** — One impactful chart/number at the top
2. **Horizontal scroll for comparisons** — Don't stack, let users scroll
3. **Inline micro-visualizations** — Sparklines in list items
4. **Full-width charts** — Don't squeeze charts into cards
5. **Touch-friendly data points** — Larger hit areas for interactive charts

### Mobile Dashboard Pattern

```css
.mobile-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

/* Hero: Full-width, prominent */
.mobile-hero {
  text-align: center;
  padding: var(--space-6) 0;
}

.mobile-hero__value {
  font-size: 48px;
  font-weight: 700;
}

.mobile-hero__chart {
  width: 100%;
  height: 120px;
  margin-top: var(--space-4);
}

/* Quick actions: Horizontal scroll */
.mobile-actions {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: var(--space-2);
  -webkit-overflow-scrolling: touch;
}

.mobile-actions::-webkit-scrollbar {
  display: none;
}

.mobile-action {
  flex-shrink: 0;
  scroll-snap-align: start;
  width: 80px;
  text-align: center;
}

/* Stats: Horizontal scroll, not stacked */
.mobile-stats {
  display: flex;
  gap: var(--space-4);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: var(--space-4) 0;
}

.mobile-stat {
  flex-shrink: 0;
  scroll-snap-align: start;
  min-width: 140px;
  padding: var(--space-4);
  background: var(--bg-surface);
  border-radius: var(--radius-md);
}

/* List with inline visualizations */
.mobile-list-item {
  display: flex;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border);
}

.mobile-list-item__sparkline {
  width: 60px;
  height: 24px;
  margin-left: auto;
}

.mobile-list-item__trend {
  width: 48px;
  text-align: right;
  font-weight: 600;
}
```

### Mobile Chart Sizing

| Chart Type | Mobile Treatment |
|------------|------------------|
| Line/Area chart | Full width, 150-200px height |
| Bar chart | Horizontal bars, full width |
| Donut chart | Centered, 160-200px diameter |
| Progress ring | 80-100px, inline with stats |
| Sparkline | 60-80px wide, inline in list items |
| Gauge | 120-160px wide, hero position |

### Mobile Anti-Patterns

❌ **Don't**: Stack cards infinitely — feels like a never-ending list
✅ **Do**: Use horizontal scroll for comparable items

❌ **Don't**: Shrink desktop charts into tiny cards
✅ **Do**: Give charts full width, reduce height

❌ **Don't**: Hide all visualizations behind "View Chart" buttons
✅ **Do**: Show inline micro-visualizations (sparklines, progress)

❌ **Don't**: Use the same card style for everything
✅ **Do**: Vary visual treatment — some cards, some inline, some full-bleed
