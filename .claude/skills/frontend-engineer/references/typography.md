# Typography Reference

## Table of Contents
1. [The Typography Scale](#the-typography-scale)
2. [Base Unit Selection](#base-unit-selection)
3. [Line Height Guidelines](#line-height-guidelines)
4. [Luminance Hierarchy Values](#luminance-hierarchy-values)
5. [Font Pairing Strategy](#font-pairing-strategy)

---

## The Typography Scale

The Two-Pixel Rule scale with weight and line-height specifications:

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Micro/Caption | 12px | 400 | 1.5 | Legal text, timestamps, metadata |
| Base Body | **14px** | 400 | 1.5-1.6 | Paragraphs, inputs, labels |
| Base Strong | **14px** | **700** | 1.5 | Sub-headers, button text, table headers |
| Heading 3 | 16px | 700 | 1.4 | Card titles, feature block headers |
| Heading 2 | 18px | 700 | 1.3 | Page sub-sections |
| Heading 1 | 24px+ | 700 | 1.2 | Main page title (exception for dramatic scale) |
| Display | 32px+ | 700-900 | 1.1 | Hero headlines, marketing callouts |

### CSS Implementation

```css
:root {
  /* Base unit */
  --font-size-base: 14px;
  
  /* Two-Pixel Scale */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 32px;
  
  /* Line Heights */
  --line-height-tight: 1.2;
  --line-height-snug: 1.3;
  --line-height-normal: 1.4;
  --line-height-relaxed: 1.5;
  --line-height-loose: 1.6;
}
```

---

## Base Unit Selection

| Base Size | Best For | Characteristics |
|-----------|----------|-----------------|
| **14px** | Dashboards, data-heavy UIs, admin panels | Higher density, more information per screen |
| **16px** | Marketing sites, blogs, general apps | Browser default, optimized for reading |

### Decision Framework

Choose **14px** when:
- Information density is critical
- Users scan rather than read
- Screen real estate is limited
- Professional/technical audience

Choose **16px** when:
- Long-form content is primary
- Accessibility is paramount
- General consumer audience
- Mobile-first design

---

## Line Height Guidelines

| Content Type | Multiplier | Reasoning |
|--------------|------------|-----------|
| Display/Headlines | 1.1-1.2 | Tight for visual impact |
| Headings | 1.2-1.3 | Slightly loose for scannability |
| Body text | 1.5-1.6 | Optimal for sustained reading |
| UI labels | 1.4-1.5 | Balanced for interface elements |
| Code blocks | 1.4-1.5 | Readability without excess space |

### The Automatic Margin Effect

```css
/* Line height creates natural spacing */
p {
  font-size: 14px;
  line-height: 1.6; /* = 22.4px total height per line */
  margin: 0; /* Line height provides the breathing room */
}

/* Only add explicit margin between distinct blocks */
p + p { margin-top: 1em; }
```

---

## Luminance Hierarchy Values

### Dark Mode

| Role | HSL Lightness | Example | Usage |
|------|---------------|---------|-------|
| Primary text | 90-95% | `hsl(0, 0%, 93%)` | Headlines, important content |
| Secondary text | 60% | `hsl(0, 0%, 60%)` | Descriptions, metadata |
| Tertiary text | 40% | `hsl(0, 0%, 40%)` | Disabled, placeholders |
| Muted text | 30% | `hsl(0, 0%, 30%)` | Hints, very low priority |

### Light Mode (Inverted)

| Role | HSL Lightness | Example | Usage |
|------|---------------|---------|-------|
| Primary text | 5-10% | `hsl(0, 0%, 8%)` | Headlines, important content |
| Secondary text | 40% | `hsl(0, 0%, 40%)` | Descriptions, metadata |
| Tertiary text | 60% | `hsl(0, 0%, 60%)` | Disabled, placeholders |
| Muted text | 70% | `hsl(0, 0%, 70%)` | Hints, very low priority |

### CSS Implementation

```css
:root {
  /* Dark mode text hierarchy */
  --text-primary: hsl(0, 0%, 93%);
  --text-secondary: hsl(0, 0%, 60%);
  --text-tertiary: hsl(0, 0%, 40%);
  --text-muted: hsl(0, 0%, 30%);
}

[data-theme="light"] {
  --text-primary: hsl(0, 0%, 8%);
  --text-secondary: hsl(0, 0%, 40%);
  --text-tertiary: hsl(0, 0%, 60%);
  --text-muted: hsl(0, 0%, 70%);
}
```

---

## Font Pairing Strategy

### The Display + Body Pattern

Pair a **distinctive display font** (for headlines) with a **refined body font** (for text):

| Aesthetic | Display Font | Body Font |
|-----------|--------------|-----------|
| Modern Tech | Sora, Outfit, Manrope | DM Sans, Nunito Sans, Plus Jakarta Sans |
| Editorial | Playfair Display, Fraunces | Source Serif Pro, Lora |
| Brutalist | Bebas Neue, Oswald | IBM Plex Mono, JetBrains Mono |
| Friendly | Quicksand, Nunito | Nunito, Lexend |
| Luxury | Cormorant Garamond, Bodoni Moda | Montserrat, Raleway |
| Playful | Fredoka, Baloo 2 | Lexend, Rubik |
| Geometric | Clash Display, Satoshi | General Sans, Switzer |

### Fonts to AVOID (Generic AI Aesthetics)

- Inter (overused default)
- Roboto (too ubiquitous)
- Space Grotesk (AI convergence trap — was distinctive, now overused)
- Poppins (ubiquitous, lost distinctiveness)
- Arial (system font, no character)
- system-ui (inconsistent across platforms)
- Sans-serif (lazy fallback)

### Loading Strategy

```html
<!-- Preconnect for performance -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Load only needed weights -->
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: 'Sora', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}

h1, h2, h3 { font-family: var(--font-display); }
body { font-family: var(--font-body); }
```

**Note:** These are examples — vary your font choices across designs. See [creative-philosophy.md](creative-philosophy.md) for anti-convergence principles.
