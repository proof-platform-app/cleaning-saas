# Landing Page Components

**Version:** 1.3
**Last Updated:** 2026-02-12

---

## Component Philosophy

Landing page components are designed for **marketing and conversion**:

- Generous whitespace (uses `--landing-*` tokens)
- Visual storytelling rhythm
- Brand-forward design with product accents
- Dark-first with controlled light sections

**All landing components:**
- Use `--landing-*` spacing tokens (never `--app-*`)
- Support product accent injection via `data-product`
- Follow dark-first rhythm rules
- Optimize for conversion and engagement

---

## 1. Hero Sections

### Flexible Height Principle

**v1.3 rule (current):**
- Hero height determined by content and context
- Minimum height: 600px desktop, 500px mobile
- Maximum height: no hard limit
- Viewport-based heights allowed but not required

### Platform Hero Template (Center-Aligned)

**Usage:** proof-platform.com (corporate site)

```html
<section class="hero hero-platform">
  <div class="hero-container">
    <div class="hero-content-center">
      <span class="text-label hero-label">PROOF PLATFORM</span>
      <h1 class="hero-title">
        {{Primary Statement}}.<br />
        {{Secondary Statement}}.
      </h1>
      <p class="hero-supporting">
        {{Supporting description}}
      </p>
      <div class="hero-cta-group">
        <a href="/products" class="button button-primary button-large">
          {{Primary CTA}}
        </a>
        <a href="/contact" class="button button-secondary button-large">
          {{Secondary CTA}}
        </a>
      </div>
    </div>
  </div>
</section>
```

```css
.hero-platform {
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-primary);
  padding: var(--landing-section-padding-y) var(--landing-section-padding-x);
}

.hero-content-center {
  text-align: center;
  max-width: 800px;
}

.hero-content-center .hero-cta-group {
  justify-content: center;
}
```

### Product Hero Template (Left-Aligned)

**Usage:** cleanproof.com, maintainproof.com, etc.

```html
<section class="hero hero-product" data-product="{{product-id}}">
  <div class="hero-container">
    <div class="hero-content">
      <span class="text-label hero-label">{{PRODUCT LABEL}}</span>
      <h1 class="hero-primary">{{Primary statement}}</h1>
      <h2 class="hero-secondary">{{secondary statement}}.</h2>
      <p class="hero-supporting">
        {{Supporting description}}.
      </p>
      <div class="hero-cta-group">
        <a href="/demo" class="button button-primary button-large">
          {{Primary CTA}}
        </a>
        <a href="/signin" class="button button-secondary button-large">
          {{Secondary CTA}}
        </a>
      </div>
    </div>
    <div class="hero-visual">
      <img src="/images/{{product}}-hero.jpg" alt="{{Alt text}}" />
    </div>
  </div>
</section>
```

```css
.hero-product {
  min-height: 600px;
  display: flex;
  align-items: center;
  padding: var(--landing-section-padding-y) var(--landing-section-padding-x);
}

.hero-product .hero-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-10);
  align-items: center;
}

.hero-product .hero-content {
  text-align: left;
}

@media (max-width: 1023px) {
  .hero-product .hero-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-6);
  }

  .hero-product .hero-visual {
    order: -1;
  }
}
```

### Responsive Hero Behavior

**Desktop (1024px+):**
- Full grid layout preserved
- Typography at maximum scale
- Hero visual at full size

**Tablet (640px - 1023px):**
- Single column layout
- Typography scaled down (responsive tokens)
- Hero visual moves above content

**Mobile (<640px):**
- Single column, full width
- Typography minimum scale
- Padding reduced
- CTA buttons stack vertically

```css
@media (max-width: 639px) {
  .hero-cta-group {
    flex-direction: column;
    width: 100%;
  }

  .hero-cta-group .button {
    width: 100%;
  }
}
```

---

## 2. Section Rhythm Rules

### Dark/Light Alternation

**Landing pages:**
- Start dark (hero)
- Maximum 1 light section per 3 dark sections
- Never 2 consecutive light sections
- End dark (CTA + footer)

**Implementation:**

