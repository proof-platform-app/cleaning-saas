# RTL (Right-to-Left) Rules

**Version:** 1.3
**Last Updated:** 2026-02-12

---

## RTL Principle

All components must support RTL languages (Arabic, Hebrew) without structural changes:

- Directional properties flip automatically
- Content order reverses
- Icons and indicators flip where semantically correct
- Certain elements remain LTR regardless of direction

---

## What Flips in RTL

### Layout

**Text alignment:**
- `text-align: left` → `text-align: right`

**Padding/margin:**
- `padding-left` → `padding-right`
- `margin-left` → `margin-right`

**Float:**
- `float: left` → `float: right`

**Grid/flex direction:**
- Direction reverses automatically

### Navigation

**Menu order:**
- Navigation items reverse order
- Dropdown menus open to the left
- Breadcrumb arrows flip direction

**Example:**
```
LTR: Home > Products > CleanProof
RTL: CleanProof < Products < Home
```

### Forms

**Label position:**
- Labels flip to right side of inputs

**Input text alignment:**
- Text entry aligns right for RTL languages

**Radio/checkbox groups:**
- Option order reverses

### Tables

**Column order:**
- Columns reverse (first column becomes last)

**Header alignment:**
- Headers align right

**Cell alignment:**
- Text cells align right
- Numeric cells remain right-aligned (visual consistency)

### Buttons

**Icon position:**
- Directional icons flip (arrows, chevrons)
- Order in button groups reverses

**CTA groups:**
```html
<!-- LTR -->
<div class="cta-group">
  <button class="primary">Primary</button>
  <button class="secondary">Secondary</button>
</div>

<!-- RTL: order reverses -->
<div class="cta-group" dir="rtl">
  <button class="secondary">Secondary</button>
  <button class="primary">Primary</button>
</div>
```

---

## What Stays the Same in RTL

### Preserved Elements

**Always LTR:**
- Numbers (always LTR)
- Dates (format stays LTR)
- Brand logos and lockups
- Code snippets
- Mathematical expressions
- Email addresses
- URLs

**Example:**
```html
<div dir="rtl">
  <p>العنوان: proof-platform.com</p>
  <!-- URL stays LTR even in RTL context -->
</div>
```

### Icons That Don't Flip

**Non-directional icons:**
- Checkmarks
- Close (×)
- Settings (gear)
- Search (magnifying glass)

**Status indicators:**
- Success checkmark
- Error X
- Warning triangle

**Media controls:**
- Play/pause (contextual decision)
- Volume icons

---

## RTL Implementation

### Base Rules

```css
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}
```

### Logical Properties (Automatic Flip)

Use logical properties for automatic RTL support:

```css
/* GOOD: Uses logical properties */
.component {
  margin-inline-start: var(--spacing-4);
  padding-inline-end: var(--spacing-2);
  border-inline-start: 1px solid var(--color-border-default);
}

/* Automatically becomes in RTL:
  margin-right: var(--spacing-4);
  padding-left: var(--spacing-2);
  border-right: 1px solid var(--color-border-default);
*/
```

### Manual Flip for Specific Cases

```css
/* Navigation links */
[dir="rtl"] .nav-links {
  flex-direction: row-reverse;
}

/* Button icon position */
[dir="rtl"] .button-icon-right {
  order: -1;
}

/* Directional arrow icons */
[dir="rtl"] .arrow-icon {
  transform: scaleX(-1);
}
```

### RTL Exceptions (Preserve LTR)

```css
/* Content that stays LTR */
.ltr-content {
  direction: ltr;
  text-align: left;
}

/* Numbers, dates, code always LTR */
.numeric,
.date,
.code,
.email,
.url {
  direction: ltr;
  text-align: left;
}

/* Brand logo always LTR */
.nav-logo {
  direction: ltr;
}

/* Table cells with numbers */
.table-cell-numeric {
  direction: ltr;
  text-align: right; /* Right-align numbers in both LTR and RTL */
}

[dir="rtl"] .table-cell-numeric {
  text-align: left; /* Left side of RTL table is visual right */
}
```

---

## Component-Specific RTL Rules

### Navigation

