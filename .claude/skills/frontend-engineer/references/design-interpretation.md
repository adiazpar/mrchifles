# Design Interpretation Reference

## Table of Contents
1. [Translating Vague Requests](#translating-vague-requests)
2. [Quick Fixes for Common Problems](#quick-fixes-for-common-problems)
3. [Diagnostic Questions](#diagnostic-questions)

---

## Translating Vague Requests

When users say something "doesn't look right" or needs to "look better," translate to specific actions:

| Vague Request | Likely Means | Actions |
|---------------|--------------|---------|
| "Make it look better" | Lacks visual hierarchy | Add asymmetry, increase contrast, add depth (shadows) |
| "It looks generic" | No distinctive identity | Change typography, add brand color, break the grid |
| "It feels flat" | Missing depth cues | Add dual-layer shadows, subtle gradients, hover states |
| "It's too busy" | Lacks breathing room | Increase whitespace, reduce elements, group related items |
| "It's boring" | Too symmetrical/safe | Add bento layout, overlapping elements, bold typography |
| "Something's off" | Inconsistent spacing/alignment | Audit spacing values, check alignment grid |
| "Make it more modern" | Dated patterns | Reduce borders, increase radius, add motion, darker UI |
| "Make it pop" | Weak focal point | Increase contrast on CTAs, add accent color, scale up hero |
| "It looks like a template" | Over-reliance on defaults | Custom typography, asymmetric layout, distinctive color |
| "More professional" | Lacks polish | Tighten spacing, align everything, consistent type scale |
| "Too cluttered" | Information overload | Progressive disclosure, card grouping, visual hierarchy |
| "Needs more energy" | Static, lifeless | Add motion, saturate colors, dynamic gradients |
| "Feels cheap" | Missing refinement | Add shadows, improve typography, consistent spacing |
| "Too corporate" | Overly safe choices | Bolder colors, distinctive fonts, break conventions |

---

## Quick Fixes for Common Problems

### "Looks generic"
**Fix: Change the font.** Typography is the foundation of identity.

```css
/* Before: Generic */
font-family: system-ui, sans-serif;

/* After: Distinctive */
font-family: 'Sora', sans-serif;
/* Or try: 'Fraunces', 'Clash Display', 'Outfit', 'Satoshi' */
```

### "Feels flat"
**Fix: Add shadows to cards, gradient to hero, hover lift to buttons.**

```css
.card {
  box-shadow:
    0px 1px 2px rgba(0,0,0, 0.3),
    0px 10px 20px rgba(0,0,0, 0.1);
}

.hero {
  background: linear-gradient(135deg, hsl(220, 80%, 55%), hsl(235, 80%, 50%));
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

### "Too crowded"
**Fix: Double the padding, halve the elements.**

```css
/* Before */
.section { padding: 1rem; }

/* After */
.section { padding: 2rem; }

/* Or use clamp for fluid spacing */
.section { padding: clamp(1.5rem, 5vw, 4rem); }
```

### "Boring layout"
**Fix: Make one card span 2 rows or full-width. Never 2x2 equal boxes.**

```css
.feature-card:first-child {
  grid-row: span 2;
}

/* Or full-width accent */
.highlight-section {
  grid-column: 1 / -1;
}
```

### "Needs more energy"
**Fix: Add motion (fade-in on scroll, hover transforms), saturate accent color.**

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
  animation: fadeInUp 0.5s ease-out forwards;
}

/* More saturated accent */
--accent: hsl(220, 90%, 55%); /* Was 70% saturation */
```

### "Something's off"
**Fix: Audit for these common issues:**
- Inconsistent spacing (mix of 12px, 15px, 20px)
- Misaligned elements (text not on grid)
- Orphaned elements (single item with no visual connection)
- Mixed border-radius values

```css
/* Standardize spacing */
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}

/* Standardize radius */
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

---

## Diagnostic Questions

When feedback is vague, ask these to narrow down:

### Hierarchy Issues
- "What should the user notice first?"
- "What's the primary action?"
- "Is there a clear visual path?"

### Density Issues
- "Does it feel cramped or sparse?"
- "Can you scan it quickly?"
- "Is anything competing for attention?"

### Identity Issues
- "Does it feel like YOUR brand?"
- "Would you recognize it without the logo?"
- "What adjectives describe the current feel vs desired?"

### Polish Issues
- "Where does your eye get stuck?"
- "What feels unfinished?"
- "Any elements that feel disconnected?"

### Systematic Fixes

| Symptom | Check | Fix |
|---------|-------|-----|
| "Messy" | Spacing inconsistency | Use 4px/8px grid system |
| "Weak" | Contrast ratio | Increase weight/luminance delta |
| "Disconnected" | Element proximity | Group related, separate unrelated |
| "Dated" | Heavy borders/gradients | Subtle shadows, minimal borders |
| "Toy-like" | Oversaturated colors | Reduce saturation 10-20% |
| "Sterile" | No color accent | Add single brand hue |