```html
<!-- Dark hero -->
<section class="section section-primary">
  <!-- Hero content -->
</section>

<!-- Dark problem statement -->
<section class="section section-primary">
  <!-- Content -->
</section>

<!-- Dark how it works -->
<section class="section section-primary">
  <!-- Content -->
</section>

<!-- Light features (allowed after 3 dark) -->
<section class="section section-light">
  <!-- Features content -->
</section>

<!-- Dark proof showcase -->
<section class="section section-primary">
  <!-- Content -->
</section>
```

### Light Section Override

```css
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

---

## 3. Navigation

### Header Navigation

```css
.nav-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--color-bg-primary);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  backdrop-filter: var(--backdrop-blur-md);
}

.nav-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 4.5rem;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  text-decoration: none;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
}

.nav-link {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--duration-fast) var(--easing-default);
}

.nav-link:hover {
  color: var(--color-text-primary);
}
```

### Platform vs Product Navigation

**Platform navigation active state (no accent):**
```css
.nav-header[data-context="platform"] .nav-link.active {
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-text-primary);
  padding-bottom: 2px;
}
```

**Product navigation active state (accent allowed):**
```css
.nav-header[data-context="product"] .nav-link.active {
  color: var(--accent-primary);
}
```

### Mobile Navigation

```css
.nav-toggle {
  display: none;
}

@media (max-width: 1023px) {
  .nav-links {
    display: none;
  }

  .nav-toggle {
    display: block;
  }
}
```

---

## 4. Cards

### Basic Card

```css
.card {
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--card-padding);
  transition: all var(--duration-default) var(--easing-default);
}

.card:hover {
  border-color: var(--color-border-strong);
  transform: translateY(-2px);
}

.card-header {
  margin-bottom: var(--spacing-3);
}

.card-title {
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-h4);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.card-subtitle {
  font-size: var(--font-size-body-small);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.card-body {
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
  color: var(--color-text-secondary);
}

.card-footer {
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-3);
  border-top: var(--border-width-default) solid var(--color-border-subtle);
}
```

### Card Variants

**Feature card with icon:**
```css
.card-feature {
  text-align: center;
}

.card-feature-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--spacing-3);
  color: var(--accent-primary);
}
```

**Clickable card:**
```css
.card-clickable {
  cursor: pointer;
}

.card-clickable:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-lg);
}
```

**Elevated card:**
```css
.card-elevated {
  box-shadow: var(--shadow-lg);
  border: none;
}
```

---

## 5. Buttons (Landing Context)

See [04_COMPONENTS_APP_UI.md](./04_COMPONENTS_APP_UI.md) for base button structure.

Landing-specific usage:

```css
/* Primary CTA uses accent */
.button-primary {
  background: var(--accent-primary);
  color: var(--accent-on-primary);
}

/* Large size for hero CTAs */
.button-large {
  padding: 1rem 2.5rem;
  font-size: var(--font-size-body-large);
}
```

**CTA button groups:**
```css
.hero-cta-group {
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-6);
}
```

---

## 6. Landing Page Template

### Product Landing Structure

```html
<!DOCTYPE html>
<html lang="en" data-product="{{product-id}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ProductName}} - {{Tagline}}</title>
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/components.css">
</head>
<body>

  <!-- Navigation -->
  <nav class="nav-header" data-context="product" data-product="{{product-id}}">
    <div class="nav-container">
      <a href="/" class="nav-logo">
        <span class="product-name">{{ProductName}}</span>
      </a>
      <div class="nav-links">
        <a href="/pricing" class="nav-link">Pricing</a>
        <a href="/updates" class="nav-link">Updates</a>
        <a href="/contact" class="nav-link">Contact</a>
      </div>
      <div class="nav-actions">
        <a href="/signin" class="button button-ghost">Sign in</a>
      </div>
    </div>
  </nav>

  <!-- Hero Section (Dark) -->
  <section class="hero hero-product" data-product="{{product-id}}">
    <!-- Hero content -->
  </section>

  <!-- Section 2: Problem Statement (Dark) -->
  <section class="section section-primary">
    <!-- Content -->
  </section>

  <!-- Section 3: How It Works (Dark) -->
  <section class="section section-primary">
    <!-- Content -->
  </section>

  <!-- Section 4: Features (Light - Allowed after 3 dark) -->
  <section class="section section-light">
    <!-- Features -->
  </section>

  <!-- Section 5: Proof Showcase (Dark) -->
  <section class="section section-primary">
    <!-- Content -->
  </section>

  <!-- Section 6: Use Cases (Dark) -->
  <section class="section section-primary">
    <!-- Content -->
  </section>

  <!-- Section 7: Trust Statement (Dark) -->
  <section class="section section-primary">
    <!-- Content -->
  </section>

  <!-- Section 8: Final CTA (Dark) -->
  <section class="section section-accent">
    <!-- CTA -->
  </section>

  <!-- Footer (Dark) -->
  <footer class="section section-primary">
    <div class="footer-container">
      <div class="footer-brand">
        <span class="product-name">{{ProductName}}</span>
        <span class="platform-attribution">by Proof Platform</span>
      </div>
      <div class="footer-links">
        <!-- Footer navigation -->
      </div>
    </div>
  </footer>

