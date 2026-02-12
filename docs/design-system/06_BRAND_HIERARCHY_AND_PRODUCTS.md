# Brand Hierarchy and Products

**Version:** 1.3
**Last Updated:** 2026-02-12

---

## Platform vs Product Naming

### Platform Level

**Primary name:** "Proof Platform"

**Usage:**
- Corporate site (proof-platform.com)
- API documentation
- Investor materials
- Press releases

**Audience:** Enterprise buyers, partners, press

### Product Level

**Product names:**
- **CleanProof** (cleaning services)
- **MaintainProof** (maintenance services)
- **PropertyProof** (property management)
- **FitOutProof** (fit-out & construction)

**Usage:**
- Product landing pages
- App UI
- Sales materials

**Audience:** Operators, managers, end users

### Hierarchy

- Platform brand is parent
- Product brands are children
- Products never referenced without context of platform (except in app UI)
- Platform exists independently of products

---

## Product Suite

Proof Platform supports **exactly 4 products**:

| Product | Key | Domain | Accent Color |
|---------|-----|--------|--------------|
| CleanProof | `cleaning` | Cleaning services | #2563EB (blue) |
| MaintainProof | `maintenance` | Maintenance services | #14B8A6 (teal) |
| PropertyProof | `property` | Property management | #D97706 (amber) |
| FitOutProof | `fitout` | Fit-out & construction | #F97316 (orange) |

---

## Header Modes

Proof Platform supports two distinct header modes based on context:

- **Platform Mode**: Used on proof-platform.com (corporate site, API docs)
- **Product Mode**: Used on product landing pages (cleanproof.com, etc.)

Application UI headers always use **Product Mode** without subordination.

### Platform Mode Header

**Usage:**
- Corporate website (proof-platform.com)
- API documentation
- Investor/partner materials
- Press releases

**Structure:**
```html
<nav class="nav-header" data-context="platform">
  <div class="nav-container">
    <a href="/" class="nav-logo">
      <span class="platform-name">Proof Platform</span>
    </a>
    <div class="nav-links">
      <a href="/platform" class="nav-link">Platform</a>
      <a href="/products" class="nav-link">Products</a>
      <a href="/pricing" class="nav-link">Pricing</a>
      <a href="/docs" class="nav-link">Documentation</a>
    </div>
    <div class="nav-actions">
      <a href="/contact" class="button button-ghost">Contact</a>
    </div>
  </div>
</nav>
```

**Visual Rules:**
- Background: `--color-bg-primary` (neutral dark)
- Logo/name: White, no accent color
- Active nav state: Underline only, no accent color
- No product branding
- No "by Proof Platform" attribution (redundant)

### Product Mode Header (Landing Pages)

**Usage:**
- Product landing pages (cleanproof.com, maintainproof.com)
- Product marketing materials
- Product-specific documentation

**Structure:**
```html
<nav class="nav-header" data-context="product" data-product="cleaning">
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
      <a href="/start" class="button button-primary">Get Started</a>
    </div>
  </div>
</nav>
```

**Visual Rules:**
- Background: `--color-bg-primary` (neutral dark)
- Logo/name: Uses product accent color
- Active nav state: Uses accent color
- Primary CTA button: Uses accent color
- No "by Proof Platform" in header (prevents subordination)

### Product Mode Header (Application UI)

**Usage:**
- Logged-in application interface
- Dashboard views
- Data management screens

**Structure:**
```html
<header class="app-header" data-product="cleaning">
  <div class="app-header-brand">
    <span class="app-product-name">{{ProductName}}</span>
  </div>
  <div class="app-header-actions">
    <button class="button button-ghost">Notifications</button>
    <button class="button button-ghost">Settings</button>
    <button class="button button-ghost">User Menu</button>
  </div>
</header>
```

**Visual Rules:**
- Background: `--color-bg-secondary`
- Product name: Primary text color (not accent)
- No "by Proof Platform" attribution
- No platform subordination messaging
- Accent used only in interactive elements (buttons, highlights)

**Critical Rule:**
Application UI must not visually subordinate product to platform. Users operate within the product context, not the platform context.

---

## Lockup Rules

### Platform Lockup

```
[Logo] Proof Platform
```

- Used in: Main site header, footer, legal documents
- Accent color: White (neutral)
- Tagline: Optional

### Product Lockup (Landing/Footer Only)

```
[Logo] {{ProductName}}
         by Proof Platform
```

- Used in: Product landing footer, reports, legal
- Accent color: Product-specific
- Parent attribution required in footer/legal

### Application UI Lockup (No Attribution)

```
[Logo] {{ProductName}}
```

- Used in: App header, dashboard, logged-in interface
- Accent color: Neutral (not accent in header)
- No parent attribution (prevents subordination)

**Forbidden:**
- Product name without platform attribution in public materials
- Platform name with product accent color
- Product logo in platform header
- Platform tagline in product context
- "by Proof Platform" in application UI header

---

## Where Platform Attribution Appears

### Footer (Required)

```html
<footer class="footer">
  <div class="footer-brand">
    <span class="product-name">{{ProductName}}</span>
    <span class="platform-attribution">by Proof Platform</span>
  </div>
  <div class="footer-links">
    <!-- Footer navigation -->
  </div>
</footer>
```

```css
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
```

### About/Legal Pages (Required)

- About page content
- Terms of service footer
- Privacy policy footer
- Legal entity references

### Generated Reports (Required)

- PDF report footer
- Email report signatures
- Audit trail documents

### Marketing Materials (Optional)

- Product brochures
- Sales decks
- Case studies

### Forbidden

- Application dashboard headers
- Within-app navigation
- Data table headers
- Form titles
- Modal dialogs
- Toast notifications

