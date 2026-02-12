# Platform Shell Layout

**Version:** 1.3.1
**Last Updated:** 2026-02-12

---

## Overview

The Platform Shell is the **persistent outer frame** for all Proof Platform products (CleanProof, MaintainProof, PropertyProof, FitOutProof). It provides:

- Fixed header with product switcher and account controls
- Sidebar navigation (product-specific)
- Neutral styling (no product accent in shell)
- Consistent layout across all products

---

## Shell Architecture

### Structure

```
┌─────────────────────────────────────────────────────┐
│ Fixed Header (64px)                                 │
│ [ProductSwitcher]              [AccountDropdown]    │
└─────────────────────────────────────────────────────┘
┌──────────┬──────────────────────────────────────────┐
│          │                                          │
│ Sidebar  │  Main Content Area                       │
│ (fixed)  │  (product-specific pages)                │
│          │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Key Characteristics:**
- Header and sidebar are part of **shell** (neutral)
- Main content area contains **product pages** (accent allowed)
- Shell remains stable during navigation

---

## Header Specification

### Fixed Header

```css
.app-header {
  position: fixed;
  top: 0;
  right: 0;
  left: var(--sidebar-width); /* Adjusts based on sidebar state */
  height: 64px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--color-bg-card); /* Neutral */
  border-bottom: 1px solid var(--color-border-default);
  transition: left 200ms ease-out;
}
```

**Rules:**
- Height: Fixed 64px
- Z-index: 30 (above content, below modals)
- Background: Neutral card background (no accent)
- Border: Default border color
- Transitions: Smooth adjustment when sidebar collapses/expands

### Header Controls

**Left Side: Product Switcher**
- Shows current product name
- Dropdown for switching between products
- Neutral styling (no product accent)
- Position: Left-aligned in header

**Right Side: Account Dropdown**
- User initials/avatar
- Account management menu
- Neutral styling (no product accent)
- Position: Right-aligned in header

**Spacing:**
```css
.app-header {
  justify-content: space-between; /* Spreads left and right controls */
}
```

---

## Sidebar Integration

### Sidebar Width States

**Expanded:**
- Width: 256px (16rem)
- Header left offset: 256px
- Logo and labels visible

**Collapsed:**
- Width: 64px (4rem)
- Header left offset: 64px
- Icons only, labels hidden

### Transition Behavior

```css
.app-header {
  transition: left 200ms ease-out;
}

.app-main {
  transition: padding-left 200ms ease-out;
  padding-top: 64px; /* Account for fixed header */
}
```

**Synchronization:**
- Header and main content adjust together
- Sidebar collapse state saved to localStorage
- No layout shift during transitions

---

## Product Switcher

### Component Structure

```html
<div class="product-switcher">
  <button class="product-switcher-trigger">
    <span>{{CurrentProductName}}</span>
    <ChevronDown />
  </button>

  <div class="product-switcher-dropdown">
    <button class="product-option active">
      <Check />
      <span>CleanProof</span>
    </button>
    <button class="product-option" disabled>
      <span>MaintainProof</span>
      <span class="badge">Coming soon</span>
    </button>
    <button class="product-option" disabled>
      <span>PropertyProof</span>
      <span class="badge">Coming soon</span>
    </button>
    <button class="product-option" disabled>
      <span>FitOutProof</span>
      <span class="badge">Coming soon</span>
    </button>
  </div>
</div>
```

### Styling Rules

**Trigger:**
```css
.product-switcher-trigger {
  background: transparent; /* Neutral, not accent */
  color: var(--color-text-primary); /* Neutral */
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-default);
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  transition: background 150ms ease;
}

