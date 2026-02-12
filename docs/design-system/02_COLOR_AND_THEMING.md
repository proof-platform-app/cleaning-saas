# Color and Theming

**Version:** 1.3
**Last Updated:** 2026-02-12

---

## Reserved Semantic Colors (Forbidden for Product Accents)

**Reserved Colors:**

The following colors are **permanently reserved** for semantic functional purposes and **may NOT be used as product accent colors**:

| Color | Hex | Purpose | Why Reserved |
|-------|-----|---------|--------------|
| Success | `#10B981` | Positive status, completed states | Must be universally recognized across all products |
| Error | `#EF4444` | Negative status, failed states | Must be universally recognized across all products |
| Warning | `#F59E0B` | Caution status, flagged states | Must be universally recognized across all products |
| Info | `#3B82F6` | Informational status, in-progress states | Must be universally recognized across all products |

**Reasoning:**

Product accent colors represent brand identity and differentiation. Semantic status colors represent universal operational meaning (success, error, warning, info). If a product accent equals a semantic color, users cannot distinguish product branding from system status.

**Example of Collision:**
- If CleanProof accent = `#10B981` (green)
- Success badge also = `#10B981` (green)
- User sees green and cannot tell if it means "CleanProof brand" or "task completed successfully"

**Enforcement:**

Product accent selection must:
1. Avoid exact matches with reserved semantic colors
2. Maintain minimum 30° hue separation from reserved colors
3. Pass automated collision detection during validation

---

## Product Accent Colors

### Product Suite

Proof Platform supports **4 products**, each with distinct accent colors:

| Product | Accent Primary | Accent Hover | Accent Active | On Primary | Contrast |
|---------|----------------|--------------|---------------|------------|----------|
| **CleanProof** (cleaning) | `#2563EB` | `#3B82F6` | `#1D4ED8` | `#FFFFFF` | 6.2:1 |
| **MaintainProof** (maintenance) | `#14B8A6` | `#2DD4BF` | `#0D9488` | `#000000` | 4.8:1 |
| **PropertyProof** (property) | `#D97706` | `#F59E0B` | `#B45309` | `#000000` | 5.1:1 |
| **FitOutProof** (fitout) | `#F97316` | `#FB923C` | `#EA580C` | `#000000` | 4.6:1 |

**CSS Implementation:**

```css
/* Cleaning Services (CleanProof) */
[data-product="cleaning"] {
  --accent-primary: #2563EB;
  --accent-hover: #3B82F6;
  --accent-active: #1D4ED8;
  --accent-on-primary: #FFFFFF; /* WCAG AA: 6.2:1 contrast ratio */
  --accent-bg-subtle: rgba(37, 99, 235, 0.1);
  --accent-bg-muted: rgba(37, 99, 235, 0.05);
  --accent-border: rgba(37, 99, 235, 0.2);
}

/* Maintenance Services */
[data-product="maintenance"] {
  --accent-primary: #14B8A6;
  --accent-hover: #2DD4BF;
  --accent-active: #0D9488;
  --accent-on-primary: #000000; /* WCAG AA: 4.8:1 contrast ratio */
  --accent-bg-subtle: rgba(20, 184, 166, 0.1);
  --accent-bg-muted: rgba(20, 184, 166, 0.05);
  --accent-border: rgba(20, 184, 166, 0.2);
}

/* Property Management */
[data-product="property"] {
  --accent-primary: #D97706;
  --accent-hover: #F59E0B;
  --accent-active: #B45309;
  --accent-on-primary: #000000; /* WCAG AA: 5.1:1 contrast ratio */
  --accent-bg-subtle: rgba(217, 119, 6, 0.1);
  --accent-bg-muted: rgba(217, 119, 6, 0.05);
  --accent-border: rgba(217, 119, 6, 0.2);
}

/* Fit-Out & Construction */
[data-product="fitout"] {
  --accent-primary: #F97316;
  --accent-hover: #FB923C;
  --accent-active: #EA580C;
  --accent-on-primary: #000000; /* WCAG AA: 4.6:1 contrast ratio */
  --accent-bg-subtle: rgba(249, 115, 22, 0.1);
  --accent-bg-muted: rgba(249, 115, 22, 0.05);
  --accent-border: rgba(249, 115, 22, 0.2);
}
```

