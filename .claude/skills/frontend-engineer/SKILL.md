---
name: frontend-design-engineering
description: Create distinctive, production-grade frontend interfaces through systematic design engineering. Use when building web components, pages, dashboards, React components, HTML/CSS layouts, or styling any web UI. Combines bold creative vision with mathematical precision — typography systems, algorithmic color, fluid layouts, and cognitive UX laws. Produces memorable designs that avoid generic AI aesthetics while being structurally sound and maintainable.
---

# Frontend Design Engineering

This skill synthesizes creative design thinking with systematic engineering principles. The core thesis: **typography is the foundation** — get it right and the design feels professional; get it wrong and nothing else matters. The remaining elements (color, spacing, motion) are controlled by algorithmic systems.

Design is not arbitrary artistic intuition — it is a deterministic system governed by mathematical constants, optical physics, and cognitive laws. Bold creative choices become *more* effective when built on mathematical foundations.

---

## Reference Loading Strategy

This skill includes 11 reference files with detailed implementation guidance. **Load them in phases based on need**, not all at once.

### Reference Catalog

| File | Purpose |
|------|---------|
| [references/interface-types.md](references/interface-types.md) | Navigation and layout patterns for mobile/web/marketing |
| [references/creative-philosophy.md](references/creative-philosophy.md) | Anti-convergence rules, boldness, unforgettable elements |
| [references/thematic-design.md](references/thematic-design.md) | Domain-specific theming and immersive aesthetics |
| [references/visual-elements.md](references/visual-elements.md) | Charts, graphs, sparklines, breaking card monotony |
| [references/typography.md](references/typography.md) | Type scale tables and font pairing |
| [references/color-algorithms.md](references/color-algorithms.md) | HSL/OKLCH palette generation |
| [references/css-patterns.md](references/css-patterns.md) | Production-ready code patterns |
| [references/cognitive-laws.md](references/cognitive-laws.md) | UX laws with specific applications |
| [references/accessibility.md](references/accessibility.md) | WCAG compliance requirements |
| [references/layout-patterns.md](references/layout-patterns.md) | Bento and asymmetric layouts |
| [references/design-interpretation.md](references/design-interpretation.md) | Translating vague feedback |

### Phase 1: Context Gathering (ALWAYS)

Before designing anything, read these two files to establish fundamentals:

1. **[interface-types.md](references/interface-types.md)** — Determine: Is this a native mobile app, web application, or marketing website? This fundamentally changes navigation, interaction model, and layout patterns.

2. **[creative-philosophy.md](references/creative-philosophy.md)** — Establish: What makes this design unforgettable? Internalize anti-convergence principles before making any aesthetic decisions.

### Phase 2: Project-Specific (IF APPLICABLE)

Load based on project needs:

| Condition | Load |
|-----------|------|
| User wants immersive/themed design | [thematic-design.md](references/thematic-design.md) |
| Domain naturally calls for theming (space, trading, medical, music) | [thematic-design.md](references/thematic-design.md) |
| Interface involves data visualization, dashboards, analytics | [visual-elements.md](references/visual-elements.md) |
| Numbers that should be charts instead of text | [visual-elements.md](references/visual-elements.md) |

### Phase 3: Implementation (WHEN WRITING CODE)

Load relevant files as you implement:

| Task | Load |
|------|------|
| Setting up typography scale | [typography.md](references/typography.md) |
| Creating color palette | [color-algorithms.md](references/color-algorithms.md) |
| Writing CSS patterns (spacing, shadows, forms) | [css-patterns.md](references/css-patterns.md) |
| Designing grid/bento layouts | [layout-patterns.md](references/layout-patterns.md) |

### Phase 4: Validation (BEFORE SHIPPING)

Before finalizing, verify against:

| Check | Load |
|-------|------|
| UX compliance (Hick's, Fitts's, Miller's, Jakob's laws) | [cognitive-laws.md](references/cognitive-laws.md) |
| Accessibility (contrast, focus, semantics) | [accessibility.md](references/accessibility.md) |

### Phase 5: Situational

| Situation | Load |
|-----------|------|
| User gives vague feedback ("make it better", "looks off") | [design-interpretation.md](references/design-interpretation.md) |

---

### Required Workflow

