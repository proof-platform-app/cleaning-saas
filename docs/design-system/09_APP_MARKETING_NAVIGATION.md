# App-to-Marketing Navigation Pattern

**Version:** 1.3.1
**Last Updated:** 2026-02-12

---

## Architectural Principle

### Layer Separation

Application UI and Marketing Website are **separate layers** with distinct purposes:

**Application UI:**
- Operational environment
- Data management and workflow execution
- Product-specific context (`data-product`)
- User is authenticated

**Marketing Website:**
- Acquisition and information
- Public-facing content
- Platform-level messaging
- User is anonymous or evaluating

### Critical Rules

1. **Marketing must never visually dominate app environment**
   - App context remains primary at all times
   - Marketing navigation uses neutral styling
   - No marketing hero elements inside dashboards

2. **App context must always remain primary**
   - Product accent determines active context
   - Marketing links do not override app branding
   - User's current product context persists

3. **Transitions to marketing must not break workflow**
   - Marketing links open in new tab (never replace app)
   - No interruption of in-progress operations
   - User can return to exact app state

4. **Visual hierarchy preserved**
   - App header remains stable
   - Marketing links appear in subordinate UI (dropdowns, settings)
   - No accent-colored marketing CTAs in app header

---

## Navigation Entry Points

### Allowed Locations

Marketing links are **permitted** in these app UI locations:

**✅ Account Dropdown (top-right)**
- User profile menu
- Subordinate to app header
- Opens in new tab
- Neutral styling

**✅ Trial / Billing Banners**
- Contextual upgrade prompts
- Limited to billing-related flows
- Dismissible
- Uses semantic colors (not product accent)

**✅ Settings → Billing**
- Dedicated billing management section
- Opens marketing pricing page in new tab
- Clear transition signaling

**✅ Upgrade Flows**
- In-app upgrade modals
- Plan comparison views
- Payment forms (may embed or redirect)

### Forbidden Locations

Marketing links are **forbidden** in these app UI locations:

**❌ Sidebar Primary Navigation**
- Sidebar is operational navigation only
- No marketing links in main nav
- Preserves workflow focus

**❌ Accent-Colored CTA Inside App Header**
- App header must remain neutral
- Primary CTAs are app actions only
- No marketing-style hero CTAs

**❌ Hero-Style Marketing Elements Inside Dashboard**
- No landing-style hero sections in dashboards
- No large promotional banners
- No marketing copy interrupting data views

**❌ Inline Within Data Tables**
- No marketing links embedded in operational data
- No upgrade prompts within table rows

---

## Account Dropdown Specification

### Structure

```html
<div class="account-dropdown" data-context="app">
  <button class="account-dropdown-trigger">
    <img src="/avatar.jpg" alt="User" class="account-avatar" />
    <span class="account-name">{{UserName}}</span>
    <svg class="dropdown-icon"><!-- Chevron --></svg>
  </button>

  <div class="account-dropdown-menu">
    <div class="dropdown-section">
      <a href="/settings/account" class="dropdown-item">
        <svg class="dropdown-icon"><!-- Settings icon --></svg>
        <span>Account settings</span>
      </a>
      <a href="/settings/billing" class="dropdown-item">
        <svg class="dropdown-icon"><!-- Billing icon --></svg>
        <span>Billing</span>
      </a>
    </div>

    <div class="dropdown-divider"></div>

    <div class="dropdown-section">
      <a href="https://updates.proof-platform.com" target="_blank" rel="noopener" class="dropdown-item">
        <svg class="dropdown-icon"><!-- Updates icon --></svg>
        <span>Product updates</span>
        <svg class="external-icon"><!-- External link icon --></svg>
      </a>
      <a href="https://proof-platform.com/contact" target="_blank" rel="noopener" class="dropdown-item">
        <svg class="dropdown-icon"><!-- Help icon --></svg>
        <span>Help / Contact</span>
        <svg class="external-icon"><!-- External link icon --></svg>
      </a>
      <a href="https://proof-platform.com" target="_blank" rel="noopener" class="dropdown-item">
        <svg class="dropdown-icon"><!-- Globe icon --></svg>
        <span>Visit website</span>
        <svg class="external-icon"><!-- External link icon --></svg>
      </a>
    </div>

    <div class="dropdown-divider"></div>

    <div class="dropdown-section">
      <button class="dropdown-item dropdown-item-danger">
        <svg class="dropdown-icon"><!-- Sign out icon --></svg>
        <span>Sign out</span>
      </button>
    </div>
  </div>
</div>
```

### CSS Specification

