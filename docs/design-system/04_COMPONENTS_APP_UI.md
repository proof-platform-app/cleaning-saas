# App UI Components

**Version:** 1.3
**Last Updated:** 2026-02-12

---

## Component Philosophy

App UI components are designed for **operational efficiency**:

- Enterprise density (not marketing spacing)
- Functional clarity over visual decoration
- Semantic status colors (never product accents)
- Information hierarchy (primary/secondary/tertiary)

**All app components:**
- Use `--app-*` spacing tokens (never `--landing-*`)
- Use semantic colors for status
- Follow WCAG AA accessibility standards
- Support responsive breakpoints

---

## 1. Data Tables

### Basic Table Structure

```css
.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.data-table thead {
  background: var(--color-bg-tertiary);
}

.data-table th {
  padding: var(--app-table-cell-padding-y) var(--app-table-cell-padding-x);
  text-align: left;
  font-size: var(--font-size-app-caption);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
}

.data-table tbody tr {
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  transition: background var(--duration-fast) var(--easing-default);
}

.data-table tbody tr:last-child {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: var(--color-bg-tertiary);
}

.data-table td {
  padding: var(--app-table-cell-padding-y) var(--app-table-cell-padding-x);
  font-size: var(--font-size-app-body);
  line-height: var(--line-height-app-body);
  color: var(--color-text-primary);
}
```

### Table Cell Variants

```css
/* Monospace (IDs, codes) */
.table-cell-mono {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-app-caption);
  color: var(--color-text-secondary);
}

/* Numeric (right-aligned, tabular) */
.table-cell-numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Action column (right-aligned, minimal width) */
.table-cell-action {
  text-align: right;
  width: 1%;
  white-space: nowrap;
}
```

---

## 2. Status Badges

**Critical Rule:** Status badges must ONLY use semantic colors, never product accents.

### Badge Structure

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--font-size-app-label);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-app-label);
  white-space: nowrap;
}

/* Status indicator dot */
.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
```

### Badge Variants (Semantic Colors Only)

```css
.status-badge-completed {
  background: var(--color-status-completed-bg);
  color: var(--color-status-completed);
}

.status-badge-in-progress {
  background: var(--color-status-in-progress-bg);
  color: var(--color-status-in-progress);
}

.status-badge-scheduled {
  background: var(--color-status-scheduled-bg);
  color: var(--color-status-scheduled);
}

.status-badge-failed {
  background: var(--color-status-failed-bg);
  color: var(--color-status-failed);
}

.status-badge-flagged {
  background: var(--color-status-flagged-bg);
  color: var(--color-status-flagged);
}
```

**FORBIDDEN:**
```css
/* WRONG: Using accent for status */
.status-badge-completed {
  background: var(--accent-bg-subtle); /* FORBIDDEN */
  color: var(--accent-primary); /* FORBIDDEN */
}
```

---

## 3. KPI Cards

### Card Structure

```css
.kpi-card {
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--app-card-padding);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.kpi-label {
  font-size: var(--font-size-app-caption);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.kpi-value {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-h2);
  color: var(--color-text-primary);
}

.kpi-change {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--font-size-app-caption);
  font-weight: var(--font-weight-medium);
}

.kpi-change.positive {
  color: var(--color-success);
}

.kpi-change.negative {
  color: var(--color-error);
}
```

### Layout Constraints

- Maximum 3 KPI cards per row on desktop
- Minimum card width: 280px
- Use CSS Grid with auto-fill for responsive layout

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-4);
}
```

---

## 4. Charts & Data Visualization

### Chart Container

```css
.chart-container {
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--app-card-padding);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-4);
}

.chart-title {
  font-size: var(--font-size-app-heading);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.chart-canvas {
  min-height: 300px;
}
```

### Chart Legend

```css
.chart-legend {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.chart-legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--font-size-app-caption);
  color: var(--color-text-secondary);
}

.chart-legend-color {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-sm);
}
```

**Color Coding:**
- Use semantic status colors for status-based data
- Never use product accent for status representation
- Accent allowed for non-status visual elements only

---

## 5. Forms & Inputs

### Form Group

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: var(--app-form-gap);
}

