# Cognitive UX Laws Reference

## Table of Contents
1. [Hick's Law](#hicks-law)
2. [Fitts's Law](#fittss-law)
3. [Jakob's Law](#jakobs-law)
4. [Miller's Law](#millers-law)
5. [Gestalt Principles (C.R.A.P.)](#gestalt-principles-crap)
6. [Law of Common Region](#law-of-common-region)
7. [The Bouba/Kiki Effect](#the-boubakiki-effect)
8. [Additional Laws](#additional-laws)

---

## Hick's Law

> **Decision time increases logarithmically with the number and complexity of choices.**

### The Formula

```
RT = a + b × log₂(n + 1)
```
Where RT = reaction time, n = number of choices

### Implications for UI

Every additional option costs the user mental energy. Simplification is not a feature — it's a requirement.

### Applications

| Scenario | Bad | Good |
|----------|-----|------|
| Navigation | 12 top-level menu items | 5-7 items max, rest in submenus |
| Form fields | 20 fields on one page | Progressive disclosure, multi-step |
| Filter options | 50 visible filters | Show 5-7, "More filters" expandable |
| CTAs | 3 equal-weight buttons | 1 primary, 1 secondary max |
| Settings | Flat list of 100 options | Categorized with search |

### Code Pattern: Progressive Disclosure

```html
<!-- Show essentials first, reveal on demand -->
<div class="filters">
  <div class="filters-primary">
    <!-- 3-5 most common filters always visible -->
  </div>
  <details class="filters-advanced">
    <summary>Advanced filters</summary>
    <!-- Additional filters hidden by default -->
  </details>
</div>
```

### Design Checklist

- [ ] Can any options be removed entirely?
- [ ] Can options be grouped into categories?
- [ ] Is there a sensible default that works for 80% of users?
- [ ] Are less common options hidden but accessible?
- [ ] Is there a clear visual hierarchy (primary vs secondary actions)?

---

## Fitts's Law

> **Time to acquire a target is a function of distance to and size of the target.**

### The Formula

```
T = a + b × log₂(D/W + 1)
```
Where T = time, D = distance to target, W = width of target

### Implications for UI

- **Bigger targets are faster to click**
- **Closer targets are faster to reach**
- **Edge/corner targets are infinitely wide** (cursor can't overshoot)

### Applications

| Principle | Implementation |
|-----------|----------------|
| Big touch targets | Minimum 44×44px for mobile, 32×32px for desktop |
| Thumb zones | Primary actions in bottom half of mobile screens |
| Edge targeting | Fixed navbars/sidebars that extend to viewport edge |
| Padding for clickability | Button padding, not just text as target |
| Grouping related actions | Related buttons clustered together |

> **Cross-platform note:** iOS requires 44pt, Android requires 48dp. When building web apps that target both platforms, use **48px** to satisfy both requirements.

### Code Pattern: Proper Button Sizing

```css
/* Bad: Only text is clickable */
.button-bad {
  padding: 0;
  background: none;
}

/* Good: Generous padding creates large target */
.button {
  padding: 12px 24px;
  min-height: 44px;
  min-width: 44px;
}

/* Touch-friendly: Even larger for mobile */
@media (pointer: coarse) {
  .button {
    padding: 16px 32px;
    min-height: 48px;
  }
}
```

### Code Pattern: Full-Width Mobile Actions

```css
/* Fixed bottom action bar for mobile */
.mobile-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.mobile-actions .button {
  width: 100%; /* Full width = easy target */
}
```

### Design Checklist

- [ ] Are all interactive elements at least 44×44px on mobile?
- [ ] Are primary actions in the thumb zone on mobile?
- [ ] Do buttons have padding, not just text content?
- [ ] Are frequently used actions positioned for easy access?
- [ ] Are destructive actions harder to reach than constructive ones?

---

## Jakob's Law

> **Users spend most of their time on OTHER sites. They expect your site to work like those sites.**

### Implications for UI

Don't innovate on established patterns. Users have built mental models from Amazon, Google, Facebook, etc. Match their expectations.

### Established Conventions

| Element | Expected Pattern |
|---------|------------------|
| Logo | Top-left, links to home |
| Search | Top of page, magnifying glass icon, text input |
| Navigation | Top horizontal OR left sidebar |
| Shopping cart | Top-right, bag/cart icon with counter |
| User account | Top-right, avatar or person icon |
| Footer | Copyright, links, legal |
| Forms | Labels above inputs, submit button at bottom |
| Pagination | Bottom of list, numbered or load more |
| Cards | Image top, text below, actions at bottom |
| Modals | Centered, overlay, X to close top-right |

### Code Pattern: Standard Navigation Structure

```html
<header>
  <nav>
    <a href="/" class="logo"><!-- Top-left --></a>
    <ul class="nav-links"><!-- Center or right --></ul>
    <div class="nav-actions">
      <button class="search"><!-- Magnifying glass --></button>
      <a href="/cart" class="cart"><!-- Cart icon + count --></a>
      <a href="/account" class="avatar"><!-- User icon --></a>
    </div>
  </nav>
</header>
```

### When to Break Convention

Only break conventions when:
1. You've validated with user testing
2. The innovation provides significant value
3. The learning curve is minimal
4. Visual affordances make the new pattern obvious

### Design Checklist

- [ ] Does the logo link to home?
- [ ] Is the navigation in a standard position?
- [ ] Do icons match common conventions?
- [ ] Are forms structured predictably?
- [ ] Can users accomplish common tasks without learning new patterns?

---

## Miller's Law

> **The average person can hold 7 (± 2) items in working memory.**

### Implications for UI

Don't overwhelm users with too much information at once. Chunk content into digestible pieces.

### Applications

| Scenario | Application |
|----------|-------------|
| Forms | Maximum 5-7 fields per step |
| Navigation | 5-7 top-level items |
| Lists | Group into chunks of 3-5 items |
| Onboarding | Maximum 5 steps |
| Pricing tables | 3-4 tiers maximum |
| Data tables | Paginate at 10-25 rows |

### Code Pattern: Multi-Step Form

```html
<form class="wizard">
  <div class="wizard-steps">
    <div class="step active">1. Contact</div>
    <div class="step">2. Address</div>
    <div class="step">3. Payment</div>
    <div class="step">4. Review</div>
  </div>
  
  <div class="wizard-content">
    <!-- Step 1: 4-5 fields max -->
    <fieldset class="step-content active">
      <legend>Contact Information</legend>
      <!-- Name, Email, Phone -->
    </fieldset>
    
    <!-- Additional steps hidden -->
  </div>
</form>
```

### Code Pattern: Grouped List

```html
<div class="settings">
  <section class="settings-group">
    <h3>Account</h3>
    <!-- 3-5 related settings -->
  </section>
  
  <section class="settings-group">
    <h3>Notifications</h3>
    <!-- 3-5 related settings -->
  </section>
  
  <section class="settings-group">
    <h3>Privacy</h3>
    <!-- 3-5 related settings -->
  </section>
</div>
```

### Design Checklist

- [ ] Are long forms broken into logical steps?
- [ ] Are navigation items limited to 7 or fewer?
- [ ] Is content chunked with clear visual separation?
- [ ] Are related items grouped together?
- [ ] Is there a progress indicator for multi-step processes?

---

## Gestalt Principles (C.R.A.P.)

### Contrast

> **If two elements are different, make them VERY different.**

Weak contrast appears accidental. Strong contrast appears intentional.

```css
/* Bad: Weak contrast */
.title { font-size: 18px; color: hsl(0, 0%, 27%); }
.subtitle { font-size: 16px; color: hsl(0, 0%, 40%); }

/* Good: Strong contrast */
.title { font-size: 18px; font-weight: 700; color: hsl(0, 0%, 95%); }
.subtitle { font-size: 14px; font-weight: 400; color: hsl(0, 0%, 60%); }
```

### Repetition

> **Repeat visual styles to create unity and consistency.**

Every element should belong to a "family" of similar elements.

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
}

/* All cards use the same radius */
.card { border-radius: var(--radius-lg); }
.button { border-radius: var(--radius-md); }
.input { border-radius: var(--radius-sm); }

/* DON'T: Random radii */
.card-1 { border-radius: 12px; }
.card-2 { border-radius: 8px; }
.button { border-radius: 20px; }
```

### Alignment

> **Every element should have a visual connection to something else on the page.**

Nothing should appear arbitrarily placed.

```css
/* Create strong alignment with consistent spacing */
.content {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-md);
}

/* Elements align to grid lines */
.sidebar { grid-column: 1 / 4; }
.main { grid-column: 4 / 13; }
```

### Proximity

> **Related items should be grouped together. Space between groups should be larger than space within groups.**

```css
/* Related items: tight spacing */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px; /* Tight: label and input are related */
}

/* Separate groups: larger spacing */
.form-group + .form-group {
  margin-top: 24px; /* Loose: different fields are separate concepts */
}
```

### Visual Example

```
WRONG (Uniform spacing):
[Label]
[Input]

[Label]
[Input]

[Label]
[Input]

RIGHT (Proximity-based):
[Label]      ← 4px gap (related)
[Input]
             ← 24px gap (separate groups)
[Label]      ← 4px gap
[Input]
             ← 24px gap
[Label]      ← 4px gap
[Input]
```

---

## Law of Common Region

> **Elements sharing a defined boundary are perceived as grouped together.**

This is the cognitive basis for the "Card" metaphor in UI design. When elements share a border, background color, or container, the brain automatically groups them as related.

### The Card as Cognitive Container

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
```

By placing elements inside a card:
- Users understand they are related
- Visual hierarchy is established (card = one unit)
- Scanning becomes easier (chunk of information)

### Padding as "Internal Pressure"

**A card is defined not just by its boundary, but by its padding.**

Padding is the "internal pressure" that prevents content from collapsing against the edges. Insufficient padding makes a component feel:
- **Broken** — like something is wrong
- **Cheap** — like corners were cut
- **Cramped** — uncomfortable to read

```css
/* BAD: Insufficient padding */
.card-cramped {
  padding: 8px; /* Content feels squeezed */
}

/* GOOD: Generous padding */
.card {
  padding: var(--space-4); /* 16px - content breathes */
}

/* BETTER: Responsive padding */
.card {
  padding: clamp(16px, 4vw, 32px);
}
```

**Rule of thumb:** Card padding should be at least equal to the base font size (14-16px), and often 1.5-2x that amount for comfortable breathing room.

### Design Checklist

- [ ] Do related elements share a visual container?
- [ ] Is card padding sufficient for content to breathe?
- [ ] Are containers visually distinct from the background?
- [ ] Does the grouping match the logical relationships?

---

## The Bouba/Kiki Effect

> **Sharp, angular shapes are perceived as harsh or aggressive. Rounded shapes are perceived as friendly and safe.**

This is a well-documented cognitive phenomenon: when asked to match the nonsense words "bouba" and "kiki" to shapes, 95%+ of people across cultures assign "bouba" to rounded shapes and "kiki" to spiky shapes.

### Implications for UI

| Shape | Perception | Use Case |
|-------|------------|----------|
| **Sharp corners** | Aggressive, hostile, serious | Warning dialogs, error states, "danger zone" actions |
| **Rounded corners** | Friendly, safe, approachable | Cards, buttons, avatars, most UI elements |
| **Circles** | Soft, complete, infinite | Profile pictures, toggles, loading indicators |

### Why We Default to Rounded Corners

```css
/* Harsh - feels "dangerous" to touch */
.button-sharp {
  border-radius: 0;
}

/* Friendly - invites interaction */
.button {
  border-radius: var(--radius-md); /* 8px */
}

/* Very approachable - playful */
.button-pill {
  border-radius: 9999px;
}
```

### Border Radius Scale

Consistent radii reinforce the Repetition principle while leveraging the Bouba/Kiki effect:

```css
:root {
  --radius-sm: 4px;   /* Inputs, small elements */
  --radius-md: 8px;   /* Buttons, tags */
  --radius-lg: 12px;  /* Cards, modals */
  --radius-xl: 16px;  /* Large cards, hero sections */
  --radius-full: 9999px; /* Pills, avatars */
}
```

### When to Use Sharp Corners

Sharp corners can be intentional for:
- **Brutalist aesthetics** — raw, industrial design language
- **Danger/warning states** — reinforces the severity
- **Editorial/newspaper styles** — serious, authoritative tone

```css
/* Intentionally sharp for warning */
.alert-danger {
  border-radius: 0;
  border-left: 4px solid var(--color-danger);
}
```

### Design Checklist

- [ ] Are interactive elements using rounded corners by default?
- [ ] Is the border-radius scale consistent across the UI?
- [ ] Are sharp corners used intentionally (not by accident)?
- [ ] Does the corner style match the intended tone?

---

## Additional Laws

### The Von Restorff Effect (Isolation Effect)

> Items that stand out are more memorable.

Use for: Primary CTAs, important notifications, key features.

```css
/* Make the primary action stand out */
.button-primary {
  background: var(--brand);
  color: white;
  box-shadow: 0 4px 12px hsla(220, 80%, 50%, 0.3);
}

.button-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
```

### The Peak-End Rule

> People judge experiences based on the peak and the end, not the average.

Focus on: Delightful micro-interactions, smooth checkout, satisfying completion states.

```css
/* Make completion feel rewarding */
@keyframes success-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.success-checkmark {
  animation: success-bounce 0.4s ease-out;
  color: var(--success);
}
```

### Tesler's Law (Conservation of Complexity)

> Every application has inherent complexity that cannot be removed—only moved.

If you simplify the UI, the complexity moves to the user's mental model or the backend. Choose wisely where complexity lives.

### Postel's Law (Robustness Principle)

> Be conservative in what you send, liberal in what you accept.

- Accept multiple input formats (phone: "555-1234", "(555) 123-4567", "5551234")
- Output in a consistent, clean format
- Provide helpful error messages, not rejections
