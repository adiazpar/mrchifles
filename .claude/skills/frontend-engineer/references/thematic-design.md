# Thematic Design Reference

## Table of Contents
1. [Beyond Generic UI](#beyond-generic-ui)
2. [Domain Discovery](#domain-discovery)
3. [Thematic Elements Library](#thematic-elements-library)
4. [Domain-Specific Aesthetics](#domain-specific-aesthetics)
5. [Immersive Techniques](#immersive-techniques)
6. [Implementation Patterns](#implementation-patterns)

---

## Beyond Generic UI

> **Great interfaces don't just display content — they inhabit a world.**

The difference between a forgettable app and a memorable one is **thematic design**: the UI doesn't just present information, it creates an experience that matches the domain.

### Generic vs Thematic

| Generic Approach | Thematic Approach |
|------------------|-------------------|
| Dark mode + cards | **Observatory control panel** (astronomy app) |
| Clean dashboard | **Trading floor terminal** (finance app) |
| Simple form layout | **Medical chart interface** (health app) |
| Basic list view | **Mission briefing dossier** (productivity app) |
| Standard settings | **Ship's engineering console** (sci-fi themed) |

### The Thematic Mindset

Before designing, ask:

1. **What world does this app belong to?**
   - Not "what colors should I use" — what *environment* should users feel they're in?

2. **What real-world interfaces inspire this domain?**
   - Financial apps → Bloomberg terminals, stock tickers, bank vaults
   - Space/astronomy → NASA mission control, observatories, spacecraft HUDs
   - Health/fitness → Medical monitors, athletic dashboards, lab equipment
   - Music → Recording studios, vinyl players, concert equipment

3. **What decorative elements evoke this world?**
   - Textures, patterns, backgrounds, overlays, chrome, typography styles

---

## Domain Discovery

> **Every domain has visual language waiting to be borrowed.**

### Domain Interview Questions

When starting a project, mentally interview the domain:

1. **What physical spaces exist in this domain?**
   - Astronomy → Observatories, planetariums, spacecraft interiors
   - Finance → Trading floors, bank vaults, stock exchanges
   - Gaming → Arcades, esports arenas, game worlds

2. **What equipment/tools are used?**
   - Astronomy → Telescopes, star charts, spectrometers
   - Music → Mixing boards, synthesizers, turntables
   - Medical → Monitors, charts, diagnostic equipment

3. **What visual artifacts exist?**
   - Astronomy → Star maps, constellation diagrams, orbital paths
   - Finance → Ticker tape, candlestick charts, ledgers
   - Fitness → Heart rate monitors, workout logs, timers

4. **What's the emotional tone?**
   - Astronomy → Wonder, precision, vast scale
   - Finance → Urgency, confidence, precision
   - Gaming → Energy, competition, immersion

### Domain → Theme Translation

| Domain | Theme Inspiration | Visual Language |
|--------|------------------|-----------------|
| **Astronomy/Space** | Observatory, NASA mission control | Star fields, scan lines, technical readouts, monospace fonts, coordinate grids |
| **Finance/Trading** | Bloomberg terminal, bank vault | Data density, ticker fonts, green-on-black, candlestick motifs, security badges |
| **Health/Medical** | Hospital monitors, lab equipment | Clean whites, vital sign displays, anatomical diagrams, clinical precision |
| **Music/Audio** | Recording studio, vintage gear | VU meters, waveforms, knobs/sliders, warm analog textures |
| **Gaming/Esports** | Arcade cabinets, HUDs | Neon accents, score displays, level indicators, achievement badges |
| **Weather/Climate** | Weather stations, radar | Atmospheric gradients, radar sweeps, temperature scales, cloud motifs |
| **Travel/Maps** | Airports, navigation | Departure boards, route lines, destination markers, passport stamps |
| **Productivity** | Command centers, war rooms | Status boards, priority indicators, timeline bars, briefing formats |
| **E-commerce** | Boutique shops, catalogs | Product photography, price tags, shopping bags, receipt aesthetics |
| **Social/Community** | Coffee shops, town squares | Warm textures, conversation bubbles, community boards, profile frames |

---

## Thematic Elements Library

> **Concrete CSS patterns for creating immersive interfaces.**

**How to use these patterns:** These are reference implementations demonstrating the expected level of thematic commitment and technical sophistication—not templates to copy verbatim. Use them as:
- **Quality anchors** — Your implementations should match this level of detail and polish
- **Technique demonstrations** — Learn the CSS techniques (layered shadows, pseudo-elements, animations), then apply them creatively
- **Inspiration, not constraints** — For domains not shown here, apply the same depth of thinking to create original implementations

The goal is to internalize the *approach* (layered effects, atmospheric depth, domain-appropriate details) and apply it freshly to each project.

### Star Field Background (Space/Astronomy)

```css
.starfield {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at bottom, hsl(213, 33%, 16%) 0%, hsl(230, 25%, 5%) 100%);
  overflow: hidden;
  z-index: -1;
}

/* Animated stars using pseudo-elements */
.starfield::before,
.starfield::after {
  content: '';
  position: absolute;
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
  box-shadow:
    /* Generate many stars with box-shadow */
    25vw 10vh 0 0 rgba(255,255,255,0.8),
    50vw 20vh 0 0 rgba(255,255,255,0.6),
    75vw 30vh 0 0 rgba(255,255,255,0.9),
    10vw 40vh 0 0 rgba(255,255,255,0.5),
    90vw 50vh 0 0 rgba(255,255,255,0.7),
    30vw 60vh 0 0 rgba(255,255,255,0.8),
    60vw 70vh 0 0 rgba(255,255,255,0.6),
    80vw 80vh 0 0 rgba(255,255,255,0.9),
    15vw 90vh 0 0 rgba(255,255,255,0.5),
    45vw 15vh 0 0 rgba(255,255,255,0.7),
    /* Add 20-30 more for density */
    5vw 5vh 0 0 rgba(255,255,255,0.4),
    95vw 95vh 0 0 rgba(255,255,255,0.6),
    20vw 75vh 0 0 rgba(255,255,255,0.8),
    70vw 25vh 0 0 rgba(255,255,255,0.5),
    40vw 85vh 0 0 rgba(255,255,255,0.7);
  animation: twinkle 4s ease-in-out infinite alternate;
}

.starfield::after {
  animation-delay: 2s;
  opacity: 0.5;
}

@keyframes twinkle {
  from { opacity: 0.6; }
  to { opacity: 1; }
}
```

### Scan Lines Overlay (Retro Tech/CRT)

```css
.scanlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
}

/* More prominent CRT effect */
.scanlines--heavy {
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
}

/* Animated scan line */
.scanlines--animated::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.05);
  animation: scanline 8s linear infinite;
}

@keyframes scanline {
  from { transform: translateY(-100%); }
  to { transform: translateY(100vh); }
}
```

### Grid Overlay (Technical/Blueprint)

```css
.grid-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Dot grid variant */
.dot-grid {
  background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Blueprint style */
.blueprint-grid {
  background-color: hsl(220, 43%, 18%);
  background-image:
    linear-gradient(rgba(100,150,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100,150,255,0.1) 1px, transparent 1px),
    linear-gradient(rgba(100,150,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100,150,255,0.05) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
}
```

### Noise/Grain Texture (Analog/Film)

```css
.grain {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* CSS-only grain alternative */
.grain-css {
  background:
    repeating-radial-gradient(
      circle at 17% 32%,
      white 0px,
      transparent 1px,
      transparent 2px
    ),
    repeating-radial-gradient(
      circle at 73% 68%,
      white 0px,
      transparent 1px,
      transparent 3px
    );
  opacity: 0.03;
}
```

### Glow Effects (Neon/Cyberpunk)

```css
/* Neon text glow */
.neon-text {
  color: hsl(0, 0%, 100%);
  text-shadow:
    0 0 5px hsl(0, 0%, 100%),
    0 0 10px hsl(0, 0%, 100%),
    0 0 20px var(--brand),
    0 0 40px var(--brand),
    0 0 80px var(--brand);
}

/* Neon border */
.neon-border {
  border: 2px solid var(--brand);
  box-shadow:
    0 0 5px var(--brand),
    0 0 10px var(--brand),
    inset 0 0 5px var(--brand),
    inset 0 0 10px var(--brand);
}

/* Subtle UI glow (less intense) */
.soft-glow {
  box-shadow:
    0 0 20px hsla(var(--brand-hue), 80%, 50%, 0.15),
    0 0 40px hsla(var(--brand-hue), 80%, 50%, 0.1);
}

/* Pulsing glow animation */
.pulse-glow {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 20px hsla(var(--brand-hue), 80%, 50%, 0.2);
  }
  50% {
    box-shadow: 0 0 30px hsla(var(--brand-hue), 80%, 50%, 0.4);
  }
}
```

### Terminal/Monospace UI (Hacker/Dev)

```css
.terminal {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  background: hsl(0, 0%, 4%);
  color: hsl(120, 100%, 50%);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid hsl(120, 100%, 50%);
}

.terminal__prompt {
  color: hsl(120, 100%, 50%);
}

.terminal__prompt::before {
  content: '> ';
  color: hsl(0, 0%, 53%);
}

.terminal__cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  background: hsl(120, 100%, 50%);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Status readout style */
.readout {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.readout__label {
  color: var(--text-secondary);
}

.readout__value {
  color: var(--brand);
  font-weight: 600;
}
```

### Glassmorphism (Modern/Ethereal)

For glass and blur effect CSS patterns (`.glass-card`, `.glass-nav`, frosted variants), see [css-patterns.md](css-patterns.md#glass--blur-effects).

### Ambient Gradients (Atmospheric)

```css
/* Aurora/Northern lights */
.aurora {
  background:
    radial-gradient(ellipse at 20% 0%, hsla(280, 80%, 50%, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 0%, hsla(180, 80%, 50%, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 100%, hsla(220, 80%, 30%, 0.5) 0%, transparent 50%),
    linear-gradient(to bottom, hsl(240, 54%, 8%), hsl(240, 43%, 18%));
}

/* Sunset */
.sunset {
  background: linear-gradient(
    to bottom,
    hsl(270, 62%, 11%) 0%,
    hsl(318, 51%, 19%) 20%,
    hsl(346, 52%, 36%) 40%,
    hsl(0, 54%, 54%) 60%,
    hsl(27, 86%, 64%) 80%,
    hsl(48, 84%, 71%) 100%
  );
}

/* Ocean depth */
.ocean {
  background: linear-gradient(
    to bottom,
    hsl(210, 100%, 7%) 0%,
    hsl(210, 100%, 13%) 30%,
    hsl(210, 100%, 19%) 60%,
    hsl(210, 100%, 25%) 100%
  );
}

/* Forest */
.forest {
  background: linear-gradient(
    135deg,
    hsl(120, 54%, 8%) 0%,
    hsl(120, 38%, 16%) 50%,
    hsl(120, 30%, 23%) 100%
  );
}
```

---

## Domain-Specific Aesthetics

> **Complete aesthetic packages for common domains.**

**Note:** These four domains (Astronomy, Finance, Health, Music) are illustrative examples—not an exhaustive list. Apply the same methodology to ANY domain: identify its physical spaces, equipment, visual artifacts, and emotional tone, then translate those into CSS variables, component styles, and micro-interactions. A veterinary app, architecture portfolio, or cooking platform each deserve equally thoughtful thematic treatment.

### Astronomy / Space

```css
:root {
  /* Colors */
  --bg-base: hsl(223, 33%, 6%);
  --bg-surface: hsl(224, 28%, 10%);
  --bg-elevated: hsl(222, 26%, 14%);
  --brand: hsl(166, 100%, 42%); /* Teal/cyan - observatory displays */
  --accent: hsl(18, 100%, 60%); /* Orange - Mars, alerts */

  /* Typography */
  --font-display: 'Outfit', sans-serif; /* Technical, geometric feel */
  --font-mono: 'JetBrains Mono', monospace;

  /* Effects */
  --glow-color: rgba(0, 212, 170, 0.3);
}

/* Observatory panel style */
.panel--observatory {
  background: var(--bg-surface);
  border: 1px solid rgba(0, 212, 170, 0.2);
  border-radius: 4px;
  position: relative;
}

.panel--observatory::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--brand), transparent);
}

/* Coordinate display */
.coordinates {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--brand);
  text-transform: uppercase;
}

/* Status indicator */
.status-operational {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.status-operational::before {
  content: '';
  width: 8px;
  height: 8px;
  background: hsl(120, 100%, 50%);
  border-radius: 50%;
  box-shadow: 0 0 8px hsl(120, 100%, 50%);
}
```

### Finance / Trading

```css
:root {
  /* Bloomberg-inspired */
  --bg-base: hsl(0, 0%, 4%); /* Near-black, not pure black (OLED smearing) */
  --bg-surface: hsl(0, 0%, 10%);
  --bg-elevated: hsl(0, 0%, 16%);
  --brand: hsl(33, 100%, 50%); /* Bloomberg orange */
  --success: hsl(145, 100%, 39%);
  --error: hsl(348, 100%, 54%);

  /* Typography - data dense */
  --font-display: 'DM Sans', sans-serif;
  --font-data: 'JetBrains Mono', monospace; /* Distinctive mono, not Roboto */
  --base-size: 14px; /* Dense but follows Two-Pixel Rule */
}

/* Ticker style */
.ticker {
  font-family: var(--font-data);
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ticker__symbol {
  font-weight: 700;
  color: var(--text-primary);
}

.ticker__price {
  font-size: 18px;
  font-weight: 600;
}

.ticker__change {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 2px;
}

.ticker__change--up {
  background: rgba(0, 200, 83, 0.2);
  color: var(--success);
}

.ticker__change--down {
  background: rgba(255, 23, 68, 0.2);
  color: var(--error);
}

/* Data table - trading style */
.data-table--trading {
  font-family: var(--font-data);
  font-size: 12px;
}

.data-table--trading th {
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--brand);
}
```

### Health / Medical

```css
:root {
  /* Clinical precision */
  --bg-base: hsl(210, 17%, 98%);
  --bg-surface: hsl(0, 0%, 100%);
  --bg-elevated: hsl(0, 0%, 100%);
  --brand: hsl(200, 100%, 36%); /* Medical blue */
  --success: hsl(123, 46%, 34%);
  --warning: hsl(27, 98%, 47%);
  --error: hsl(0, 65%, 51%);

  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-data: 'IBM Plex Mono', monospace;
}

/* Vital sign display */
.vital {
  padding: 16px;
  border-left: 4px solid var(--brand);
  background: var(--bg-surface);
}

.vital__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.vital__value {
  font-family: var(--font-data);
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
}

.vital__unit {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Heart rate style */
.pulse-line {
  stroke: var(--error);
  stroke-width: 2;
  fill: none;
  animation: pulse-draw 1s ease-in-out infinite;
}

@keyframes pulse-draw {
  0% { stroke-dashoffset: 100; }
  100% { stroke-dashoffset: 0; }
}
```

### Music / Audio

```css
:root {
  /* Warm analog feel */
  --bg-base: hsl(20, 13%, 9%);
  --bg-surface: hsl(20, 13%, 15%);
  --bg-elevated: hsl(20, 11%, 20%);
  --brand: hsl(18, 100%, 58%); /* Warm orange - VU meters */
  --accent: hsl(51, 100%, 50%); /* Gold - vintage equipment */

  --font-display: 'Instrument Sans', sans-serif;
}

/* VU meter */
.vu-meter {
  display: flex;
  gap: 2px;
  height: 60px;
  align-items: flex-end;
}

.vu-meter__bar {
  width: 8px;
  background: linear-gradient(
    to top,
    hsl(120, 100%, 50%) 0%,
    hsl(120, 100%, 50%) 60%,
    hsl(60, 100%, 50%) 60%,
    hsl(60, 100%, 50%) 80%,
    hsl(0, 100%, 50%) 80%,
    hsl(0, 100%, 50%) 100%
  );
  border-radius: 2px;
  transition: height 0.1s ease;
}

/* Knob control */
.knob {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(145deg, hsl(20, 8%, 21%), hsl(20, 13%, 15%));
  border: 2px solid hsl(20, 7%, 27%);
  position: relative;
  cursor: pointer;
}

.knob::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 12px;
  background: var(--brand);
  border-radius: 1px;
}

/* Waveform */
.waveform {
  display: flex;
  align-items: center;
  gap: 1px;
  height: 40px;
}

.waveform__bar {
  width: 3px;
  background: var(--brand);
  border-radius: 1px;
}
```

---

## Immersive Techniques

> **Layer multiple thematic elements for deep immersion.**

### The Layering Stack

Build immersive interfaces with layers:

```
Layer 5: Interactive highlights (hover glows, focus states)
Layer 4: Content (cards, panels, text)
Layer 3: Decorative elements (floating particles, scan lines)
Layer 2: Grid/pattern overlay
Layer 1: Atmospheric background (gradients, star fields)
```

### Example: Full Space Theme

```html
<body class="space-theme">
  <!-- Layer 1: Background -->
  <div class="starfield"></div>

  <!-- Layer 2: Grid -->
  <div class="grid-overlay"></div>

  <!-- Layer 3: Particles (optional JS) -->
  <div class="particles"></div>

  <!-- Layer 4: Content -->
  <main class="content">
    <div class="panel panel--observatory">
      <!-- Your UI here -->
    </div>
  </main>

  <!-- Layer 5: Scan lines (on top) -->
  <div class="scanlines"></div>
</body>
```

```css
.space-theme {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.starfield { z-index: 0; }
.grid-overlay { z-index: 1; }
.particles { z-index: 2; }
.content { z-index: 3; position: relative; }
.scanlines { z-index: 4; }
```

### Theme-Appropriate Micro-Interactions

| Domain | Hover Effect | Click Effect | Loading State |
|--------|--------------|--------------|---------------|
| Space | Soft glow + slight lift | Pulse outward | Radar sweep |
| Finance | Border highlight | Instant feedback | Ticker animation |
| Medical | Subtle highlight | Confirmation check | Pulse/heartbeat |
| Music | Color shift | Press-down (physical) | Waveform animation |
| Gaming | Neon glow | Impact flash | Progress bar |

---

## Implementation Patterns

### Asking About Theme

When the domain allows for interpretation, ask:

> "For this [astronomy/finance/health] app, I can design it with different thematic approaches:
>
> 1. **Observatory Control Panel** — Technical, monospace fonts, scan lines, coordinate displays
> 2. **Modern Space Exploration** — Clean, minimal, subtle star motifs
> 3. **Sci-Fi Command Center** — Futuristic HUD, holographic effects, angular shapes
> 4. **Elegant Constellation** — Artistic, delicate star patterns, sophisticated typography
>
> Which direction resonates with your vision?"

### Theme Commitment

Once a theme is chosen, commit fully:

| Element | Must Reflect Theme |
|---------|-------------------|
| Background | Atmospheric, not plain color |
| Typography | Domain-appropriate fonts |
| Colors | Domain color associations |
| Borders/Shapes | Theme-consistent geometry |
| Icons | Match the aesthetic |
| Motion | Reflect the domain's energy |
| Details | Small touches that reinforce (status text, labels, decorative elements) |

### Surface vs Deep Theming

Most themed designs stop at the surface level. Push deeper.

| Depth | Characteristics | Result |
|-------|-----------------|--------|
| **Surface** | Domain colors + terminology + standard layout with themed styling applied on top | Feels like "a dashboard with honey colors" |
| **Medium** | + Decorative elements, atmospheric background, domain-appropriate typography | Feels like "a themed dashboard" |
| **Deep** | + Layout structure itself reflects the domain, unique interaction patterns, details that ONLY make sense here | Feels like "inhabiting a beekeeper's world" |

**Example — Field Journal Theme:**

| Depth | Implementation |
|-------|----------------|
| Surface | Cream/sepia palette, italic labels, "Season Overview" header |
| Medium | + Paper texture background, corner bracket borders, weather/date notation, handwriting-style headings |
| Deep | + Ruled paper lines, marginalia layout (notes in margins), sketched botanical icons, ink wash effects, asymmetric "field notes" arrangement, weathered/torn edges, coffee ring stains, crossed-out annotations |

**The "Remove Labels" Test:**

Before finalizing, ask yourself:

> "If I removed all the domain-specific labels and data, would this design still obviously belong to this theme? Or would it just look like a generic dashboard with different colors?"

If the answer is "generic dashboard," you're at surface level. Push deeper until the structure, textures, layout patterns, and decorative elements themselves are unmistakably tied to the domain.

### Theme Checklist

Before finishing a themed design, verify:

- [ ] Background has atmospheric treatment (not flat color)
- [ ] At least one decorative layer (grid, particles, texture)
- [ ] Typography matches the domain
- [ ] Colors evoke the domain
- [ ] Micro-interactions feel theme-appropriate
- [ ] Small details reinforce the theme (labels, status text, icons)
- [ ] The design could ONLY belong to this domain (not generic)
- [ ] **Passes the "Remove Labels" test** — structure alone signals the theme
- [ ] **Depth check** — am I at surface/medium/deep? If not deep, what would push it further?