```css
.account-dropdown {
  position: relative;
}

.account-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-default);
  color: var(--color-text-primary); /* Neutral, not accent */
  cursor: pointer;
  transition: background var(--duration-fast) var(--easing-default);
}

.account-dropdown-trigger:hover {
  background: var(--color-bg-tertiary);
}

.account-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: var(--border-width-default) solid var(--color-border-default);
}

.account-name {
  font-size: var(--font-size-app-body);
  font-weight: var(--font-weight-medium);
}

.account-dropdown-menu {
  position: absolute;
  top: calc(100% + var(--spacing-1));
  right: 0;
  min-width: 240px;
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-default);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: opacity var(--duration-default) var(--easing-default),
              visibility var(--duration-default) var(--easing-default),
              transform var(--duration-default) var(--easing-default);
}

.account-dropdown-menu[data-open="true"] {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-section {
  padding: var(--spacing-2);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-app-body);
  color: var(--color-text-primary); /* Neutral, not accent */
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast) var(--easing-default);
}

.dropdown-item:hover {
  background: var(--color-bg-tertiary);
}

.dropdown-item-danger {
  color: var(--color-error);
}

.dropdown-item-danger:hover {
  background: var(--color-status-failed-bg);
}

.dropdown-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-secondary);
}

.external-icon {
  width: 14px;
  height: 14px;
  margin-left: auto;
  color: var(--color-text-tertiary);
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border-subtle);
  margin: var(--spacing-1) 0;
}
```

### Rules

**Color Usage:**
- Background: `--color-bg-secondary` (neutral, never accent)
- Text: `--color-text-primary` (neutral, never accent)
- Hover: `--color-bg-tertiary` (neutral)
- Icons: `--color-text-secondary` (neutral)

**Typography:**
- Font size: `--font-size-app-body` (14px)
- Font weight: `--font-weight-medium` (500)
- Uses app typography scale (never landing scale)

**Behavior:**
- Marketing links open in new tab (`target="_blank"`)
- External link icon indicates new tab behavior
- App links remain in same context
- Sign out is visually distinct (danger color)

**Visual Hierarchy:**
- Must not visually resemble landing header
- Subordinate to app header
- Neutral styling (no product accent)
- Consistent with app UI density

---

## Multi-Product Consideration

### Product Switcher Behavior

When platform has multiple products (cleaning, maintenance, property, fitout):

**Product Switcher:**
- Uses platform-neutral colors (not product accent)
- Positioned in app header or sidebar
- Switching updates `data-product` attribute on `<body>`
- Accent tokens update automatically via CSS cascade

**Marketing Links Remain Neutral:**
- Account dropdown styling does not change with product context
- Marketing links always use neutral colors
- No product-specific branding on marketing navigation
- Platform-level marketing (not product-level)

### Implementation

```html
<!-- Product context on body -->
<body data-product="cleaning">

  <!-- Product switcher: neutral colors -->
  <div class="product-switcher" data-context="platform">
    <button class="product-switcher-trigger">
      <span class="current-product">CleanProof</span>
      <svg class="switcher-icon"><!-- Dropdown --></svg>
    </button>
    <!-- Product options... -->
  </div>

  <!-- Account dropdown: neutral colors (unaffected by product context) -->
  <div class="account-dropdown" data-context="app">
    <!-- Dropdown content... -->
  </div>

</body>
```

**CSS Enforcement:**

```css
/* Product accent applies to operational elements */
[data-product="cleaning"] .button-primary {
  background: var(--accent-primary); /* Product-specific */
}

/* Account dropdown remains neutral */
.account-dropdown-trigger {
  background: transparent;
  color: var(--color-text-primary); /* Neutral, not accent */
}

/* Marketing links remain neutral */
.dropdown-item {
  color: var(--color-text-primary); /* Neutral, not accent */
}

/* Product switcher remains neutral */
.product-switcher-trigger {
  color: var(--color-text-primary); /* Neutral, not accent */
}
```

---

## Visual Rules

### Header Background

**App Header:**
```css
.app-header {
  background: var(--color-bg-secondary); /* Neutral */
  border-bottom: var(--border-width-default) solid var(--color-border-default);
}
```

**FORBIDDEN:**
```css
/* WRONG: Using accent in app header */
.app-header {
  background: var(--accent-primary); /* FORBIDDEN */
}
```

### Marketing Link Styling

**No Accent for Marketing Links:**
```css
/* CORRECT: Neutral styling */
.dropdown-item[href*="proof-platform.com"] {
  color: var(--color-text-primary); /* Neutral */
}

/* WRONG: Using accent */
.dropdown-item[href*="proof-platform.com"] {
  color: var(--accent-primary); /* FORBIDDEN */
}
```