.form-label {
  font-size: var(--font-size-app-body);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.form-label-required::after {
  content: '*';
  color: var(--color-error);
  margin-left: 0.25rem;
}

.form-helper {
  font-size: var(--font-size-app-caption);
  color: var(--color-text-tertiary);
}
```

### Input Field

```css
.form-input {
  width: 100%;
  padding: var(--input-padding-y) var(--input-padding-x);
  background: var(--color-bg-primary);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-default);
  font-size: var(--font-size-app-body);
  line-height: var(--line-height-app-body);
  color: var(--color-text-primary);
  transition: border-color var(--duration-fast) var(--easing-default);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-primary); /* Accent allowed for focus state */
}

.form-input:disabled {
  background: var(--color-bg-tertiary);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.form-input.error {
  border-color: var(--color-error); /* Semantic color for validation */
}
```

### Textarea Variant

```css
.form-textarea {
  min-height: 120px;
  resize: vertical;
}
```

### Select Variant

```css
.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23A0AEC0' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 16px;
  padding-right: 2.5rem;
}
```

---

## 6. Empty States

### Structure

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-12) var(--spacing-4);
  text-align: center;
  min-height: 400px;
}

.empty-state-icon {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-4);
  color: var(--color-text-tertiary);
}

.empty-state-title {
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.empty-state-description {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  max-width: 400px;
  margin-bottom: var(--spacing-4);
}

.empty-state-action {
  margin-top: var(--spacing-2);
}
```

**Constraints:**
- Minimum height: 400px
- Maximum vertical padding: 96px (`--spacing-12`)
- No full-viewport empty states
- Icon size maximum: 64px

---

## 7. Dashboard Cards

### Basic Dashboard Card

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

.dashboard-card-title {
  font-size: var(--font-size-app-heading);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-app-heading);
  color: var(--color-text-primary);
}

.dashboard-card-body {
  color: var(--color-text-secondary);
  font-size: var(--font-size-app-body);
  line-height: var(--line-height-app-body);
}
```

---

## 8. Buttons (App Context)

### Button Structure

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--button-padding-y) var(--button-padding-x);
  border: none;
  border-radius: var(--radius-default);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--duration-default) var(--easing-default);
  white-space: nowrap;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Button Variants

```css
/* Primary (uses accent) */
.button-primary {
  background: var(--accent-primary);
  color: var(--accent-on-primary);
}

.button-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.button-primary:active:not(:disabled) {
  background: var(--accent-active);
  transform: translateY(0);
}

/* Secondary (outlined) */
.button-secondary {
  background: transparent;
  border: var(--border-width-default) solid var(--color-border-strong);
  color: var(--color-text-primary);
}

.button-secondary:hover:not(:disabled) {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Ghost (minimal) */
.button-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.button-ghost:hover:not(:disabled) {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

/* Danger (destructive actions) */
.button-danger {
  background: var(--color-error);
  color: #FFFFFF;
}

.button-danger:hover:not(:disabled) {
  background: var(--color-error-hover);
}
```

### Button Sizes

```css
.button-small {
  padding: 0.5rem 1rem;
  font-size: var(--font-size-body-small);
}

.button-large {
  padding: 1rem 2.5rem;
  font-size: var(--font-size-body-large);
}
```

### Loading State

```css
.button-loading {
  position: relative;
  color: transparent;
}

.button-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: button-spin 0.6s linear infinite;
}

@keyframes button-spin {
  to { transform: rotate(360deg); }
}
```

---

## Component Usage Rules

### DO

- Use `--app-*` spacing tokens for all app components
- Use semantic colors for status indicators
- Use `--accent-primary` for primary CTAs and focus states
- Maintain enterprise density (no excessive whitespace)
- Follow WCAG AA contrast standards

### DON'T

- Use `--landing-*` tokens in app components
- Use product accent for status badges or workflow states
- Use marketing-style spacing (120px+ padding)
- Create decorative components without functional purpose
- Override token values with inline styles

### Validation

Before deploying app component:
1. Verify uses `--app-*` tokens (not `--landing-*`)
2. Verify status uses semantic colors (not accent)
3. Verify contrast ratios meet WCAG AA
4. Test responsive behavior
5. Test keyboard navigation

See [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) for automated validation rules.