.product-switcher-trigger:hover {
  background: var(--color-bg-muted); /* Neutral hover */
}
```

**Dropdown:**
```css
.product-switcher-dropdown {
  position: absolute;
  left: 0;
  top: calc(100% + 8px);
  min-width: 200px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-default);
  box-shadow: var(--shadow-elevated);
  z-index: 50;
}
```

**Active Product:**
```css
.product-option.active {
  background: var(--color-bg-muted);
  font-weight: 600;
}
```

**Critical Rule:**
- Product switcher MUST NOT use product accent
- Always uses neutral colors (border, card, text)
- Switching products updates `data-product` attribute on body
- Shell styling remains unchanged during product switch

---

## Account Dropdown

See [09_APP_MARKETING_NAVIGATION.md](./09_PLATFORM_SHELL_LAYOUT.md) for complete specification.

**Summary:**
- Position: Right side of header
- Structure: Account / Support / Sign out sections
- External links open in new tab
- Neutral styling (no accent)

---

## Accent Containment Rules

### Where Accent is FORBIDDEN

**✅ Shell Components (Always Neutral):**
- Header background
- Product switcher trigger
- Product switcher dropdown
- Account dropdown trigger
- Account dropdown menu
- Sidebar background
- Sidebar border

**Example (WRONG):**
```css
/* FORBIDDEN: Using accent in shell */
.app-header {
  background: var(--accent-primary); /* NO */
}

.product-switcher-trigger {
  color: var(--accent-primary); /* NO */
  border-color: var(--accent-primary); /* NO */
}
```

**Example (CORRECT):**
```css
/* CORRECT: Neutral shell */
.app-header {
  background: var(--color-bg-card); /* YES */
}

.product-switcher-trigger {
  color: var(--color-text-primary); /* YES */
  border-color: var(--color-border-default); /* YES */
}
```

### Where Accent is ALLOWED

**✅ Product Pages (Inside Main Content):**
- Primary CTA buttons
- Active navigation states (in sidebar)
- Interactive highlights
- Focus states on inputs
- Progress indicators

**Example:**
```css
/* Accent allowed in product pages */
.button-primary {
  background: var(--accent-primary); /* YES - inside product page */
}

.sidebar .nav-link.active {
  background: var(--accent-primary); /* YES - product context */
}
```

---

## App ↔ Marketing Navigation

### External Link Rules

**Marketing Pages:**
- Product landing pages (/cleanproof, /maintainproof, etc.)
- Pricing pages
- Updates/blog pages
- Contact pages
- Company website

**Behavior:**
- All marketing links open in new tab
- Use `target="_blank"` and `rel="noopener noreferrer"`
- Include external link icon indicator
- Must not break active app session

**Example:**
```html
<a
  href="/cleanproof/updates"
  target="_blank"
  rel="noopener noreferrer"
  class="dropdown-item"
>
  Product updates
  <ExternalLinkIcon />
</a>
```

### Internal Link Rules

**App Pages:**
- Dashboard
- Settings
- Billing
- Job management
- Reports

**Behavior:**
- Use React Router `Link` component
- No `target="_blank"` (stays in app)
- No external link icon
- Standard navigation

---

## RTL Support

### Header Alignment

**LTR:**
```
[ProductSwitcher]                    [AccountDropdown]
```

**RTL:**
```
[AccountDropdown]                    [ProductSwitcher]
```

**CSS:**
```css
.app-header {
  justify-content: space-between; /* Automatically flips in RTL */
}

[dir="rtl"] .product-switcher-dropdown {
  left: auto;
  right: 0;
}