### Dropdown Elevation

**Elevation Hierarchy:**
```css
.account-dropdown-menu {
  box-shadow: var(--shadow-lg); /* Large shadow for top-level dropdown */
  z-index: 1000;
}

/* Nested dropdowns (if present) */
.dropdown-submenu {
  box-shadow: var(--shadow-md);
  z-index: 1001;
}
```

**Token Usage:**
- Use `--shadow-lg` for primary dropdown
- Use `--shadow-md` for nested menus
- Never use raw `box-shadow` values

### RTL Behavior

**Dropdown Alignment:**
```css
/* LTR: Right-aligned */
.account-dropdown-menu {
  right: 0;
  left: auto;
}

/* RTL: Left-aligned (visual right) */
[dir="rtl"] .account-dropdown-menu {
  left: 0;
  right: auto;
}

/* External link icon position */
.external-icon {
  margin-left: auto;
}

[dir="rtl"] .external-icon {
  margin-right: auto;
  margin-left: 0;
}
```

**Icon Flipping:**
```css
/* Chevron in dropdown trigger flips */
[dir="rtl"] .dropdown-icon {
  transform: scaleX(-1);
}

/* External link icon does NOT flip */
.external-icon {
  /* No transform */
}
```

### Mobile Behavior

**Tablet and Mobile (<1024px):**
```css
@media (max-width: 1023px) {
  .account-dropdown-menu {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    min-width: 100%;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    transform: translateY(100%);
  }

  .account-dropdown-menu[data-open="true"] {
    transform: translateY(0);
  }
}
```

**Mobile Rules:**
- Dropdown becomes bottom sheet on mobile
- Full-width for touch targets
- Slides up from bottom
- Backdrop overlay behind menu
- Large touch targets (minimum 44px)

---

## Governance Rules

### Token Enforcement

**FORBIDDEN: Landing tokens in app header**
```css
/* WRONG: Using landing tokens */
.app-header {
  padding: var(--landing-section-padding-y); /* FORBIDDEN */
}

.account-dropdown-menu {
  gap: var(--landing-section-gap); /* FORBIDDEN */
}
```

**CORRECT: App tokens only**
```css
.app-header {
  padding: 0 var(--spacing-4);
}

.account-dropdown-menu {
  padding: var(--spacing-2);
}
```

### Accent Containment

**FORBIDDEN: Product accent on marketing navigation**
```css
/* WRONG: Using accent for marketing links */
.dropdown-item[target="_blank"] {
  color: var(--accent-primary); /* FORBIDDEN */
  background: var(--accent-bg-subtle); /* FORBIDDEN */
}
```

**CORRECT: Neutral colors**
```css
.dropdown-item[target="_blank"] {
  color: var(--color-text-primary); /* Neutral */
  background: transparent;
}

.dropdown-item[target="_blank"]:hover {
  background: var(--color-bg-tertiary); /* Neutral */
}
```

### External Link Requirement

**All marketing links must open in new tab:**
```html
<!-- CORRECT -->
<a href="https://proof-platform.com" target="_blank" rel="noopener noreferrer">
  Visit website
</a>

<!-- WRONG: Opens in same tab -->
<a href="https://proof-platform.com">
  Visit website
</a>
```

**Validation:**
```javascript
// validate-marketing-links.js
const marketingLinks = document.querySelectorAll('a[href*="proof-platform.com"]');

marketingLinks.forEach(link => {
  const isInAppUI = link.closest('[data-context="app"]');

  if (isInAppUI && link.getAttribute('target') !== '_blank') {
    throw new Error(`Marketing link must open in new tab: ${link.href}`);
  }

  if (isInAppUI && !link.getAttribute('rel')?.includes('noopener')) {
    throw new Error(`Marketing link missing rel="noopener": ${link.href}`);
  }
});
```

### Visual Stability

**App header must remain visually stable during navigation:**

**Validation Rules:**
- Account dropdown trigger must not change color on product switch
- Dropdown menu background must not change on product switch
- Marketing link styling must not change on product switch
- External link icons must remain consistent

**Test:**
```javascript
// test-navigation-stability.js
describe('App-to-Marketing Navigation Stability', () => {
  test('Account dropdown remains neutral on product switch', () => {
    document.body.setAttribute('data-product', 'cleaning');
    const dropdownColor1 = getComputedStyle(accountDropdown).color;

    document.body.setAttribute('data-product', 'property');
    const dropdownColor2 = getComputedStyle(accountDropdown).color;

    expect(dropdownColor1).toBe(dropdownColor2); // Must be identical
  });

  test('Marketing links open in new tab', () => {
    const marketingLinks = document.querySelectorAll('.dropdown-item[href*="proof-platform.com"]');

    marketingLinks.forEach(link => {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });
  });
});
```