</body>
</html>
```

### Template Flexibility Rules

**Fixed Sections (Required):**
- Hero (must be first)
- Footer (must be last)
- CTA section (must be second-to-last)

**Flexible Sections (Recommended):**
- Problem statement
- How it works
- Features
- Proof showcase
- Use cases
- Trust statement

**Product-Specific Sections (Allowed):**
- Must follow dark/light rhythm rules
- Must use platform-level components
- Must not introduce product-specific design tokens
- Must document deviation from template in product spec

**Reordering Rules:**
- Hero and footer positions fixed
- All other sections can be reordered
- Must maintain max 1 light section per 3 dark sections
- Must document final order in product specification

---

## 7. Section Layouts

### Section Container

```css
.section {
  padding: var(--landing-section-padding-y) var(--landing-section-padding-x);
}

.section-container {
  max-width: 1440px;
  margin: 0 auto;
}

.section-narrow {
  max-width: 800px;
  margin: 0 auto;
}
```

### Section Grid Layouts

```css
.section-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-6);
}

.section-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
}

@media (max-width: 1023px) {
  .section-grid-3,
  .section-grid-4 {
    grid-template-columns: 1fr;
  }
}
```

### Section Header

```css
.section-header {
  margin-bottom: var(--spacing-8);
  text-align: center;
}

.section-label {
  display: inline-block;
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-widest);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-2);
}

.section-title {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-h2);
  color: var(--color-text-primary);
}
```

---

## 8. Footer

### Footer Structure

```html
<footer class="section section-primary">
  <div class="footer-container">
    <div class="footer-brand">
      <span class="product-name">{{ProductName}}</span>
      <span class="platform-attribution">by Proof Platform</span>
    </div>
    <div class="footer-links">
      <div class="footer-column">
        <h4 class="footer-heading">Products</h4>
        <a href="/cleaning" class="footer-link">CleanProof</a>
        <a href="/maintenance" class="footer-link">MaintainProof</a>
        <a href="/property" class="footer-link">PropertyProof</a>
        <a href="/fitout" class="footer-link">FitOutProof</a>
      </div>
      <div class="footer-column">
        <h4 class="footer-heading">Company</h4>
        <a href="/about" class="footer-link">About</a>
        <a href="/contact" class="footer-link">Contact</a>
      </div>
    </div>
  </div>
</footer>
```

### Footer Styles

```css
.footer-container {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--spacing-10);
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.product-name {
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-bold);
  color: var(--accent-primary);
}

.platform-attribution {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-6);
}

.footer-column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.footer-heading {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-1);
}

.footer-link {
  font-size: var(--font-size-body-small);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color var(--duration-fast) var(--easing-default);
}

.footer-link:hover {
  color: var(--color-text-primary);
}

@media (max-width: 1023px) {
  .footer-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-8);
  }
}
```

---

## Component Usage Rules

### DO

- Use `--landing-*` spacing tokens for all landing components
- Follow dark-first rhythm rules
- Use product accent via `data-product` attribute
- Start with dark hero, end with dark footer
- Include platform attribution in footer

### DON'T

- Use `--app-*` tokens in landing components
- Create light-dominant landing pages
- Use 2 consecutive light sections
- Put product accent in platform header
- Skip footer attribution

### Validation

Before deploying landing page:
1. Verify uses `--landing-*` tokens (not `--app-*`)
2. Verify dark/light rhythm follows rules
3. Verify product accent injection works
4. Test responsive behavior at all breakpoints
5. Verify footer includes attribution

See [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) for automated validation rules.