[dir="rtl"] .account-dropdown-menu {
  right: auto;
  left: 0;
}
```

### Icon Behavior

**Chevron Icons (Flip):**
```css
[dir="rtl"] .chevron-icon {
  transform: scaleX(-1);
}
```

**Check Icons (No Flip):**
- Check marks do not flip
- External link icons do not flip
- Settings icons do not flip

---

## Z-Index Hierarchy

```css
:root {
  --z-sidebar: 40;
  --z-header: 30;
  --z-dropdown: 50;
  --z-modal: 100;
  --z-toast: 200;
}
```

**Stacking Order:**
1. Base content: z-index: 0
2. Fixed header: z-index: 30
3. Fixed sidebar: z-index: 40
4. Dropdowns (account, product): z-index: 50
5. Modals: z-index: 100
6. Toasts: z-index: 200

---

## Responsive Behavior

### Desktop (≥1024px)

**Header:**
- Full width minus sidebar
- Both controls visible
- Normal spacing

**Sidebar:**
- Visible, collapsible
- Hover to expand (if collapsed)

### Tablet (640px - 1023px)

**Header:**
- Full width (sidebar collapses to hamburger)
- Both controls visible
- Reduced padding

**Sidebar:**
- Overlay mode (not persistent)
- Toggle button in header

### Mobile (<640px)

**Header:**
- Full width
- Product switcher: Full product name
- Account dropdown: Initials only (name hidden)

**Dropdowns:**
- Account dropdown becomes bottom sheet
- Product switcher becomes bottom sheet
- Full-width options
- Backdrop overlay

---

## Accessibility

### Keyboard Navigation

**Header Controls:**
- Tab: Navigate between product switcher and account dropdown
- Enter/Space: Open dropdown
- Escape: Close dropdown
- Arrow keys: Navigate dropdown options

**ARIA Attributes:**
```html
<button
  aria-expanded="false"
  aria-haspopup="true"
  aria-label="Switch product"
>
  CleanProof
</button>

<div role="menu" aria-label="Product switcher">
  <button role="menuitem">CleanProof</button>
  <button role="menuitem" aria-disabled="true">MaintainProof</button>
</div>
```

### Focus Management

```css
.product-switcher-trigger:focus,
.account-dropdown-trigger:focus {
  outline: none;
  ring: 2px solid var(--color-ring);
  ring-offset: 2px;
}
```

---

## Implementation Checklist

### Header

- [ ] Fixed position with correct z-index
- [ ] Height 64px
- [ ] Neutral background (no accent)
- [ ] Border bottom
- [ ] Adjusts left offset based on sidebar state
- [ ] Smooth transitions

### Product Switcher

- [ ] Neutral styling (no accent)
- [ ] Shows current product name
- [ ] Dropdown with 4 products
- [ ] Disabled products show "Coming soon"
- [ ] Check icon for active product
- [ ] Keyboard accessible
- [ ] Click outside closes
- [ ] Escape key closes

### Account Dropdown

- [ ] Neutral styling (no accent)
- [ ] Account / Support / Sign out sections
- [ ] External links open new tab
- [ ] External link icons present
- [ ] All links navigate to working pages (no 404)
- [ ] Keyboard accessible
- [ ] Mobile: bottom sheet
- [ ] RTL supported

### Integration

- [ ] Main content has top padding (64px)
- [ ] Sidebar and header transition together
- [ ] No layout shift during sidebar collapse/expand
- [ ] Product switching updates data-product attribute
- [ ] Shell remains neutral during product switch

---

## Validation Rules

### Token Usage

**FORBIDDEN:**
```css
/* NO landing tokens in shell */
.app-header {
  padding: var(--landing-section-padding-y); /* WRONG */
}
```

**CORRECT:**
```css
/* Use app or core tokens */
.app-header {
  padding: 0 var(--spacing-6); /* CORRECT */
}
```

### Color Usage

**FORBIDDEN:**
```css
/* NO accent in shell */
.product-switcher-trigger {
  background: var(--accent-primary); /* WRONG */
}
```

**CORRECT:**
```css
/* Neutral colors only */
.product-switcher-trigger {
  background: transparent; /* CORRECT */
  border: 1px solid var(--color-border-default); /* CORRECT */
}
```

---

## References

- [02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md) - Accent containment rules
- [03_LAYOUT_AND_DENSITY.md](./03_LAYOUT_AND_DENSITY.md) - App layout structure
- [06_BRAND_HIERARCHY_AND_PRODUCTS.md](./06_BRAND_HIERARCHY_AND_PRODUCTS.md) - Product switching
- [09_APP_MARKETING_NAVIGATION.md](./09_APP_MARKETING_NAVIGATION.md) - Account dropdown specification
- [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) - Validation requirements