```css
/* Nav links reverse order */
[dir="rtl"] .nav-links {
  flex-direction: row-reverse;
}

/* Dropdown alignment */
[dir="rtl"] .dropdown {
  left: auto;
  right: 0;
}
```

### Tables

```css
/* Table columns reverse */
[dir="rtl"] .data-table {
  direction: rtl;
}

/* Header text aligns right */
[dir="rtl"] .data-table th {
  text-align: right;
}

/* Numeric columns stay logical */
[dir="rtl"] .table-cell-numeric {
  text-align: left; /* Visual right in RTL */
}
```

### Forms

```css
/* Input text aligns right */
[dir="rtl"] .form-input {
  text-align: right;
}

/* Select dropdown arrow position */
[dir="rtl"] .form-select {
  background-position: left 1rem center;
  padding-right: var(--input-padding-x);
  padding-left: 2.5rem;
}

/* Checkbox/radio alignment */
[dir="rtl"] .form-checkbox,
[dir="rtl"] .form-radio {
  margin-left: var(--spacing-2);
  margin-right: 0;
}
```

### Buttons & CTAs

```css
/* Button groups reverse */
[dir="rtl"] .button-group {
  flex-direction: row-reverse;
}

/* Icon in button flips if directional */
[dir="rtl"] .button-icon-right {
  order: -1;
}

[dir="rtl"] .button-icon-left {
  order: 1;
}
```

### Cards

```css
/* Card layout mirrors */
[dir="rtl"] .card {
  text-align: right;
}

/* Card footer actions reverse */
[dir="rtl"] .card-footer-actions {
  flex-direction: row-reverse;
}
```

---

## Testing Checklist

Before deploying RTL support:

**Layout:**
- [ ] All text flows right-to-left
- [ ] Padding and margins mirror correctly
- [ ] Grid layouts reverse properly
- [ ] Flex containers reverse direction

**Navigation:**
- [ ] Nav links reverse order
- [ ] Dropdowns open to left
- [ ] Breadcrumbs reverse with flipped arrows
- [ ] Menu items align right

**Forms:**
- [ ] Labels align to right of inputs
- [ ] Input text aligns right
- [ ] Select arrows position correctly
- [ ] Radio/checkbox groups reverse

**Tables:**
- [ ] Columns reverse order
- [ ] Headers align right
- [ ] Numeric cells maintain visual alignment
- [ ] Action columns move to left (visual right)

**Buttons:**
- [ ] Button groups reverse order
- [ ] Icon positions flip correctly
- [ ] CTA hierarchy maintained

**Exceptions:**
- [ ] Numbers remain LTR
- [ ] Dates remain LTR
- [ ] URLs remain LTR
- [ ] Email addresses remain LTR
- [ ] Brand logos remain LTR
- [ ] Code snippets remain LTR

**Visual:**
- [ ] Spacing mirrors correctly
- [ ] Borders appear on correct side
- [ ] Shadows don't look broken
- [ ] Icons flip where appropriate

---

## Browser Support

**RTL features require:**
- CSS Logical Properties support
- `dir="rtl"` attribute support
- Modern flexbox/grid support

**Supported browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Implementation Guide

### Step 1: Add RTL Attribute

```html
<html lang="ar" dir="rtl">
  <!-- Content -->
</html>
```

### Step 2: Use Logical Properties

Replace directional properties with logical equivalents:

```css
/* OLD */
.component {
  margin-left: 1rem;
  padding-right: 2rem;
  border-left: 1px solid;
}

/* NEW */
.component {
  margin-inline-start: 1rem;
  padding-inline-end: 2rem;
  border-inline-start: 1px solid;
}
```

### Step 3: Add RTL Overrides

```css
/* Flip directional elements */
[dir="rtl"] .arrow-icon {
  transform: scaleX(-1);
}

[dir="rtl"] .nav-links {
  flex-direction: row-reverse;
}
```

### Step 4: Preserve LTR Elements

```css
/* Keep numbers, dates, URLs in LTR */
[dir="rtl"] .numeric,
[dir="rtl"] .date,
[dir="rtl"] .url {
  direction: ltr;
  text-align: left;
}
```

### Step 5: Test

- Test with real Arabic/Hebrew content
- Verify all layout elements mirror
- Check exceptions remain LTR
- Validate accessibility

See [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) for RTL validation rules.
