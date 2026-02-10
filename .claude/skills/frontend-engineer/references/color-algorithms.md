# Color Algorithms Reference

## Table of Contents
1. [The Neutral Palette Algorithm](#the-neutral-palette-algorithm)
2. [Brand Color System](#brand-color-system)
3. [Semantic Colors](#semantic-colors)
4. [Light Mode Inversion](#light-mode-inversion)
5. [OKLCH Reference](#oklch-reference)

---

## The Neutral Palette Algorithm

Generate a cohesive neutral palette from a single base. Neutrals should dominate your UI (80-90% of surface area).

### Dark Mode Neutral Scale

| Role | Hue | Saturation | Lightness | CSS Variable | Notes |
|------|-----|------------|-----------|--------------|-------|
| Background | 0 (or brand) | 0-5% | 5-10% | `--bg-base` | Never pure black (causes OLED smearing) |
| Surface | 0 (or brand) | 0-5% | 12-15% | `--bg-surface` | Cards, panels |
| Elevated | 0 (or brand) | 0-5% | 18-22% | `--bg-elevated` | Modals, dropdowns |
| Border | 0 | 0% | 25-30% | `--border` | Subtle separation |
| Border Strong | 0 | 0% | 40% | `--border-strong` | Emphasized dividers |

### CSS Implementation (Dark Mode First)

```css
:root {
  /* Neutral scale - dark mode */
  --gray-950: hsl(220, 5%, 6%);   /* Deepest background */
  --gray-900: hsl(220, 5%, 10%);  /* Base background */
  --gray-850: hsl(220, 5%, 14%);  /* Surface */
  --gray-800: hsl(220, 5%, 18%);  /* Elevated */
  --gray-700: hsl(220, 3%, 25%);  /* Border */
  --gray-600: hsl(220, 3%, 35%);  /* Border strong */
  --gray-500: hsl(220, 2%, 45%);  /* Muted text */
  --gray-400: hsl(220, 2%, 55%);  /* Tertiary text */
  --gray-300: hsl(220, 2%, 65%);  /* Secondary text */
  --gray-200: hsl(220, 2%, 80%);  /* Primary text soft */
  --gray-100: hsl(220, 2%, 93%);  /* Primary text */
  
  /* Semantic mapping */
  --bg-base: var(--gray-900);
  --bg-surface: var(--gray-850);
  --bg-elevated: var(--gray-800);
  --border: var(--gray-700);
  --text-primary: var(--gray-100);
  --text-secondary: var(--gray-300);
  --text-muted: var(--gray-500);
}
```

### The Subtle Tint Technique

Add a tiny amount of your brand hue to neutrals for cohesion:

```css
/* Cold/Tech feel - blue tint */
--gray-900: hsl(220, 8%, 10%);

/* Warm/Friendly feel - warm tint */
--gray-900: hsl(30, 5%, 10%);

/* Pure neutral - no tint */
--gray-900: hsl(0, 0%, 10%);
```

**When to use each:**

| Approach | Best For | Why |
|----------|----------|-----|
| **Brand-tinted neutrals** | Cohesive brand experiences, modern apps | Creates subtle warmth/coolness that reinforces brand identity |
| **Pure neutrals** | Data-dense dashboards, finance/trading, clinical interfaces | Maximum contrast, no color interference with data visualization |

**Rule of thumb:** If the UI has colored data (charts, status indicators, semantic colors), use pure neutrals so data colors stand out. If the UI is primarily text and navigation, brand-tinted neutrals add sophistication.

---

## Brand Color System

### Single-Hue Brand System

Define your brand with ONE hue, then derive everything algorithmically:

```css
:root {
  --brand-hue: 220; /* Blue - change this one number to rebrand */
  
  /* Derived brand colors */
  --brand-50:  hsl(var(--brand-hue), 100%, 97%);
  --brand-100: hsl(var(--brand-hue), 95%, 93%);
  --brand-200: hsl(var(--brand-hue), 90%, 85%);
  --brand-300: hsl(var(--brand-hue), 85%, 75%);
  --brand-400: hsl(var(--brand-hue), 80%, 65%);
  --brand-500: hsl(var(--brand-hue), 75%, 55%); /* Primary brand */
  --brand-600: hsl(var(--brand-hue), 70%, 45%); /* Hover state */
  --brand-700: hsl(var(--brand-hue), 65%, 35%); /* Active state */
  --brand-800: hsl(var(--brand-hue), 60%, 25%);
  --brand-900: hsl(var(--brand-hue), 55%, 15%);
}
```

### Common Brand Hues

| Color | Hue | Associations |
|-------|-----|--------------|
| Red | 0 | Energy, urgency, passion |
| Orange | 30 | Creativity, enthusiasm |
| Yellow | 50 | Optimism, clarity |
| Green | 140 | Growth, success, nature |
| Teal | 175 | Balance, calm |
| Blue | 220 | Trust, stability, tech |
| Indigo | 240 | Wisdom, premium |
| Purple | 270 | Luxury, creativity |
| Pink | 330 | Playful, modern |

---

## Semantic Colors

Reserve these for specific meanings only:

### Success (Green)

```css
--success-hue: 140;
--success: hsl(var(--success-hue), 70%, 45%);
--success-light: hsl(var(--success-hue), 70%, 95%);
--success-dark: hsl(var(--success-hue), 70%, 25%);
```

### Warning (Amber/Yellow)

```css
--warning-hue: 45;
--warning: hsl(var(--warning-hue), 90%, 50%);
--warning-light: hsl(var(--warning-hue), 90%, 95%);
--warning-dark: hsl(var(--warning-hue), 90%, 30%);
```

### Error (Red)

```css
--error-hue: 0;
--error: hsl(var(--error-hue), 75%, 55%);
--error-light: hsl(var(--error-hue), 75%, 95%);
--error-dark: hsl(var(--error-hue), 75%, 30%);
```

### Info (Blue)

```css
--info-hue: 210;
--info: hsl(var(--info-hue), 80%, 55%);
--info-light: hsl(var(--info-hue), 80%, 95%);
--info-dark: hsl(var(--info-hue), 80%, 30%);
```

---

## Light Mode Inversion

### The Basic Formula

```
L_light = 100 - L_dark
```

### The Refined Formula (Accounting for Real-World Light)

In light mode, light comes from above, so elevated surfaces are **lighter** (closer to the light source):

| Role | Dark Mode L | Light Mode L | Notes |
|------|-------------|--------------|-------|
| Background | 10% | 95-98% | Off-white, not pure white |
| Surface | 15% | 100% | Pure white (elevated = closer to light) |
| Elevated | 20% | 100% | Same as surface, use shadow for depth |
| Border | 30% | 85-88% | Subtle gray |
| Text Primary | 93% | 8% | Near-black, not pure black |
| Text Secondary | 60% | 40% | Inverted midpoint |

### CSS Implementation

```css
[data-theme="light"] {
  --bg-base: hsl(220, 20%, 98%);
  --bg-surface: hsl(0, 0%, 100%);
  --bg-elevated: hsl(0, 0%, 100%);
  --border: hsl(220, 10%, 88%);
  --text-primary: hsl(220, 10%, 8%);
  --text-secondary: hsl(220, 5%, 40%);
  --text-muted: hsl(220, 5%, 60%);
  
  /* Shadows become more important in light mode */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 20px rgba(0,0,0,0.1);
}
```

---

## OKLCH Reference

OKLCH is perceptually uniform — equal lightness values appear equally bright across all hues.

### Syntax

```css
color: oklch(L C H);
/* L = Lightness (0-100%) */
/* C = Chroma (0-0.4, saturation equivalent) */
/* H = Hue (0-360) */
```

### Comparison: HSL vs OKLCH

```css
/* HSL: These look different brightness */
.hsl-yellow { color: hsl(60, 100%, 50%); }  /* Appears very bright */
.hsl-blue { color: hsl(240, 100%, 50%); }   /* Appears much darker */

/* OKLCH: These look same brightness */
.oklch-yellow { color: oklch(80% 0.2 90); }
.oklch-blue { color: oklch(80% 0.2 260); }
```

### OKLCH Brand Scale

```css
:root {
  --brand-hue: 250; /* Blue in OKLCH */
  
  --brand-50:  oklch(98% 0.02 var(--brand-hue));
  --brand-100: oklch(95% 0.04 var(--brand-hue));
  --brand-200: oklch(88% 0.08 var(--brand-hue));
  --brand-300: oklch(78% 0.12 var(--brand-hue));
  --brand-400: oklch(68% 0.16 var(--brand-hue));
  --brand-500: oklch(58% 0.18 var(--brand-hue));
  --brand-600: oklch(48% 0.16 var(--brand-hue));
  --brand-700: oklch(38% 0.14 var(--brand-hue));
  --brand-800: oklch(28% 0.10 var(--brand-hue));
  --brand-900: oklch(18% 0.06 var(--brand-hue));
}
```

### Browser Support

OKLCH is supported in all modern browsers (Chrome 111+, Firefox 113+, Safari 15.4+). Use with fallback:

```css
.button {
  background: hsl(220, 80%, 55%); /* Fallback */
  background: oklch(58% 0.18 250); /* Modern browsers */
}
```