1. **Read Phase 1 references** (interface-types + creative-philosophy)
2. **Determine interface type** (native app / web app / marketing site)
3. **Establish creative direction** (anti-convergence, unforgettable element)
4. **Load Phase 2 references if applicable** (theming, data viz)
5. **Plan the design** before writing code
6. **Implement** using Phase 3 references as needed
7. **Validate** using Phase 4 references before shipping

### When to Ask the User vs When to Decide

Not every decision requires user input, but some MUST be asked. Use this guide:

**MUST ask the user when:**

| Signal | Why Ask |
|--------|---------|
| User says "app" without specifying platform | "App" is ambiguous — could mean mobile app OR web application. ALWAYS ask. |
| Interface type is ambiguous | "Build me a finance app" could be mobile app OR web dashboard |
| Multiple thematic directions are viable | A plant app could be botanical journal, greenhouse tech, or cottagecore |
| Prompt contains subjective language | Words like "special", "unique", "different", "feel like", "make it pop", "tired of generic" |
| Domain is creative/personal | Personal apps deserve personalized aesthetic direction |
| High visual stakes | Landing pages, portfolios, consumer apps where impression matters |

**Ambiguous words that REQUIRE clarification:**

- **"app"** → Mobile app? Web app? Desktop app? MUST ask.
- **"dashboard"** → Could be mobile widget or full web dashboard. Ask if unclear.
- **"interface"** → Too vague. Ask what platform.
- **"build me a [domain]"** → e.g., "build me a finance tracker" — platform unstated. Ask.

**Can decide without asking when:**

| Signal | Why Decide |
|--------|------------|
| Platform explicitly stated | "Build me an iOS app" — no ambiguity |
| Aesthetic explicitly specified | "Victorian style", "brutalist", "like Linear" |
| Standard business interface | Admin panels, CRUD dashboards with clear conventions |
| Technical constraints dominate | "Match our existing design system" |
| User said "just build it" or similar | Explicit permission to decide |

**How to ask:**

When asking, present 2-4 concrete options, not open-ended questions:

```
For your plant care app, I can take several directions:

1. **Clean & Functional** — Simple card layout, focus on clarity and usability
2. **Botanical Journal** — Vintage illustration style, paper textures, scientific feel
3. **Greenhouse Monitor** — Technical aesthetic, more data visualization, dashboard-like
4. **Cozy Cottagecore** — Warm, soft, organic shapes, hand-drawn feel

Which resonates with your vision? Or describe something different.
```

This gives the user concrete choices rather than putting the creative burden on them.

**CRITICAL: Stop and wait for answers.**

When clarification is needed:
1. **ASK the questions** — Present platform and/or aesthetic options
2. **STOP** — Do not proceed to implementation
3. **WAIT** — Let the user respond before writing any code

Do NOT ask questions and then immediately start building with assumed answers. The questions are meaningless if you don't wait for responses.

**When to use plan mode:**

If the request is ambiguous and you need to clarify multiple things (platform + aesthetic + features), consider using plan mode:
- Plan mode creates a natural checkpoint for discussion
- It separates "what should I build" from "building it"
- Use it when: ambiguous platform, creative/personal projects, complex multi-screen apps

If the user invokes this skill with `/frontend-engineer` or similar in plan mode, treat the planning phase as the time to ask ALL clarifying questions before proposing an implementation plan.

---

## How to Use This Skill: Systems vs Choices

This skill contains both **rigid systems** and **creative choices**. Understanding the difference prevents confusion:

| Category | Examples | Rule |
|----------|----------|------|
| **Structural Systems** | Two-Pixel Rule, 4px spacing scale, HSL algorithms, dual-layer shadows | **Always follow** — these create professional consistency |
| **Creative Choices** | Font selection, brand hue, aesthetic direction, layout pattern | **Always vary** — these create distinctive, non-generic designs |
| **Cognitive Laws** | Hick's Law, Fitts's Law, Miller's Law | **Never violate** — these ensure usability regardless of aesthetic |

### Resolving Apparent Conflicts

**"Anti-convergence" vs "Follow the rules"**
- Vary your creative choices (fonts, colors, aesthetics) across designs
- Apply the same structural systems (spacing, typography scale) consistently within each design