---

## Trial and Billing Banners

### Banner Specification

**Structure:**
```html
<div class="trial-banner" data-type="info">
  <div class="banner-content">
    <svg class="banner-icon"><!-- Info icon --></svg>
    <div class="banner-text">
      <strong>Trial active:</strong> 5 days remaining
    </div>
  </div>
  <div class="banner-actions">
    <a href="https://proof-platform.com/pricing" target="_blank" rel="noopener" class="button button-secondary button-small">
      View plans
    </a>
    <button class="banner-dismiss" aria-label="Dismiss">
      <svg><!-- Close icon --></svg>
    </button>
  </div>
</div>
```

**CSS:**
```css
.trial-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-default);
  margin-bottom: var(--spacing-4);
}

.trial-banner[data-type="info"] {
  border-color: var(--color-info);
  background: rgba(59, 130, 246, 0.1); /* Info tint */
}

.trial-banner[data-type="warning"] {
  border-color: var(--color-warning);
  background: rgba(245, 158, 11, 0.1); /* Warning tint */
}

.banner-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.banner-icon {
  width: 20px;
  height: 20px;
  color: var(--color-info);
}

.trial-banner[data-type="warning"] .banner-icon {
  color: var(--color-warning);
}

.banner-text {
  font-size: var(--font-size-app-body);
  color: var(--color-text-primary);
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.banner-dismiss {
  padding: var(--spacing-1);
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--duration-fast) var(--easing-default);
}

.banner-dismiss:hover {
  background: var(--color-bg-tertiary);
}
```

**Rules:**
- Uses semantic colors (info, warning) not product accent
- CTA button uses secondary variant (outlined), not primary
- Dismissible (user can close)
- Limited to top of dashboard or billing section
- Never interrupts data views

---

## Settings → Billing Page

### Page Structure

**Navigation:**
```
App Sidebar → Settings → Billing
```

**Content:**
```html
<div class="settings-page">
  <div class="settings-header">
    <h1 class="settings-title">Billing</h1>
  </div>

  <div class="settings-content">
    <div class="billing-card">
      <h2 class="card-title">Current plan</h2>
      <div class="plan-details">
        <div class="plan-name">Trial</div>
        <div class="plan-status">5 days remaining</div>
      </div>
      <a href="https://proof-platform.com/pricing" target="_blank" rel="noopener" class="button button-primary">
        View pricing
      </a>
    </div>

    <div class="billing-card">
      <h2 class="card-title">Billing information</h2>
      <!-- Billing details... -->
    </div>
  </div>
</div>
```

**Rules:**
- Marketing link ("View pricing") allowed in this context
- Opens in new tab
- Primary button allowed here (billing is conversion context)
- Uses app card styling (not landing card styling)

---

## Validation Checklist

Before deploying app-to-marketing navigation:

### Token Usage
- [ ] No `--landing-*` tokens in app header
- [ ] No `--landing-*` tokens in account dropdown
- [ ] Dropdown uses `--app-*` or core tokens only
- [ ] Banner uses semantic colors (not accent)

### Color Usage
- [ ] Account dropdown trigger uses neutral colors
- [ ] Marketing links use neutral colors (not accent)
- [ ] Product switcher uses neutral colors
- [ ] Banner uses semantic colors (info, warning)

### Link Behavior
- [ ] All marketing links open in new tab
- [ ] All marketing links have `rel="noopener noreferrer"`
- [ ] External link icons present where appropriate
- [ ] App links remain in same context

### Visual Stability
- [ ] Account dropdown styling unchanged on product switch
- [ ] Marketing link styling unchanged on product switch
- [ ] App header remains visually stable
- [ ] No accent-colored marketing CTAs in header

### Accessibility
- [ ] Dropdown keyboard navigable
- [ ] External links announced by screen readers
- [ ] Dismiss buttons have aria-labels
- [ ] Focus states visible on all links

### Mobile
- [ ] Dropdown becomes bottom sheet on mobile
- [ ] Touch targets minimum 44px
- [ ] Full-width on small screens
- [ ] Backdrop overlay behind menu

---

## References

- [06_BRAND_HIERARCHY_AND_PRODUCTS.md](./06_BRAND_HIERARCHY_AND_PRODUCTS.md) - Platform vs product separation
- [02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md) - Accent containment rules
- [03_LAYOUT_AND_DENSITY.md](./03_LAYOUT_AND_DENSITY.md) - App vs landing token separation
- [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) - Validation requirements
