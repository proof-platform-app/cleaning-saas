# Layout and Density

**Version:** 1.3
**Last Updated:** 2026-02-12

---

## App Layout Structure

### Application Grid

```css
.app-container {
  display: grid;
  grid-template-columns: var(--app-sidebar-width) 1fr;
  grid-template-rows: var(--app-header-height) 1fr;
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.app-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-4);
  background: var(--color-bg-secondary);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
}

.app-sidebar {
  grid-row: 2;
  background: var(--color-bg-secondary);
  border-right: var(--border-width-default) solid var(--color-border-default);
  padding: var(--spacing-3);
  overflow-y: auto;
}

.app-main {
  grid-column: 2;
  grid-row: 2;
  padding: var(--app-content-padding);
  overflow-y: auto;
}
```

### Responsive Collapse

```css
@media (max-width: 1023px) {
  .app-container {
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    display: none; /* Collapsed to menu */
  }
}
```

---

## Enterprise Density Principle

Proof Platform application UI uses **medium enterprise density**:

- Information-rich without feeling cramped
- Functional spacing prioritized over decorative whitespace
- Dashboard efficiency over marketing aesthetics
- Middle East enterprise expectations

---

## Density Rules

### Tables

**Cell Padding:**
- Vertical: 12px (`--app-table-cell-padding-y`)
- Horizontal: 16px (`--app-table-cell-padding-x`)
- Row height: auto based on content, minimum 44px
- No oversized padding between rows

**Pagination:**
- Maximum table rows per page: 50
- Pagination required beyond 50 rows

### KPI Cards

**Layout:**
- Maximum 3 KPI cards per row on desktop
- Minimum card width: 280px
- Card padding: 24px (`--app-card-padding`)
- No excessive internal spacing

### Empty States

**Constraints:**
- Minimum height: 400px
- Maximum vertical padding: 96px (`--spacing-12`)
- No full-viewport empty states
- Icon size maximum: 64px

### Dashboard Sections

**Spacing:**
- Section gap: 32px (`--app-section-gap`)
- Card gap within sections: 24px
- No more than 80px vertical spacing between dashboard sections

---

## Vertical Rhythm Rules

### Dashboard Page Structure

```
[Header: 64px fixed]
[Page title + actions: 80px]
[KPI row: auto, max 3 cards]
[Gap: 32px]
[Data section: auto]
[Gap: 32px]
[Chart section: auto]
[Gap: 32px]
[Table section: auto]
```

### Forbidden Patterns

**Marketing-style spacing in dashboards:**
- Landing-style 120px+ section padding in dashboards
- Full-screen empty states with 200px+ padding
- Decorative spacers larger than 32px in app UI
- Using `--landing-*` tokens in application UI

---

## Information Priority

### Primary Information

- Uses `--font-size-app-title` (24px) or `--font-size-app-heading` (18px)
- High contrast: `--color-text-primary`
- Above the fold

**Examples:**
- Page titles
- Section headings
- Key metrics
- Primary data values

### Secondary Information

- Uses `--font-size-app-body` (14px)
- Medium contrast: `--color-text-secondary`
- Supporting details, metadata

**Examples:**
- Table cell content
- Form field values
- Supporting text
- Descriptions

### Tertiary Information

- Uses `--font-size-app-caption` (12px)
- Low contrast: `--color-text-tertiary`
- Timestamps, helper text, legal

**Examples:**
- Timestamps
- Helper text
- Legal disclaimers
- Metadata

---

## Landing vs App Separation

### Critical Rule

**Landing tokens are FORBIDDEN in app UI.**

**Landing tokens (`--landing-*`):**
- `--landing-section-padding-y` (120px) - TOO LARGE for app UI
- `--landing-section-padding-x` (32px)
- `--landing-section-gap` (80px) - TOO LARGE for app UI

**App tokens (`--app-*`):**
- `--app-content-padding` (32px) - Appropriate for dashboards
- `--app-section-gap` (32px) - Appropriate for dashboards
- `--app-card-padding` (24px)