**"Maximalism" vs "Simplify (Hick's Law)"**
- Maximalism refers to **visual richness** (textures, gradients, animations)
- Hick's Law refers to **user decisions** (choices, navigation options, CTAs)
- A maximalist design can have rich visuals AND clear, simple user paths

**"Two-Pixel Rule" vs "Fluid clamp()"**
- Two-Pixel Rule applies to your **typography scale** (the discrete sizes you define)
- `clamp()` applies to **how those sizes respond** to viewport (fluid between your defined stops)

**"Typography is 80%" vs "Six pillars of content"**
- Typography is the **foundation** — if it's wrong, nothing else saves the design
- Other pillars build **upon** typography — they enhance but don't replace it

---

## Interface Type: The First Question

> **Before designing anything, determine WHAT you're building. The interface type dictates fundamental patterns.**

| Type | Navigation | Interaction | Density | Example |
|------|------------|-------------|---------|---------|
| **Native Mobile App** | Bottom tab bar | Touch + gestures | Low (focused) | Banking app, social media |
| **Web Application** | Sidebar | Mouse + keyboard | High (dense) | Dashboard, admin panel |
| **Marketing Website** | Top nav (sticky) | Scroll + click | Low (spacious) | Landing page, portfolio |

### Why This Matters

Using web app patterns (sidebar) for a mobile app feels wrong. Using native patterns (bottom tabs) for a desktop dashboard wastes screen space. Using marketing patterns (hero sections) for a productivity tool frustrates users.

**Ask first**: Is this a native mobile app, a web application, or a marketing website?

See [references/interface-types.md](references/interface-types.md) for platform-specific patterns (iOS/Android), navigation paradigms, and code examples.

---

## Design Thinking: Vision + System

Before coding, establish interface type, thematic direction, creative vision, AND systematic constraints:

**Interface Type** (What ARE we building?)
- Native mobile app (iOS/Android)? → Bottom tabs, touch gestures, platform conventions
- Web application? → Sidebar nav, hover states, keyboard shortcuts
- Marketing website? → Hero sections, scroll animations, conversion CTAs

**Thematic Design** (What WORLD does this inhabit?)
- **Domain**: What real-world environment does this app belong to? (Observatory, trading floor, medical lab, recording studio)
- **Atmosphere**: What background treatment, overlays, and decorative elements evoke this world?
- **Details**: What small touches reinforce the theme? (Status text, labels, icons, fonts)

See [references/thematic-design.md](references/thematic-design.md) for domain-specific aesthetics and immersive techniques.

**Creative Direction** (What makes this UNFORGETTABLE?)
- **Purpose**: What problem does this solve? Who uses it?
- **Tone**: Pick a **bold** aesthetic — brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian
- **Differentiation**: What's the ONE thing someone will remember? Commit fully to that vision.

See [references/creative-philosophy.md](references/creative-philosophy.md) for anti-convergence principles.

**Visual Elements** (How do we SHOW data, not just display it?)
- **Visualize numbers**: Trends → line charts. Progress → rings/bars. Comparisons → bar charts.
- **Avoid card monotony**: Not everything needs a card wrapper. Mix charts, stats, lists, images.
- **Mobile richness**: Inline sparklines, horizontal scroll stats, full-width charts — not just stacked cards.

See [references/visual-elements.md](references/visual-elements.md) for CSS-only charts, SVG patterns, and mobile visualization.

**Systematic Foundation** (How do we execute it precisely?)
- **Base unit**: 14px (dense/dashboard) or 16px (readable/general)
- **Color mode**: Dark-first or light-first? Brand hue?
- **Constraints**: Framework, performance, accessibility requirements

**Match complexity to vision**: Maximalist designs need elaborate code with extensive animations. Minimalist designs need restraint, precision, and obsessive attention to spacing and typography. Execute the vision fully.

Then implement working code that is production-grade, visually striking, systematically coherent, and meticulously refined.

---

## Pillar 1: The Typographic Foundation

Typography is the foundation. The web is primarily text — master its presentation first. If typography is wrong, no amount of color, animation, or layout will save the design.

**Key principles:**
- **Two-Pixel Rule**: Base size 14px or 16px, only deviate in 2px increments (12→14→16→18→20→24+)
- **Hierarchy through weight + luminance**, not just size. Same font-size, different weight/color creates sophisticated hierarchy
- **Luminance layers**: Primary L=90-95%, Secondary L=60%, Tertiary L=40%. Never use opacity for text
- **Line height**: Body text uses 1.5-1.6x. Headlines use tighter 1.1-1.2x for visual impact