### Accent-on-Primary Token

The `--accent-on-primary` token ensures text on accent backgrounds meets WCAG AA contrast standards (4.5:1 minimum).

**Usage:**

```css
.button-primary {
  background: var(--accent-primary);
  color: var(--accent-on-primary); /* Not hardcoded white/black */
}
```

**Contrast Requirements:**

All `--accent-on-primary` values must meet WCAG AA standards:
- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text (18px+ or 14px+ bold)
- Use white (#FFFFFF) for dark accents
- Use black (#000000) for light accents
- Validate using contrast checker before adding new product contexts

---

## Dark-First Color Mode Rules

### Core Principle

Proof Platform is **dark-first** but not dark-only:

- Default background: dark (`--color-bg-primary`)
- All components designed with dark as primary state
- Light sections allowed in controlled rhythm
- Light mode never becomes the dominant visual language

### When Light Sections Are Allowed

**Permitted uses:**
- Alternate rhythm in long landing pages (every 3-5 sections)
- Emphasis sections (pricing, comparison tables, forms)
- Content-heavy sections where readability benefits from light
- Client/partner logo grids (better logo visibility)

**Forbidden uses:**
- Primary hero sections (must be dark)
- Navigation header (must be dark)
- Footer (must be dark)
- Dashboard application UI (must be dark)
- Entire landing page in light mode

### Light Section Implementation

```html
<!-- Correct: Light section in alternating rhythm -->
<section class="section section-primary">
  <!-- Dark section -->
</section>

<section class="section section-light">
  <!-- Light section with proper token overrides -->
</section>

<section class="section section-primary">
  <!-- Back to dark -->
</section>
```

```css
/* Light section token overrides */
.section-light {
  background: var(--color-bg-light-primary);
  color: var(--color-text-light-primary);
}

.section-light .button-primary {
  background: var(--accent-primary);
  color: var(--accent-on-primary);
}

.section-light .button-secondary {
  background: transparent;
  border: var(--border-width-default) solid var(--color-border-light-default);
  color: var(--color-text-light-primary);
}
```

### Rhythm Rules

**Landing pages:**
- Start dark (hero)
- Maximum 1 light section per 3 dark sections
- Never 2 consecutive light sections
- End dark (CTA + footer)

**Application UI:**
- Always dark
- No light mode override for app dashboards
- Light sections forbidden in logged-in interfaces

---

## Accent Containment Rules

### Accent Usage Boundaries

Product accent colors provide brand differentiation but must not replace functional status colors.

**Accent Allowed:**

| Element | Usage | Example |
|---------|-------|---------|
| Primary CTA buttons | Background and interactive states | "Get Started" button |
| Active navigation states | Product context only | Active menu item in product landing |
| Interactive focus/hover | Highlight on interaction | Button hover, input focus border |
| Product tags (informational) | Non-status tags only | "CleanProof" badge, product label |
| Progress indicators (non-status) | Visual loading, completion % | Upload progress bar (not workflow status) |

**Accent Forbidden:**

| Element | Reason | Use Instead |
|---------|--------|-------------|
| Status badges | Must use semantic colors | `--color-status-*` tokens |
| Workflow states | Universal meaning required | `--color-status-completed`, `--color-status-failed`, etc. |
| Success/error/warning indicators | Safety and clarity | `--color-success`, `--color-error`, `--color-warning` |
| System notifications | Must be universally understood | `--color-info`, `--color-error`, etc. |
| Data validation states | Semantic meaning required | `--color-success` (valid), `--color-error` (invalid) |

**Rule:**
- Accent colors = Brand identity and interaction design
- Functional colors = Universal operational meaning
- Never mix the two categories

### Status Badge Color Enforcement

All status badges must use semantic status colors, never product accent:

```css
/* CORRECT: Status badges use semantic colors */
.status-badge-completed {
  background: var(--color-status-completed-bg);
  color: var(--color-status-completed);
}

.status-badge-failed {
  background: var(--color-status-failed-bg);
  color: var(--color-status-failed);
}

/* WRONG: Status badge using accent */
.status-badge-completed {
  background: var(--accent-bg-subtle); /* FORBIDDEN */
  color: var(--accent-primary); /* FORBIDDEN */
}
```

---

## Platform Header Neutrality

Platform navigation headers must remain **accent-free** and **product-neutral**:

- Background always `--color-bg-primary` (neutral dark)
- Text always `--color-text-primary` (white)
- No product accent colors anywhere in platform header
- Active states use underline or neutral highlight only

### Platform Header Element Rules

| Element | Color | Active State | Forbidden |
|---------|-------|--------------|-----------|
| Background | `--color-bg-primary` | N/A | Any accent color |
| Logo text | `--color-text-primary` | N/A | Any accent color |
| Nav link (default) | `--color-text-secondary` | N/A | Any accent color |
| Nav link (hover) | `--color-text-primary` | N/A | Any accent color |
| Nav link (active) | `--color-text-primary` | 2px underline | Accent color, accent background |
| Button (ghost) | `--color-text-secondary` | `--color-bg-tertiary` | Accent color, accent background |
| Button (primary) | `--color-text-primary` | Neutral hover | Accent background |

### Active State Implementation

**Platform navigation active state:**
```css
.nav-header[data-context="platform"] .nav-link.active {
  color: var(--color-text-primary);
  position: relative;
}

.nav-header[data-context="platform"] .nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-text-primary);
}
```

**Product navigation active state:**
```css
.nav-header[data-context="product"] .nav-link.active {
  color: var(--accent-primary);
}
```

---

## Visual Authority Principles

### Core Principle

Proof Platform maintains **operational authority** in visual language:

- Enterprise operational context
- Middle East professional standards
- Functional over decorative
- Trust over trendiness

### Forbidden Visual Treatments

**Gradients:**
- No playful multi-color gradients
- No sunset/aurora effects
- No gradient overlays on photos
- Exception: Subtle single-color fade for content truncation only

**Glassmorphism:**
- No frosted glass effects in app UI
- No soft blur overlays
- No translucent panels with backdrop blur
- Exception: Navigation backdrop blur only (already defined)

**Startup Pastels:**
- No pastel color palettes
- No soft purple/pink/mint accent schemes
- No low-saturation decorative colors
- Stick to defined accent system only

**Decorative Illustrations:**
- No abstract shapes in dashboards
- No decorative blob backgrounds
- No pattern overlays
- No illustrated mascots or characters
- Exception: Functional diagrams, architectural schematics only

### Permitted Visual Elements

**Photography:**
- Real operational photography only
- Workers, equipment, facilities
- High contrast, professional lighting
- No stock photography of smiling office workers

**Icons:**
- Functional system icons only
- Line-based, consistent weight
- No illustrative icon sets
- No emoji-style icons

**Data Visualization:**
- Charts and graphs for operational data
- Functional color coding (status-based)
- No decorative chart styling
- No 3D chart effects

### Regional Considerations

**Middle East Enterprise Standards:**
- Conservative professional aesthetic
- High-contrast legibility priority
- Avoid Western startup visual trends
- Respect cultural formality in design tone

---

## Color Validation

### Before Deploying New Product Context

1. **Semantic Color Collision Check**
   - Verify accent-primary != `#10B981` (success)
   - Verify accent-primary != `#EF4444` (error)
   - Verify accent-primary != `#F59E0B` (warning)
   - Verify accent-primary != `#3B82F6` (info)

2. **Hue Separation Check**
   - Maintain minimum 30° hue separation from reserved colors
   - Maintain minimum 15° hue separation from other product accents

3. **Contrast Validation**
   - Test accent-primary with accent-on-primary
   - Verify 4.5:1 minimum contrast ratio
   - Document contrast ratio in product context definition

4. **Visual Distinction Test**
   - Test side-by-side with all other product accents
   - Verify distinguishability in color blindness simulations
   - Test on dark and light backgrounds

See [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) for automated validation rules.