### Token Namespace Enforcement

```css
/* CORRECT: App UI uses app tokens */
.dashboard-content {
  padding: var(--app-content-padding);
  gap: var(--app-section-gap);
}

/* WRONG: App UI using landing tokens */
.dashboard-content {
  padding: var(--landing-section-padding-y); /* FORBIDDEN - 120px is too large */
  gap: var(--landing-section-gap); /* FORBIDDEN - 80px is too large */
}
```

### Why This Matters

**Landing pages:**
- Marketing-focused
- Generous whitespace (120px sections)
- Storytelling rhythm

**App UI:**
- Operations-focused
- Functional density (32px sections)
- Information efficiency

Using landing tokens in app UI results in:
- Wasted vertical space
- Fewer items above the fold
- Reduced operational efficiency
- Poor user experience for daily tasks

---

## Responsive Layout

### Breakpoints

Proof Platform uses **two breakpoints**:

```css
/* Tablet */
@media (max-width: 1023px) {
  /* Single column layout */
  /* Reduced spacing */
  /* Sidebar collapse */
}

/* Mobile */
@media (max-width: 639px) {
  /* Minimum spacing */
  /* Stacked components */
  /* Full-width cards */
}
```

### App Layout Responsive Behavior

**Desktop (1024px+):**
- Full grid layout with sidebar
- Typography at maximum scale
- 3-column KPI grid

**Tablet (640px - 1023px):**
- Sidebar collapses to menu
- Single column layout
- Reduced padding
- 2-column KPI grid

**Mobile (<640px):**
- Full single column
- Minimum padding
- Stacked KPIs (1 per row)
- Simplified table layout

### Responsive Spacing Tokens

```css
@media (max-width: 1023px) {
  :root {
    --app-content-padding: 1.5rem; /* 24px */
  }
}

@media (max-width: 639px) {
  :root {
    --app-content-padding: 1rem;   /* 16px */
    --app-card-padding: 1rem;      /* 16px */
  }
}
```

---

## Landing Page Layout

### Section Structure

```html
<section class="section section-primary">
  <div class="section-container">
    <div class="section-content">
      <!-- Content -->
    </div>
  </div>
</section>
```

### Section Spacing

Uses `--landing-*` tokens:

```css
.section {
  padding: var(--landing-section-padding-y) var(--landing-section-padding-x);
}

.section + .section {
  margin-top: var(--landing-section-gap);
}
```

**Desktop:** 120px vertical padding, 80px section gaps
**Tablet:** 80px vertical padding, 48px section gaps
**Mobile:** 48px vertical padding, 32px section gaps

### Grid Container

```css
.section-container {
  max-width: 1440px;
  margin: 0 auto;
}

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

---

## Card Layout

### App Dashboard Cards

```css
.dashboard-card {
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--app-card-padding);
}

.dashboard-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-3);
}

.dashboard-card-body {
  color: var(--color-text-secondary);
  font-size: var(--font-size-app-body);
  line-height: var(--line-height-app-body);
}
```

### Landing Page Cards

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
```

---

## Validation Checklist

Before deploying layout:

**App UI:**
- [ ] No `--landing-*` tokens used
- [ ] Spacing does not exceed 80px vertically
- [ ] Tables use `--app-table-cell-padding-*`
- [ ] Sections use `--app-section-gap`
- [ ] Content uses `--app-content-padding`

**Landing Pages:**
- [ ] No `--app-*` tokens used
- [ ] Sections use `--landing-section-padding-*`
- [ ] Section gaps use `--landing-section-gap`
- [ ] Hero sections have proper spacing
- [ ] Dark/light rhythm follows rules

**Responsive:**
- [ ] Test at 1024px+ (desktop)
- [ ] Test at 640-1023px (tablet)
- [ ] Test at <640px (mobile)
- [ ] Sidebar collapses correctly
- [ ] Typography scales appropriately
- [ ] Grid layouts adapt properly

See [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) for automated validation rules.