See [references/typography.md](references/typography.md) for scale tables, luminance values, and font pairing.

---

## Pillar 2: Algorithmic Color Systems

Reject hex codes and RGB. Use **HSL** (intuitive) or **OKLCH** (perceptually uniform).

**Key principles:**
- **Single brand hue variable**: Change one number to re-theme the entire UI
- **Neutral-dominant**: 80-90% of UI is neutral. Color reserved for actions and semantic states
- **Dark mode stepping**: Background L=5-10%, Surface +5%, Elevated +5%, Borders +10%
- **Light mode inversion**: `L_light = 100 - L_dark`, but cards are white on off-white (light from above)
- **OKLCH for accessibility**: Equal L values appear equally bright across all hues (HSL doesn't)

See [references/color-algorithms.md](references/color-algorithms.md) for palette generation algorithms and CSS patterns.

---

## Pillar 3: Structural Physics (Fluid Layouts)

The browser is a dynamic environment. Build components that **intrinsically adapt**.

**Key principles:**
- **Reject hardcoded pixels**: Use `min()`, `max()`, `clamp()` for fluid sizing
- **clamp() for smooth scaling**: `clamp(min, preferred, max)` eliminates breakpoint jumps
- **Flex ratios over pixel widths**: `flex: 1` and `flex: 3` express relationships, not measurements
- **Grid for macro, Flexbox for micro**: Page structure vs component alignment
- **Scroll snapping**: Transforms slippery scrolling into structured "presentation mode"

See [references/css-patterns.md](references/css-patterns.md) for fluid sizing patterns and layout techniques.

---

## Pillar 4: Visual Engineering (Depth + Polish)

**Key principles:**
- **Dual-layer shadows**: Ambient (tight, dark) + Diffuse (soft, spread). Single shadows look fake
- **Subtle gradients**: Rotate hue 10-15° or shift lightness 5-10% to mimic surface curvature
- **Gradient borders**: Use `padding-box` and `border-box` background layers with transparent border
- **Gradient text**: `background-clip: text` with `color: transparent`
- **Motion timing**: Transitions (hover, focus) use 0.2-0.3s. Animations (entry effects) use 0.5-0.8s with staggered delays. Always use `ease-in-out` or `ease-out`
- **Every interactive element needs a hover state**

See [references/css-patterns.md](references/css-patterns.md) for shadow systems, gradient techniques, and animation patterns.

---

## Pillar 5: Cognitive UX Laws

Design for human cognition, not aesthetic preference.

### Hick's Law
Decision time increases with choices. **Relentlessly simplify.** Use progressive disclosure.

### Fitts's Law
Time to target = f(distance, size). **Make buttons big.** Touch targets: 48px minimum on mobile (satisfies both iOS 44pt and Android 48dp), 32px on desktop. Place CTAs in thumb zones.

### Jakob's Law
Users expect your site to work like sites they already know. **Don't reinvent navigation.** Logo top-left, search bar with magnifying glass, familiar patterns.

### Miller's Law
Working memory holds 7±2 items. **Chunk content.** Break 20-field forms into 4 steps of 5 fields.

### C.R.A.P. (Gestalt Principles)
- **Contrast**: If different, make VERY different
- **Repetition**: Consistent styles create unity (same border-radius everywhere)
- **Alignment**: Everything connects to an invisible grid
- **Proximity**: Related items grouped; space between groups > space within

See [references/cognitive-laws.md](references/cognitive-laws.md) for detailed applications.

---

## Accessibility: Non-Negotiable

Production-grade interfaces must be usable by everyone. Accessibility is a **structural system** requirement, not optional polish.

**Core requirements:**
- **Color contrast**: 4.5:1 minimum for text (WCAG AA)
- **Focus states**: Every interactive element must have visible `:focus-visible` styling
- **Semantic HTML**: Use correct elements (`<button>`, `<nav>`, `<main>`) for screen readers
- **Motion**: Respect `prefers-reduced-motion` for users with vestibular disorders

See [references/accessibility.md](references/accessibility.md) for WCAG guidelines, focus patterns, and screen reader support.

---

## Pillar 6: Layout Patterns & Visual Interest

Uniform grids are safe but forgettable. **Break symmetry intentionally** to create visual hierarchy and memorability.

See [references/layout-patterns.md](references/layout-patterns.md) for bento layouts, asymmetrical patterns, grid-breaking techniques, and responsive transformations.

---

## Interpreting Vague Design Requests

When users say something "doesn't look right" or needs to "look better," translate to specific actions.

See [references/design-interpretation.md](references/design-interpretation.md) for translation tables and quick fixes.

---

## Workflow: Conceptualize First, Code Second

**Define the vision before writing CSS.** Attempting to design *while* coding leads to "Implementation Bias" — defaulting to familiar patterns because they're easy to implement.

### The Trap

When design and code happen simultaneously:
- Creative options narrow to "what's easy to implement"
- Novel layouts get abandoned for familiar patterns
- The technology leads the design instead of the reverse

### The Solution

1. **Conceptualize first** — Before writing any CSS, explicitly define: What's the aesthetic direction? What's the unforgettable element? What layout pattern fits the content?
2. **Establish the system** — Define your base unit, brand hue, and typography scale before any implementation
3. **Then build** — With design decisions made, coding becomes execution rather than exploration

This separation ensures creative vision leads the implementation, not the reverse.

---

## Overcoming Blank Canvas Syndrome

For developers who struggle to start from scratch, use the **Refactoring Strategy**:

### Gather → Componentize → Refactor → Synthesize

1. **Gather**: Don't start from nothing. Screenshot designs you admire
2. **Componentize**: Break them down mentally — "They're using a 12-column grid. The spacing follows a 4px baseline. The cards have 24px padding."
3. **Refactor**: Rebuild them using *your* variables and *your* content
4. **Synthesize**: Combine the nav bar from Site A with the hero from Site B

This modular approach lets you produce professional work by standing on the shoulders of existing designs, then making them your own through systematic adaptation.

---

## The Vanilla Philosophy

**Master the underlying technologies, not just the abstractions.**

Knowing *how* `flex-grow` works mathematically is superior to knowing the class name `.flex-1` in Tailwind. Frameworks come and go; the browser (DOM, CSSOM) is eternal.

### Why This Matters

- Developers who rely entirely on UI libraries (Material UI, Bootstrap) are helpless when customization is needed
- Understanding the fundamentals enables optimizations that frameworks obscure
- Debugging becomes possible when you know what's happening under the hood

### The Principle

Before reaching for a utility class or component library, ask: "Do I understand what CSS this generates?" If not, learn it first. The best frontend engineers can build anything with vanilla CSS — frameworks just make it faster.

---

## Anti-Patterns: What to NEVER Do
- **Generic fonts**: Inter, Roboto, Arial, system-ui (choose distinctive typography)
- **Cliché colors**: Purple gradients on white (the "AI slop" signature)
- **Arbitrary values**: Random pixels/hex codes without systematic basis
- **Opacity for hierarchy**: Use HSL lightness instead
- **Single-layer shadows**: Always use ambient + diffuse
- **Hardcoded breakpoints**: Use clamp() and flex ratios
- **Size-only hierarchy**: Combine weight + luminance + size
- **Uniform spacing**: Proximity should reflect relationships
- **Equal-width card grids**: 2x2 or 3x3 of same-size boxes is NOT bento
- **Wrong responsive approach for interface type**: Marketing sites → mobile-first; Dashboards → desktop-first (see interface-types.md)

---

## Implementation Checklist

1. **Establish base unit** (14px or 16px)
2. **Define brand hue** as CSS variable
3. **Generate neutral palette** using lightness stepping algorithm
4. **Set typography scale** following Two-Pixel Rule
5. **Design layout** using correct responsive approach (mobile-first for marketing sites, desktop-first for dashboards)
6. **Apply depth** with dual-layer shadows
7. **Add motion** with 0.2-0.3s transitions
8. **Verify cognitive compliance** (Hick's, Fitts's, Miller's)
9. **Verify accessibility** (contrast ratios, focus states, semantic HTML)
10. **Test responsive transformations** (stack → grid → bento)
11. **Polish** with gradient accents, hover states, scroll behavior

Remember: Bold creative vision executed through systematic constraints produces the most memorable results. The system enables creativity — it doesn't constrain it.