---

## Multi-Product Context Management

### Product Context Switching

When users have access to multiple products within the platform, product context is managed through the `data-product` attribute.

**Active Product Context:**
- Set via `data-product` attribute on `<body>` or root element
- Determines which accent tokens are active
- Controls product-specific branding elements

**Example:**
```html
<!-- User currently in CleanProof -->
<body data-product="cleaning">
  <!-- All components inherit cleaning accent tokens -->
</body>

<!-- User switches to PropertyProof -->
<body data-product="property">
  <!-- All components inherit property accent tokens -->
</body>
```

### Product Switcher Component

For users with multi-product access, a product switcher must use platform-neutral styling.

**Product Switcher Structure:**
```html
<div class="product-switcher" data-context="platform">
  <button class="product-switcher-trigger">
    <span class="current-product-name">{{CurrentProduct}}</span>
    <svg class="switcher-icon"><!-- Dropdown icon --></svg>
  </button>
  <div class="product-switcher-dropdown">
    <a href="?product=cleaning" class="product-option" data-product="cleaning">
      <span class="option-name">CleanProof</span>
    </a>
    <a href="?product=maintenance" class="product-option" data-product="maintenance">
      <span class="option-name">MaintainProof</span>
    </a>
    <a href="?product=property" class="product-option" data-product="property">
      <span class="option-name">PropertyProof</span>
    </a>
    <a href="?product=fitout" class="product-option" data-product="fitout">
      <span class="option-name">FitOutProof</span>
    </a>
  </div>
</div>
```

**Product Switcher CSS:**
```css
.product-switcher {
  position: relative;
}

.product-switcher-trigger {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-default);
  color: var(--color-text-primary); /* Neutral, not accent */
  cursor: pointer;
}

.product-switcher-trigger:hover {
  background: var(--color-bg-tertiary);
}

.product-switcher-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: var(--spacing-1);
  min-width: 200px;
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-default);
  box-shadow: var(--shadow-lg);
  z-index: 100;
}

.product-option {
  display: flex;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  color: var(--color-text-primary); /* Neutral */
  text-decoration: none;
  transition: background var(--duration-fast) var(--easing-default);
}

.product-option:hover {
  background: var(--color-bg-tertiary);
}

.product-option.active {
  background: var(--color-bg-tertiary);
  font-weight: var(--font-weight-semibold);
}
```

**Critical Rules:**
- Product switcher uses platform-neutral colors (no accent)
- Switching product updates `data-product` on body
- Accent tokens update automatically via CSS cascade
- Platform shell (header, global nav) remains neutral

### What Changes on Product Switch

**Automatic Changes:**
- `--accent-primary` value
- `--accent-hover` value
- `--accent-active` value
- `--accent-on-primary` value
- `--accent-bg-subtle` value
- `--accent-bg-muted` value
- `--accent-border` value

**What Stays Neutral:**
- Platform header background
- Platform navigation colors
- Global sidebar (if present)
- Footer background
- All semantic status colors
- All functional colors

### Implementation Example

**JavaScript Product Switching:**
```javascript
function switchProduct(productId) {
  // Update body data-product attribute
  document.body.setAttribute('data-product', productId);

  // Update URL (optional, for deep linking)
  const url = new URL(window.location);
  url.searchParams.set('product', productId);
  window.history.pushState({}, '', url);

  // Accent tokens automatically update via CSS cascade
  // No need to manually update styles
}

// Initialize product context on page load
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('product') || 'cleaning'; // Default
  switchProduct(productId);
});
```

---

## Accent Color Boundaries

### Where Product Accent Appears

- Primary CTA buttons
- Active navigation states (product context only)
- Interactive highlights (hover, focus)
- Informational product tags (non-status)
- Progress indicators (non-status based)

### Where Product Accent is Forbidden

- Platform navigation header background
- Platform navigation links
- Platform active states
- Semantic statuses (error, success, warning)
- Functional system colors
- Border defaults
- Background hierarchies
- Status badges (workflow states)

**Rule:**
- Accent colors provide brand differentiation
- Accent colors do not replace functional colors
- Accent colors never override safety/status indicators

---

## Typography Hierarchy

### Platform Level

- Headlines: Neutral white or dark
- Body: Secondary text color
- Accent: Minimal, used sparingly

### Product Level

- Headlines: Neutral white or dark
- Body: Secondary text color
- Accent: Product accent used for emphasis (CTAs, highlights)

**Forbidden:**
- Colored headlines (except accent on CTAs)
- Full paragraphs in accent color
- Accent color on warning/error text

---

## Product Injection Rules

### Adding New Products

When adding a new product to the suite:

1. **Define Product Context**
   - Choose accent color (avoid reserved semantic colors)
   - Define all accent tokens (primary, hover, active, on-primary, bg-subtle, bg-muted, border)
   - Validate contrast ratios (4.5:1 minimum)

2. **Create Product Entry**
   ```css
   [data-product="new-product"] {
     --accent-primary: #HEX;
     --accent-hover: #HEX;
     --accent-active: #HEX;
     --accent-on-primary: #HEX;
     --accent-bg-subtle: rgba(R, G, B, 0.1);
     --accent-bg-muted: rgba(R, G, B, 0.05);
     --accent-border: rgba(R, G, B, 0.2);
   }
   ```

3. **Validate Separation**
   - Verify accent does NOT match reserved semantic colors
   - Verify minimum hue separation from other product accents
   - Test visual distinction in all contexts

4. **Update Documentation**
   - Add to product suite table
   - Document accent color values
   - Update product switcher component

See [02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md) for reserved semantic colors and [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) for validation rules.
