# Interface Types Reference

## Table of Contents
1. [The Classification Question](#the-classification-question)
2. [Native Mobile Apps](#native-mobile-apps)
3. [Web Applications](#web-applications)
4. [Marketing Websites](#marketing-websites)
5. [Hybrid Considerations](#hybrid-considerations)

---

## The Classification Question

> **Before designing anything, determine WHAT you're building. The interface type dictates fundamental patterns.**

Different interface types have different:
- Navigation paradigms
- Interaction models
- Information density expectations
- Platform conventions
- Technical constraints

### The Decision Framework

Ask these questions in order:

**1. What device is primary?**
| Answer | Implication |
|--------|-------------|
| Mobile phone | Likely native app OR mobile-first web |
| Desktop/laptop | Likely web application OR marketing site |
| Both equally | Responsive web app with adaptive patterns |

**2. What's the interaction model?**
| Answer | Implication |
|--------|-------------|
| Touch-only, gestures | Native mobile app |
| Mouse + keyboard primary | Web application |
| Scroll + occasional click | Marketing website |

**3. How often do users return?**
| Answer | Implication |
|--------|-------------|
| Daily/hourly (habitual) | Native app or web app |
| Occasionally (task-based) | Web app |
| Once or rarely (discovery) | Marketing website |

**4. What's the information density?**
| Answer | Implication |
|--------|-------------|
| Single task per screen | Native mobile app |
| Multiple data widgets | Web application dashboard |
| Narrative/storytelling | Marketing website |

---

## Native Mobile Apps

> **Native apps follow platform conventions. iOS and Android have distinct design languages.**

### When You're Building a Native App

Indicators:
- Touch is the only input method
- Users expect platform-native feel
- App Store/Play Store distribution
- Gesture navigation (swipe back, pull to refresh)
- Bottom tab bar navigation
- Single-task focused screens

### iOS Design Patterns (Human Interface Guidelines)

**Navigation**
```
┌─────────────────────────────┐
│  ← Back    Title    Action  │  ← Navigation bar (top)
├─────────────────────────────┤
│                             │
│                             │
│       Content Area          │
│                             │
│                             │
├─────────────────────────────┤
│  🏠   📊   ➕   💬   👤    │  ← Tab bar (bottom, 5 max)
└─────────────────────────────┘
```

**Key Conventions**
| Element | iOS Pattern |
|---------|-------------|
| Primary navigation | Bottom tab bar (max 5 items) |
| Secondary navigation | Back button (top left), swipe from edge |
| Typography | SF Pro (system font) |
| Corners | Continuous (squircle), not circular |
| Modals | Sheet that slides up, can be dismissed by drag |
| Actions | Primary action top-right of nav bar |
| Destructive actions | Red, often with confirmation |

**Spacing & Sizing**
| Element | Size |
|---------|------|
| Tab bar height | 49pt (83pt with safe area) |
| Nav bar height | 44pt (91pt with status bar) |
| Touch targets | Minimum 44×44pt |
| Standard margin | 16pt |
| List row height | 44pt minimum |

### Android Design Patterns (Material Design 3)

**Navigation**
```
┌─────────────────────────────┐
│  ☰    Title                 │  ← Top app bar
├─────────────────────────────┤
│                             │
│                             │
│       Content Area          │
│                         🖊️  │  ← FAB (optional)
│                             │
├─────────────────────────────┤
│  🏠   📊   ➕   💬   👤    │  ← Navigation bar (bottom)
└─────────────────────────────┘
```

**Key Conventions**
| Element | Material Pattern |
|---------|------------------|
| Primary navigation | Bottom navigation bar OR navigation drawer |
| Secondary navigation | Back button (system), top app bar actions |
| Typography | Roboto (system) or custom |
| Corners | Rounded rectangles (4-28dp radius scale) |
| Modals | Bottom sheets, dialogs |
| Primary action | FAB (Floating Action Button) |
| Elevation | Shadow-based depth system |

**Spacing & Sizing**
| Element | Size |
|---------|------|
| Bottom nav height | 80dp |
| Top app bar height | 64dp |
| Touch targets | Minimum 48×48dp |
| Standard margin | 16dp |
| FAB size | 56dp (regular), 96dp (large) |

### Native App Interaction Patterns

**Gestures to Support**
| Gesture | Action |
|---------|--------|
| Swipe from left edge | Navigate back (iOS) |
| Pull down | Refresh content |
| Swipe on list item | Reveal actions (delete, archive) |
| Long press | Context menu |
| Pinch | Zoom (images, maps) |

**Feedback Patterns**
| Interaction | Feedback |
|-------------|----------|
| Tap | Ripple (Android) or highlight (iOS) |
| Success | Haptic + visual confirmation |
| Error | Shake animation + haptic |
| Loading | Skeleton screens, NOT spinners |

### Code Approach for Native-Style

When building native-feeling interfaces with web tech (React Native, Capacitor, PWA):

```css
/* iOS-style bottom tab bar */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 49px;
  padding-bottom: env(safe-area-inset-bottom); /* iPhone notch */
  display: flex;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 0.5px solid rgba(0, 0, 0, 0.1);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 10px;
  color: var(--text-secondary);
}

.tab-item.active {
  color: var(--brand);
}

/* Content area accounting for tab bar */
.content {
  padding-bottom: calc(49px + env(safe-area-inset-bottom));
}
```

---

## Web Applications

> **Web apps are productivity tools. They prioritize information density, efficiency, and desktop interaction.**

> **Responsive approach: DESKTOP-FIRST.** Web apps use `max-width` media queries. Start with the full desktop layout, then collapse for smaller screens. This is the opposite of marketing sites.

### When You're Building a Web App

Indicators:
- Users perform complex, multi-step tasks
- Data-heavy interfaces (dashboards, tables, charts)
- Mouse + keyboard is primary input
- Sidebar navigation is natural
- Multiple panels/widgets on screen
- Users spend extended time in the app

### Web Application Navigation Patterns

**Sidebar Navigation (Most Common)**
```
┌──────┬──────────────────────────────────┐
│      │  Header / Breadcrumbs / Search  │
│  N   ├──────────────────────────────────┤
│  A   │                                  │
│  V   │                                  │
│      │        Main Content Area         │
│  S   │                                  │
│  I   │                                  │
│  D   │                                  │
│  E   │                                  │
│      │                                  │
└──────┴──────────────────────────────────┘
```

**Top Navigation + Content**
```
┌─────────────────────────────────────────┐
│  Logo    Nav    Nav    Nav      Search  │
├─────────────────────────────────────────┤
│                                         │
│              Main Content               │
│                                         │
└─────────────────────────────────────────┘
```

**Dashboard Grid Layout**
```
┌──────┬─────────────────┬────────┐
│      │  Stats Bar      │        │
│  N   ├────────┬────────┤  Side  │
│  A   │        │        │  Panel │
│  V   │ Chart  │ Chart  │        │
│      │        │        │        │
│      ├────────┴────────┤        │
│      │  Data Table     │        │
└──────┴─────────────────┴────────┘
```

### Web App Design Principles

| Principle | Application |
|-----------|-------------|
| Information density | More data per screen than mobile |
| Hover states | Essential for mouse users |
| Keyboard navigation | Tab order, shortcuts, focus management |
| Multi-column layouts | Utilize wide screens |
| Persistent navigation | Sidebar always visible |
| State indicators | Active, selected, expanded states |

### Web App Sizing

| Element | Size |
|---------|------|
| Sidebar width | 240-280px (collapsible to 64px icons) |
| Header height | 48-64px |
| Base font | 14px (dashboard) or 16px (content-heavy) |
| Touch targets | 32×32px minimum (mouse-friendly) |
| Table row height | 40-52px |
| Card padding | 16-24px |

### Code Pattern: Dashboard Layout

**Required HTML Structure:**

```html
<div class="dashboard">
  <aside class="sidebar"><!-- Navigation --></aside>
  <header class="header"><!-- Top bar with search, profile --></header>
  <main class="main"><!-- Dashboard content --></main>
  <aside class="aside"><!-- Optional: Right panel --></aside>
</div>
```

> **Match your grid to your HTML.** If you omit `<aside class="aside">` from HTML, use the 2-column grid. If you include it, use the 3-column grid. Mismatched grids cause layout breaks.

**3-Column Layout (with right aside panel):**

```css
.dashboard {
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  grid-template-rows: 64px 1fr;
  grid-template-areas:
    "sidebar header header"
    "sidebar main aside";
  min-height: 100vh;
}

.sidebar {
  grid-area: sidebar;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  padding: var(--space-4);
  overflow-y: auto;
}

.header {
  grid-area: header;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
}

.main {
  grid-area: main;
  padding: var(--space-6);
  overflow-y: auto;
}

.aside {
  grid-area: aside;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  padding: var(--space-4);
}
```

**2-Column Layout (no right aside panel):**

If your dashboard doesn't need a right panel, remove `<aside class="aside">` from HTML and use this simpler grid:

```css
.dashboard {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 64px 1fr;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  min-height: 100vh;
}

/* sidebar, header, main styles same as above */

/* Responsive: Collapse sidebar on tablet */
@media (max-width: 1024px) {
  .dashboard {
    grid-template-columns: 64px 1fr;
    grid-template-areas:
      "sidebar header"
      "sidebar main";
  }

  .aside {
    display: none; /* Or convert to modal */
  }

  .sidebar {
    /* Icon-only mode */
  }
}

/* Responsive: Stack on mobile */
@media (max-width: 768px) {
  .dashboard {
    grid-template-columns: 1fr;
    grid-template-rows: 64px 1fr 56px;
    grid-template-areas:
      "header"
      "main"
      "nav";
  }

  .sidebar {
    grid-area: nav;
    /* Convert to bottom tab bar */
    position: fixed;
    top: auto;    /* CRITICAL: Reset inherited top from desktop sticky positioning */
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    flex-direction: row;
  }

  .nav-item {
    flex: 1;      /* Equal-width tab items regardless of label length */
    text-align: center;
  }
}
```

---

## Marketing Websites

> **Marketing sites are storytelling tools. They guide visitors through a narrative toward conversion.**

> **Responsive approach: MOBILE-FIRST.** Marketing sites use `min-width` media queries. Start with single-column mobile layout, then expand for larger screens. This is the opposite of web apps.

### When You're Building a Marketing Website

Indicators:
- Goal is conversion (sign up, purchase, contact)
- Content is primarily consumed, not created
- First-time visitors are the primary audience
- Scroll-based storytelling is natural
- Visual impact matters more than density
- Single-page or few pages with distinct purposes

### Marketing Site Structure

**The Standard Flow**
```
┌─────────────────────────────────────────┐
│            Sticky Navigation            │
├─────────────────────────────────────────┤
│                                         │
│               Hero Section              │
│        (Headline + CTA + Visual)        │
│                                         │
├─────────────────────────────────────────┤
│           Social Proof / Logos          │
├─────────────────────────────────────────┤
│                                         │
│             Features/Benefits           │
│          (Often 3-column grid)          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│              How It Works               │
│            (Step-by-step)               │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│             Testimonials                │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│              Pricing Table              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│           Final CTA Section             │
│                                         │
├─────────────────────────────────────────┤
│                 Footer                  │
└─────────────────────────────────────────┘
```

### Marketing Site Design Principles

| Principle | Application |
|-----------|-------------|
| Visual hierarchy | One clear focal point per section |
| Generous whitespace | Let content breathe, 80-120px between sections |
| Scroll-triggered animation | Reveal content as user scrolls |
| Strong CTAs | Clear, contrasting, repeated throughout |
| Trust signals | Logos, testimonials, security badges |
| Speed | First impression is critical |

### Marketing Site Typography

| Element | Typical Size |
|---------|--------------|
| Hero headline | 48-72px (clamp for responsiveness) |
| Section headlines | 32-48px |
| Body text | 18-20px (larger for readability) |
| Navigation | 14-16px |
| Button text | 14-16px, semibold |

### Code Pattern: Marketing Hero

```css
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(2rem, 8vw, 6rem);
  position: relative;
  overflow: hidden;
}

.hero-content {
  max-width: 800px;
  z-index: 1;
}

.hero-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: hsla(var(--brand-hue), 80%, 50%, 0.1);
  color: hsl(var(--brand-hue), 80%, 50%);
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.6s ease-out 0.1s both;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.hero-subtitle {
  font-size: clamp(1.125rem, 2vw, 1.375rem);
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 600px;
  margin-bottom: 2rem;
  animation: fadeInUp 0.6s ease-out 0.3s both;
}

.hero-cta-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.hero-visual {
  position: absolute;
  right: -10%;
  top: 50%;
  transform: translateY(-50%);
  width: 50%;
  max-width: 600px;
  animation: fadeInScale 0.8s ease-out 0.3s both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInScale {
  from { opacity: 0; transform: translateY(-50%) scale(0.9); }
  to { opacity: 1; transform: translateY(-50%) scale(1); }
}
```

---

## Hybrid Considerations

### Progressive Web Apps (PWAs)

PWAs blur the line between web and native. Key decisions:

| Scenario | Recommendation |
|----------|----------------|
| Installed on home screen | Use native-like patterns (bottom nav) |
| Accessed via browser | Use web app patterns (sidebar) |
| Both equally likely | Adaptive: detect display-mode media query |

```css
/* Detect if running as installed PWA */
@media (display-mode: standalone) {
  /* Use native app patterns */
  .sidebar { display: none; }
  .bottom-nav { display: flex; }
}

@media (display-mode: browser) {
  /* Use web app patterns */
  .sidebar { display: flex; }
  .bottom-nav { display: none; }
}
```

### Responsive Web Apps

When a web app must work on mobile:

| Viewport | Navigation Pattern |
|----------|-------------------|
| Desktop (1024px+) | Sidebar |
| Tablet (768-1024px) | Collapsed sidebar (icons only) |
| Mobile (<768px) | Bottom tab bar OR hamburger menu |

The key insight: **navigation paradigm changes with viewport**, not just layout.

### When to Ask

If the interface type isn't clear from context, ask:

> "Before I design this, I want to make sure I use the right patterns. Is this:
> 1. A native mobile app (iOS/Android with tab bars, gestures)?
> 2. A web application (dashboard with sidebar, desktop-first)?
> 3. A marketing website (landing page with hero, scroll-based)?
> 4. A responsive web app that needs to work across all devices?"

---

## Quick Reference

| Interface Type | Navigation | Primary Input | Density | Key Pattern |
|---------------|------------|---------------|---------|-------------|
| **Native iOS** | Bottom tabs + back | Touch + gesture | Low (focused) | 44pt targets, SF Pro |
| **Native Android** | Bottom nav + FAB | Touch + gesture | Low (focused) | 48dp targets, Material |
| **Web App** | Sidebar | Mouse + keyboard | High (dense) | Hover states, shortcuts |
| **Marketing Site** | Top nav (sticky) | Scroll + click | Low (spacious) | Hero + sections + CTA |
| **PWA** | Adaptive | Touch or mouse | Medium | display-mode detection |
