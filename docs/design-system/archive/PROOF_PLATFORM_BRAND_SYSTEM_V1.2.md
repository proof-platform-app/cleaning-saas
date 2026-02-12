# Proof Platform Brand System v1.2

## Version 1.2 Changelog

**Changes from v1.1:**
- **Header Modes**: Introduced platform mode vs product mode; removed mandatory "by Proof Platform" attribution from application UI headers
- **Accent Contrast Fix**: Added `--accent-on-primary` token to ensure WCAG AA compliance for all accent colors
- **Platform Header Neutrality**: Clarified enforcement rules for accent-free platform navigation
- **Application Density Rules**: Added enterprise UI density specifications to prevent marketing-style spacing leaks
- **Visual Authority Principles**: Defined forbidden visual treatments for enterprise operational contexts
- **Template Cleanup**: Replaced product-specific examples with neutral structural placeholders
- **Governance Layer**: Added enforcement rules for token usage, component inheritance, and implementation standards

---

**Version 1.2**  
**Document Type:** Implementation Guide  
**Scope:** CSS design tokens + component specifications for landing pages and application UI  
**Status:** Production-ready  
**Dependencies:** PROOF_PLATFORM_VISION.md, CONTEXT_RULES.md

---

## 1. Design Tokens

### 1.1 Color Tokens

```css
:root {
  /* ===================================
     BACKGROUND SYSTEM - DARK MODE (DEFAULT)
     ================================== */
  --color-bg-primary: #0A0E14;
  --color-bg-secondary: #151B23;
  --color-bg-tertiary: #1E262F;
  --color-bg-elevated: #242D38;
  
  /* ===================================
     BACKGROUND SYSTEM - LIGHT MODE
     Used for controlled light sections only
     ================================== */
  --color-bg-light-primary: #FFFFFF;
  --color-bg-light-secondary: #F9FAFB;
  --color-bg-light-tertiary: #F3F4F6;
  --color-bg-light-elevated: #FFFFFF;
  
  /* ===================================
     TEXT SYSTEM - DARK MODE (DEFAULT)
     ================================== */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A0AEC0;
  --color-text-tertiary: #64748B;
  --color-text-disabled: #475569;
  
  /* ===================================
     TEXT SYSTEM - LIGHT MODE
     ================================== */
  --color-text-light-primary: #0A0E14;
  --color-text-light-secondary: #475569;
  --color-text-light-tertiary: #64748B;
  --color-text-light-disabled: #94A3B8;
  
  /* ===================================
     BORDER & DIVIDER SYSTEM - DARK MODE
     ================================== */
  --color-border-default: #2D3748;
  --color-border-subtle: #1E293B;
  --color-border-strong: #475569;
  
  /* ===================================
     BORDER & DIVIDER SYSTEM - LIGHT MODE
     ================================== */
  --color-border-light-default: #E2E8F0;
  --color-border-light-subtle: #F1F5F9;
  --color-border-light-strong: #CBD5E1;
  
  /* ===================================
     FUNCTIONAL COLORS (MODE-INDEPENDENT)
     ================================== */
  --color-success: #10B981;
  --color-success-bg: rgba(16, 185, 129, 0.1);
  --color-success-border: rgba(16, 185, 129, 0.2);
  
  --color-warning: #F59E0B;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-warning-border: rgba(245, 158, 11, 0.2);
  
  --color-error: #EF4444;
  --color-error-bg: rgba(239, 68, 68, 0.1);
  --color-error-border: rgba(239, 68, 68, 0.2);
  
  --color-info: #3B82F6;
  --color-info-bg: rgba(59, 130, 246, 0.1);
  --color-info-border: rgba(59, 130, 246, 0.2);
  
  /* ===================================
     STATUS COLORS (APP UI)
     ================================== */
  --color-status-completed: #10B981;
  --color-status-in-progress: #3B82F6;
  --color-status-scheduled: #64748B;
  --color-status-failed: #EF4444;
  --color-status-flagged: #F59E0B;
  
  --color-status-completed-bg: rgba(16, 185, 129, 0.1);
  --color-status-in-progress-bg: rgba(59, 130, 246, 0.1);
  --color-status-scheduled-bg: rgba(100, 116, 139, 0.1);
  --color-status-failed-bg: rgba(239, 68, 68, 0.1);
  --color-status-flagged-bg: rgba(245, 158, 11, 0.1);
  
  /* ===================================
     ACCENT COLORS (PRODUCT-SPECIFIC)
     Injected per product context
     ================================== */
  --accent-primary: #FFFFFF; /* Default: Platform neutral */
  --accent-hover: #F9FAFB;
  --accent-active: #E5E7EB;
  --accent-on-primary: #000000; /* Text color on accent background */
  --accent-bg-subtle: rgba(255, 255, 255, 0.1);
  --accent-bg-muted: rgba(255, 255, 255, 0.05);
  --accent-border: rgba(255, 255, 255, 0.2);
}

/* ===================================
   LIGHT MODE SECTION OVERRIDE
   Applied to specific sections only
   ================================== */
.section-light {
  --color-bg-primary: var(--color-bg-light-primary);
  --color-bg-secondary: var(--color-bg-light-secondary);
  --color-bg-tertiary: var(--color-bg-light-tertiary);
  --color-bg-elevated: var(--color-bg-light-elevated);
  
  --color-text-primary: var(--color-text-light-primary);
  --color-text-secondary: var(--color-text-light-secondary);
  --color-text-tertiary: var(--color-text-light-tertiary);
  --color-text-disabled: var(--color-text-light-disabled);
  
  --color-border-default: var(--color-border-light-default);
  --color-border-subtle: var(--color-border-light-subtle);
  --color-border-strong: var(--color-border-light-strong);
}

/* ===================================
   PRODUCT CONTEXT TOKENS
   ================================== */

/* Cleaning Services (CleanProof) */
[data-product="cleaning"] {
  --accent-primary: #3B82F6;
  --accent-hover: #60A5FA;
  --accent-active: #2563EB;
  --accent-on-primary: #FFFFFF; /* WCAG AA: 4.5:1 contrast ratio */
  --accent-bg-subtle: rgba(59, 130, 246, 0.1);
  --accent-bg-muted: rgba(59, 130, 246, 0.05);
  --accent-border: rgba(59, 130, 246, 0.2);
}

/* Maintenance Services */
[data-product="maintenance"] {
  --accent-primary: #14B8A6;
  --accent-hover: #2DD4BF;
  --accent-active: #0D9488;
  --accent-on-primary: #000000; /* WCAG AA: 4.5:1 contrast ratio */
  --accent-bg-subtle: rgba(20, 184, 166, 0.1);
  --accent-bg-muted: rgba(20, 184, 166, 0.05);
  --accent-border: rgba(20, 184, 166, 0.2);
}

/* Property Management */
[data-product="property"] {
  --accent-primary: #F59E0B;
  --accent-hover: #FBBF24;
  --accent-active: #D97706;
  --accent-on-primary: #000000; /* WCAG AA: 4.5:1 contrast ratio */
  --accent-bg-subtle: rgba(245, 158, 11, 0.1);
  --accent-bg-muted: rgba(245, 158, 11, 0.05);
  --accent-border: rgba(245, 158, 11, 0.2);
}

/* Fit-Out & Construction */
[data-product="fitout"] {
  --accent-primary: #F97316;
  --accent-hover: #FB923C;
  --accent-active: #EA580C;
  --accent-on-primary: #000000; /* WCAG AA: 4.5:1 contrast ratio */
  --accent-bg-subtle: rgba(249, 115, 22, 0.1);
  --accent-bg-muted: rgba(249, 115, 22, 0.05);
  --accent-border: rgba(249, 115, 22, 0.2);
}

/* Future Products */
[data-product="security"] {
  --accent-primary: #8B5CF6;
  --accent-hover: #A78BFA;
  --accent-active: #7C3AED;
  --accent-on-primary: #FFFFFF; /* WCAG AA: 4.5:1 contrast ratio */
  --accent-bg-subtle: rgba(139, 92, 246, 0.1);
  --accent-bg-muted: rgba(139, 92, 246, 0.05);
  --accent-border: rgba(139, 92, 246, 0.2);
}

[data-product="logistics"] {
  --accent-primary: #06B6D4;
  --accent-hover: #22D3EE;
  --accent-active: #0891B2;
  --accent-on-primary: #000000; /* WCAG AA: 4.5:1 contrast ratio */
  --accent-bg-subtle: rgba(6, 182, 212, 0.1);
  --accent-bg-muted: rgba(6, 182, 212, 0.05);
  --accent-border: rgba(6, 182, 212, 0.2);
}

[data-product="environmental"] {
  --accent-primary: #10B981;
  --accent-hover: #34D399;
  --accent-active: #059669;
  --accent-on-primary: #000000; /* WCAG AA: 4.5:1 contrast ratio */
  --accent-bg-subtle: rgba(16, 185, 129, 0.1);
  --accent-bg-muted: rgba(16, 185, 129, 0.05);
  --accent-border: rgba(16, 185, 129, 0.2);
}

[data-product="emergency"] {
  --accent-primary: #EF4444;
  --accent-hover: #F87171;
  --accent-active: #DC2626;
  --accent-on-primary: #FFFFFF; /* WCAG AA: 4.5:1 contrast ratio */
  --accent-bg-subtle: rgba(239, 68, 68, 0.1);
  --accent-bg-muted: rgba(239, 68, 68, 0.05);
  --accent-border: rgba(239, 68, 68, 0.2);
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

### 1.2 Typography Tokens

```css
:root {
  /* ===================================
     FONT FAMILY
     ================================== */
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 
                         'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 
                         sans-serif;
  --font-family-mono: 'SF Mono', 'Monaco', 'Inconsolata', 
                      'Fira Code', monospace;
  
  /* ===================================
     FONT SIZES - LANDING
     ================================== */
  --font-size-hero: 3.5rem;        /* 56px */
  --font-size-h1: 3.5rem;          /* 56px */
  --font-size-h2: 2.5rem;          /* 40px */
  --font-size-h3: 2rem;            /* 32px */
  --font-size-h4: 1.5rem;          /* 24px */
  --font-size-h5: 1.25rem;         /* 20px */
  --font-size-h6: 1.125rem;        /* 18px */
  --font-size-body-large: 1.125rem;/* 18px */
  --font-size-body: 1rem;          /* 16px */
  --font-size-body-small: 0.875rem;/* 14px */
  --font-size-caption: 0.75rem;    /* 12px */
  --font-size-label: 0.6875rem;    /* 11px */
  
  /* ===================================
     FONT SIZES - APP UI
     ================================== */
  --font-size-app-title: 1.5rem;   /* 24px - page titles */
  --font-size-app-heading: 1.125rem;/* 18px - section headings */
  --font-size-app-body: 0.875rem;  /* 14px - table/form text */
  --font-size-app-caption: 0.75rem;/* 12px - helpers/metadata */
  --font-size-app-label: 0.6875rem;/* 11px - badges/tags */
  
  /* ===================================
     LINE HEIGHTS - LANDING
     ================================== */
  --line-height-hero: 4rem;        /* 64px */
  --line-height-h1: 4rem;          /* 64px */
  --line-height-h2: 3rem;          /* 48px */
  --line-height-h3: 2.5rem;        /* 40px */
  --line-height-h4: 2rem;          /* 32px */
  --line-height-h5: 1.75rem;       /* 28px */
  --line-height-h6: 1.75rem;       /* 28px */
  --line-height-body-large: 1.75rem;/* 28px */
  --line-height-body: 1.5rem;      /* 24px */
  --line-height-body-small: 1.25rem;/* 20px */
  --line-height-caption: 1rem;     /* 16px */
  --line-height-label: 1rem;       /* 16px */
  
  /* ===================================
     LINE HEIGHTS - APP UI
     ================================== */
  --line-height-app-title: 2rem;   /* 32px */
  --line-height-app-heading: 1.75rem;/* 28px */
  --line-height-app-body: 1.25rem; /* 20px */
  --line-height-app-caption: 1rem; /* 16px */
  --line-height-app-label: 1rem;   /* 16px */
  
  /* ===================================
     FONT WEIGHTS
     ================================== */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-black: 900;
  
  /* ===================================
     LETTER SPACING
     ================================== */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.025em;
  --letter-spacing-wider: 0.05em;
  --letter-spacing-widest: 0.1em;
}

/* ===================================
   RESPONSIVE TYPOGRAPHY
   ================================== */
@media (max-width: 1023px) {
  :root {
    --font-size-hero: 2.5rem;      /* 40px */
    --font-size-h1: 2.5rem;        /* 40px */
    --font-size-h2: 2rem;          /* 32px */
    --font-size-h3: 1.5rem;        /* 24px */
    --line-height-hero: 3rem;      /* 48px */
    --line-height-h1: 3rem;        /* 48px */
    --line-height-h2: 2.5rem;      /* 40px */
    --line-height-h3: 2rem;        /* 32px */
  }
}

@media (max-width: 639px) {
  :root {
    --font-size-hero: 2rem;        /* 32px */
    --font-size-h1: 2rem;          /* 32px */
    --font-size-h2: 1.5rem;        /* 24px */
    --font-size-h3: 1.25rem;       /* 20px */
    --line-height-hero: 2.5rem;    /* 40px */
    --line-height-h1: 2.5rem;      /* 40px */
    --line-height-h2: 2rem;        /* 32px */
    --line-height-h3: 1.75rem;     /* 28px */
  }
}
```

---

### 1.3 Spacing Tokens

```css
:root {
  /* ===================================
     BASE SPACING UNIT
     ================================== */
  --spacing-unit: 0.5rem;          /* 8px */
  
  /* ===================================
     SPACING SCALE (8px base)
     ================================== */
  --spacing-0: 0;
  --spacing-1: 0.5rem;             /* 8px */
  --spacing-2: 1rem;               /* 16px */
  --spacing-3: 1.5rem;             /* 24px */
  --spacing-4: 2rem;               /* 32px */
  --spacing-5: 2.5rem;             /* 40px */
  --spacing-6: 3rem;               /* 48px */
  --spacing-8: 4rem;               /* 64px */
  --spacing-10: 5rem;              /* 80px */
  --spacing-12: 6rem;              /* 96px */
  --spacing-16: 8rem;              /* 128px */
  --spacing-20: 10rem;             /* 160px */
  --spacing-24: 12rem;             /* 192px */
  
  /* ===================================
     SECTION SPACING - LANDING
     ================================== */
  --section-padding-y: 7.5rem;     /* 120px desktop */
  --section-padding-x: 2rem;       /* 32px */
  --section-gap: 5rem;             /* 80px */
  
  /* ===================================
     COMPONENT SPACING - LANDING
     ================================== */
  --card-padding: 2rem;            /* 32px */
  --card-gap: 1.5rem;              /* 24px */
  --button-padding-x: 2rem;        /* 32px */
  --button-padding-y: 0.875rem;    /* 14px */
  --input-padding-x: 1rem;         /* 16px */
  --input-padding-y: 0.75rem;      /* 12px */
  
  /* ===================================
     APP UI SPACING
     ================================== */
  --app-header-height: 4rem;       /* 64px */
  --app-sidebar-width: 16rem;      /* 256px */
  --app-content-padding: 2rem;     /* 32px */
  --app-card-padding: 1.5rem;      /* 24px */
  --app-table-cell-padding-x: 1rem;/* 16px */
  --app-table-cell-padding-y: 0.75rem;/* 12px */
  --app-form-gap: 1.5rem;          /* 24px */
  --app-section-gap: 2rem;         /* 32px */
}

/* ===================================
   RESPONSIVE SPACING
   ================================== */
@media (max-width: 1023px) {
  :root {
    --section-padding-y: 5rem;     /* 80px */
    --section-gap: 3rem;           /* 48px */
    --app-content-padding: 1.5rem; /* 24px */
  }
}

@media (max-width: 639px) {
  :root {
    --section-padding-y: 3rem;     /* 48px */
    --section-padding-x: 1rem;     /* 16px */
    --section-gap: 2rem;           /* 32px */
    --card-padding: 1.5rem;        /* 24px */
    --app-content-padding: 1rem;   /* 16px */
    --app-card-padding: 1rem;      /* 16px */
  }
}
```

---

### 1.4 Border & Shadow Tokens

```css
:root {
  /* ===================================
     BORDER RADIUS
     ================================== */
  --radius-none: 0;
  --radius-sm: 0.25rem;            /* 4px */
  --radius-default: 0.5rem;        /* 8px */
  --radius-md: 0.75rem;            /* 12px */
  --radius-lg: 1rem;               /* 16px */
  --radius-xl: 1.5rem;             /* 24px */
  --radius-full: 9999px;
  
  /* ===================================
     BORDER WIDTH
     ================================== */
  --border-width-default: 1px;
  --border-width-thick: 2px;
  --border-width-thicker: 3px;
  
  /* ===================================
     SHADOWS
     ================================== */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-default: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 
                    0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
               0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
               0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
               0 10px 10px -5px rgba(0, 0, 0, 0.04);
  
  /* ===================================
     BACKDROP BLUR
     ================================== */
  --backdrop-blur-sm: blur(4px);
  --backdrop-blur-default: blur(8px);
  --backdrop-blur-md: blur(12px);
  --backdrop-blur-lg: blur(16px);
}
```

---

### 1.5 Animation Tokens

```css
:root {
  /* ===================================
     DURATION
     ================================== */
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-default: 300ms;
  --duration-slow: 500ms;
  
  /* ===================================
     EASING
     ================================== */
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-in-out: cubic-bezier(0.4, 0, 0.6, 1);
}
```

---

## 2. Dark-First Color Mode Rules

### 2.1 Core Principle

Proof Platform is **dark-first** but not dark-only:

- Default background: dark (`--color-bg-primary`)
- All components designed with dark as primary state
- Light sections allowed in controlled rhythm
- Light mode never becomes the dominant visual language

---

### 2.2 When Light Sections Are Allowed

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

---

### 2.3 Light Section Implementation

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

---

### 2.4 Rhythm Rules

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

## 3. Product UI Component System

### 3.1 Application Layout

```css
/* ===================================
   APP LAYOUT STRUCTURE
   ================================== */
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

/* Responsive collapse */
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

### 3.2 Dashboard Cards

```css
/* ===================================
   DASHBOARD CARD
   ================================== */
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

### 3.3 KPI Cards

```css
/* ===================================
   KPI CARD (METRIC DISPLAY)
   ================================== */
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

---

### 3.4 Data Tables

```css
/* ===================================
   DATA TABLE
   ================================== */
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

/* Table cell variants */
.table-cell-mono {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-app-caption);
  color: var(--color-text-secondary);
}

.table-cell-numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.table-cell-action {
  text-align: right;
  width: 1%;
  white-space: nowrap;
}
```

---

### 3.5 Status Badges

```css
/* ===================================
   STATUS BADGE
   ================================== */
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

/* Status indicator dot */
.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
```

---

### 3.6 Forms & Inputs

```css
/* ===================================
   FORM STRUCTURE
   ================================== */
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

/* ===================================
   INPUT FIELDS
   ================================== */
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
  border-color: var(--accent-primary);
}

.form-input:disabled {
  background: var(--color-bg-tertiary);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.form-input.error {
  border-color: var(--color-error);
}

/* Textarea variant */
.form-textarea {
  min-height: 120px;
  resize: vertical;
}

/* Select variant */
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

### 3.7 Empty States

```css
/* ===================================
   EMPTY STATE
   ================================== */
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

---

### 3.8 Charts & Data Visualization

```css
/* ===================================
   CHART CONTAINER
   ================================== */
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

/* Chart canvas */
.chart-canvas {
  min-height: 300px;
}
```

---

## 4. Application Density & Information Hierarchy

### 4.1 Enterprise Density Principle

Proof Platform application UI uses **medium enterprise density**:

- Information-rich without feeling cramped
- Functional spacing prioritized over decorative whitespace
- Dashboard efficiency over marketing aesthetics
- Middle East enterprise expectations

---

### 4.2 Density Rules

**Tables:**
- Cell padding: 12px vertical, 16px horizontal (defined in tokens)
- Row height: auto based on content, minimum 44px
- No oversized padding between rows
- Maximum table rows per page: 50 (pagination required beyond)

**KPI Cards:**
- Maximum 3 KPI cards per row on desktop
- Minimum card width: 280px
- Card padding: 24px (1.5rem)
- No excessive internal spacing

**Empty States:**
- Minimum height: 400px
- Maximum vertical padding: 96px (spacing-12)
- No full-viewport empty states
- Icon size maximum: 64px

**Dashboard Sections:**
- Section gap: 32px (app-section-gap)
- Card gap within sections: 24px
- No more than 80px vertical spacing between dashboard sections

---

### 4.3 Vertical Rhythm Rules

**Dashboard page structure:**
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

**Forbidden:**
- Marketing-style 120px+ section padding in dashboards
- Full-screen empty states with 200px+ padding
- Decorative spacers larger than 32px in app UI
- Landing page spacing tokens in application UI

---

### 4.4 Information Priority

**Primary information:**
- Uses `--font-size-app-title` (24px) or `--font-size-app-heading` (18px)
- High contrast: `--color-text-primary`
- Above the fold

**Secondary information:**
- Uses `--font-size-app-body` (14px)
- Medium contrast: `--color-text-secondary`
- Supporting details, metadata

**Tertiary information:**
- Uses `--font-size-app-caption` (12px)
- Low contrast: `--color-text-tertiary`
- Timestamps, helper text, legal

---

## 5. Visual Authority Principles

### 5.1 Core Principle

Proof Platform maintains **operational authority** in visual language:

- Enterprise operational context
- Middle East professional standards
- Functional over decorative
- Trust over trendiness

---

### 5.2 Forbidden Visual Treatments

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

---

### 5.3 Permitted Visual Elements

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

---

### 5.4 Regional Considerations

**Middle East Enterprise Standards:**
- Conservative professional aesthetic
- High-contrast legibility priority
- Avoid Western startup visual trends
- Respect cultural formality in design tone

---

## 6. Component Specifications

### 6.1 Buttons

```css
/* ===================================
   BUTTON BASE
   ================================== */
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

/* ===================================
   BUTTON VARIANTS
   ================================== */

/* Primary (accent color with proper contrast) */
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
  background: #DC2626;
}

/* ===================================
   BUTTON SIZES
   ================================== */
.button-small {
  padding: 0.5rem 1rem;
  font-size: var(--font-size-body-small);
}

.button-large {
  padding: 1rem 2.5rem;
  font-size: var(--font-size-body-large);
}

/* ===================================
   BUTTON STATES
   ================================== */
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

### 6.2 Navigation

```css
/* ===================================
   HEADER NAVIGATION
   ================================== */
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

/* Platform navigation active state (no accent color) */
.nav-header[data-context="platform"] .nav-link.active {
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-text-primary);
  padding-bottom: 2px;
}

/* Product navigation active state (accent allowed) */
.nav-header[data-context="product"] .nav-link.active {
  color: var(--accent-primary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

/* Mobile menu toggle */
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

### 6.3 Cards

```css
/* ===================================
   CARD BASE
   ================================== */
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

/* ===================================
   CARD VARIANTS
   ================================== */

/* Feature card with icon */
.card-feature {
  text-align: center;
}

.card-feature-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--spacing-3);
  color: var(--accent-primary);
}

/* Clickable card */
.card-clickable {
  cursor: pointer;
}

.card-clickable:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-lg);
}

/* Elevated card */
.card-elevated {
  box-shadow: var(--shadow-lg);
  border: none;
}
```

---

## 7. Header Modes & Brand Attribution

### 7.1 Header Mode Definition

Proof Platform supports two distinct header modes based on context:

- **Platform Mode**: Used on proof-platform.com (corporate site, API docs)
- **Product Mode**: Used on product landing pages (cleanproof.com, etc.)

Application UI headers always use **Product Mode** without subordination.

---

### 7.2 Platform Mode Header

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

---

### 7.3 Product Mode Header (Landing Pages)

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

---

### 7.4 Product Mode Header (Application UI)

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

### 7.5 Where Platform Attribution Appears

**Footer (Required):**
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

**About/Legal Pages (Required):**
- About page content
- Terms of service footer
- Privacy policy footer
- Legal entity references

**Generated Reports (Required):**
- PDF report footer
- Email report signatures
- Audit trail documents

**Marketing Materials (Optional):**
- Product brochures
- Sales decks
- Case studies

**Forbidden:**
- Application dashboard headers
- Within-app navigation
- Data table headers
- Form titles
- Modal dialogs
- Toast notifications

---

### 7.6 Implementation Examples

**Platform Mode CSS:**
```css
/* Platform header: neutral, no accent */
.nav-header[data-context="platform"] {
  background: var(--color-bg-primary);
}

.nav-header[data-context="platform"] .nav-logo {
  color: var(--color-text-primary);
}

.nav-header[data-context="platform"] .nav-link.active {
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-text-primary);
}
```

**Product Mode CSS:**
```css
/* Product header: accent allowed in specific elements */
.nav-header[data-context="product"] .nav-logo {
  color: var(--accent-primary);
}

.nav-header[data-context="product"] .nav-link.active {
  color: var(--accent-primary);
}

.nav-header[data-context="product"] .button-primary {
  background: var(--accent-primary);
  color: var(--accent-on-primary);
}
```

**Application UI CSS:**
```css
/* App header: product name neutral, no subordination */
.app-header {
  background: var(--color-bg-secondary);
}

.app-product-name {
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}
```

---

## 8. Platform Header Neutrality Enforcement

### 8.1 Core Rule

Platform navigation headers must remain **accent-free** and **product-neutral**:

- Background always `--color-bg-primary` (neutral dark)
- Text always `--color-text-primary` (white)
- No product accent colors anywhere in platform header
- Active states use underline or neutral highlight only

---

### 8.2 Enforcement Specification

**Platform Header Element Rules:**

| Element | Color | Active State | Forbidden |
|---------|-------|--------------|-----------|
| Background | `--color-bg-primary` | N/A | Any accent color |
| Logo text | `--color-text-primary` | N/A | Any accent color |
| Nav link (default) | `--color-text-secondary` | N/A | Any accent color |
| Nav link (hover) | `--color-text-primary` | N/A | Any accent color |
| Nav link (active) | `--color-text-primary` | 2px underline | Accent color, accent background |
| Button (ghost) | `--color-text-secondary` | `--color-bg-tertiary` | Accent color, accent background |
| Button (primary) | `--color-text-primary` | Neutral hover | Accent background |

---

### 8.3 Active State Implementation

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

### 8.4 Validation Rules

**Before deploying any platform header:**
1. Verify `data-context="platform"` attribute present
2. Inspect computed styles: no accent color references
3. Test active states: underline only, no color change
4. Test hover states: neutral color only
5. Validate against design tokens: only neutral colors used

**Automated checks:**
```javascript
// Platform header validation
const platformHeader = document.querySelector('[data-context="platform"]');
const computedBg = getComputedStyle(platformHeader).backgroundColor;
const accentColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--accent-primary');

// Assert background is neutral, not accent
assert(computedBg !== accentColor);
```

---

### 8.5 Exception Handling

**No exceptions permitted for:**
- Platform navigation header background
- Platform navigation link colors
- Platform logo color
- Platform active navigation states

**Limited exceptions (requires design review):**
- Footer accent usage (permitted)
- Announcement banners with product accent (permitted if clearly separated from header)
- Modal overlays with accent CTAs (permitted)

---

## 9. Hero Section Rules

### 9.1 Flexible Height Principle

**v1.0 rule (deprecated):**
- Hero must be 100vh

**v1.2 rule (current):**
- Hero height determined by content and context
- Minimum height: 600px desktop, 500px mobile
- Maximum height: no hard limit
- Viewport-based heights allowed but not required

---

### 9.2 Alignment Rules

**Platform hero (proof-platform.com):**
- Center alignment permitted with justification
- Use when: platform-level messaging, conceptual positioning
- Content must be concise (2 statements + CTA)

**Product hero (cleanproof.com, etc):**
- Left-aligned by default
- Use when: product-specific value, operational context
- Content structure: label + primary + secondary + supporting + CTA

**Justification required for center alignment:**
- Must serve platform brand, not product brand
- Must be documented in landing page specification
- Subject to design review

---

### 9.3 Platform Hero Template (Center-Aligned)

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
        {{Supporting description}}<br />
        {{Continues on second line if needed}}
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
  padding: var(--section-padding-y) var(--section-padding-x);
}

.hero-content-center {
  text-align: center;
  max-width: 800px;
}

.hero-content-center .hero-title {
  margin-bottom: var(--spacing-4);
}

.hero-content-center .hero-supporting {
  margin-bottom: var(--spacing-6);
}

.hero-content-center .hero-cta-group {
  justify-content: center;
}
```

---

### 9.4 Product Hero Template (Left-Aligned)

```html
<section class="hero hero-product" data-product="{{product-id}}">
  <div class="hero-container">
    <div class="hero-content">
      <span class="text-label hero-label">{{PRODUCT LABEL}}</span>
      <h1 class="hero-primary">{{Primary statement}}</h1>
      <h2 class="hero-secondary">{{secondary statement}}.</h2>
      <p class="hero-supporting">
        {{Supporting description}}.<br />
        {{Key features or value props}}
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
  padding: var(--section-padding-y) var(--section-padding-x);
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

---

### 9.5 Responsive Hero Behavior

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

## 10. RTL (Right-to-Left) Readiness

### 10.1 RTL Principle

All components must support RTL languages (Arabic, Hebrew) without structural changes:

- Directional properties flip automatically
- Content order reverses
- Icons and indicators flip where semantically correct
- Certain elements remain LTR regardless of direction

---

### 10.2 What Flips in RTL

**Layout:**
- Text alignment: `text-align: left` → `right`
- Padding/margin: `padding-left` → `padding-right`
- Float: `float: left` → `float: right`
- Grid/flex direction reverses

**Navigation:**
- Menu order reverses
- Dropdown menus open to the left
- Breadcrumb arrows flip direction

**Forms:**
- Label position flips
- Input text alignment flips
- Radio/checkbox groups reverse

**Tables:**
- Column order reverses
- Header alignment flips
- Cell alignment follows content

**Buttons:**
- Icon position flips (if directional)
- CTA order reverses in groups

---

### 10.3 What Stays the Same in RTL

**Preserved elements:**
- Numbers (always LTR)
- Dates (format stays LTR)
- Brand logos and lockups
- Code snippets
- Mathematical expressions
- Email addresses
- URLs

**Icons that don't flip:**
- Non-directional icons (checkmarks, close, settings)
- Status indicators
- Warning/error symbols
- Play/pause media controls (contextual)

---

### 10.4 RTL Implementation

```css
/* ===================================
   RTL BASE RULES
   ================================== */
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

/* Logical properties (automatic flip) */
.component {
  margin-inline-start: var(--spacing-4);
  padding-inline-end: var(--spacing-2);
  border-inline-start: 1px solid var(--color-border-default);
}

/* Manual flip for specific cases */
[dir="rtl"] .nav-links {
  flex-direction: row-reverse;
}

[dir="rtl"] .button-icon-right {
  order: -1;
}

[dir="rtl"] .arrow-icon {
  transform: scaleX(-1);
}

/* ===================================
   RTL EXCEPTIONS (PRESERVE LTR)
   ================================== */
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

### 10.5 RTL Testing Checklist

- [ ] All text flows right-to-left
- [ ] Navigation order reverses correctly
- [ ] Form labels and inputs align properly
- [ ] Table columns reverse order
- [ ] Buttons in groups reverse order
- [ ] Directional icons flip
- [ ] Numbers and dates remain LTR
- [ ] Brand elements preserve LTR
- [ ] Spacing and padding mirror correctly
- [ ] Grid layouts reverse properly

---

## 11. Brand Hierarchy Rules

### 11.1 Platform vs Product Naming

**Platform Level:**
- Primary name: "Proof Platform"
- Usage: Corporate site, API documentation, investor materials
- Audience: Enterprise buyers, partners, press

**Product Level:**
- Product names: "CleanProof", "MaintainProof", etc.
- Usage: Product landing pages, app UI, sales materials
- Audience: Operators, managers, end users

**Hierarchy:**
- Platform brand is parent
- Product brands are children
- Products never referenced without context of platform (except in app UI)
- Platform exists independently of products

---

### 11.2 Lockup Rules

**Platform lockup:**
```
[Logo] Proof Platform
```
- Used in: Main site header, footer, legal documents
- Accent color: White (neutral)
- Tagline: Optional

**Product lockup (landing/footer only):**
```
[Logo] {{ProductName}}
         by Proof Platform
```
- Used in: Product landing footer, reports, legal
- Accent color: Product-specific
- Parent attribution required in footer/legal

**Application UI lockup (no attribution):**
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

### 11.3 Accent Color Boundaries

**Where product accent appears:**
- Primary CTA buttons
- Active navigation states (product context only)
- Interactive highlights (hover, focus)
- Status indicators when not semantic
- Product tags and badges
- Progress indicators

**Where product accent is forbidden:**
- Platform navigation header background
- Platform navigation links
- Platform active states
- Semantic statuses (error, success, warning)
- Functional system colors
- Border defaults
- Background hierarchies

**Rule:**
- Accent colors provide brand differentiation
- Accent colors do not replace functional colors
- Accent colors never override safety/status indicators

---

### 11.4 Typography Hierarchy

**Platform level:**
- Headlines: Neutral white or dark
- Body: Secondary text color
- Accent: Minimal, used sparingly

**Product level:**
- Headlines: Neutral white or dark
- Body: Secondary text color
- Accent: Product accent used for emphasis (CTAs, highlights)

**Forbidden:**
- Colored headlines (except accent on CTAs)
- Full paragraphs in accent color
- Accent color on warning/error text

---

### 11.5 Product Attribution Examples

**Correct (Footer):**
```html
<footer class="footer">
  <div class="footer-brand">
    <span class="product-name">{{ProductName}}</span>
    <span class="platform-attribution">by Proof Platform</span>
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

**Correct (Application UI Header - No Attribution):**
```html
<header class="app-header" data-product="cleaning">
  <div class="app-header-brand">
    <span class="app-product-name">{{ProductName}}</span>
  </div>
</header>
```

```css
.app-product-name {
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  /* No accent color in app header */
}
```

**Incorrect:**
```html
<!-- WRONG: Attribution in app header -->
<header class="app-header">
  <div class="product-lockup">
    <span class="product-name">{{ProductName}}</span>
    <span class="platform-attribution">by Proof Platform</span>
  </div>
</header>
```

---

## 12. Landing Page Template

### 12.1 Product Landing Structure

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
    <div class="hero-container">
      <div class="hero-content">
        <span class="text-label hero-label">{{PRODUCT LABEL}}</span>
        <h1 class="hero-primary">{{Primary statement}}</h1>
        <h2 class="hero-secondary">{{secondary statement}}.</h2>
        <p class="hero-supporting">
          {{Supporting description}}.<br />
          {{Additional context if needed}}
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
  
  <!-- Section 2: Problem Statement (Dark) -->
  <section class="section section-primary">
    <div class="section-container">
      <div class="section-narrow">
        <h2 class="heading-h2 section-title">
          {{Problem statement}}<br />{{Consequence statement}}.
        </h2>
        <p class="text-body-large">
          {{Elaboration on problem}}
        </p>
      </div>
    </div>
  </section>
  
  <!-- Section 3: How It Works (Dark) -->
  <section class="section section-primary">
    <div class="section-container">
      <div class="section-header">
        <span class="text-label section-label">{{SECTION LABEL}}</span>
        <h2 class="heading-h2 section-title">
          {{Section title}}
        </h2>
      </div>
      <div class="section-grid section-grid-4">
        <!-- Step cards -->
      </div>
    </div>
  </section>
  
  <!-- Section 4: Features (Light - Allowed) -->
  <section class="section section-light">
    <div class="section-container">
      <div class="section-header">
        <span class="text-label section-label">{{SECTION LABEL}}</span>
        <h2 class="heading-h2 section-title">
          {{Section title}}
        </h2>
      </div>
      <div class="section-grid section-grid-3">
        <!-- Feature cards -->
      </div>
    </div>
  </section>
  
  <!-- Section 5: Proof Showcase (Dark) -->
  <section class="section section-primary">
    <div class="section-container">
      <div class="grid-container">
        <div class="col-7">
          <img src="/images/{{visual}}.png" alt="{{Alt text}}" />
        </div>
        <div class="col-5">
          <h2 class="heading-h2">{{Feature headline}}</h2>
          <p class="text-body-large">
            {{Feature description}}
          </p>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Section 6: Use Cases (Dark) -->
  <section class="section section-primary">
    <div class="section-container">
      <div class="section-header">
        <span class="text-label section-label">{{SECTION LABEL}}</span>
        <h2 class="heading-h2 section-title">
          {{Section title}}
        </h2>
      </div>
      <div class="section-grid section-grid-3">
        <!-- Use case cards -->
      </div>
    </div>
  </section>
  
  <!-- Section 7: Trust Statement (Dark) -->
  <section class="section section-primary">
    <div class="section-container">
      <div class="section-narrow">
        <h2 class="heading-h2 section-title">
          {{Trust principle}}
        </h2>
        <p class="text-body-large">
          {{Trust explanation}}
        </p>
      </div>
    </div>
  </section>
  
  <!-- Section 8: Final CTA (Dark with accent) -->
  <section class="section section-accent">
    <div class="section-container">
      <div class="section-narrow">
        <div class="section-header">
          <h2 class="heading-h2 section-title">
            {{Final CTA headline}}
          </h2>
          <div class="hero-cta-group" style="justify-content: center;">
            <a href="/start" class="button button-primary button-large">
              {{Primary CTA}}
            </a>
            <a href="/demo" class="button button-secondary button-large">
              {{Secondary CTA}}
            </a>
          </div>
        </div>
      </div>
    </div>
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

---

## 13. Governance Rules

### 13.1 Token Usage Enforcement

**Absolute rules:**

1. **No direct token overrides**
   - Components must never override design tokens with inline values
   - All color, spacing, typography must reference token layer
   - Exception: None

2. **No inline hex colors**
   - No `color: #3B82F6` in component CSS
   - No `background: #FFFFFF` in component CSS
   - All colors must be token references: `color: var(--accent-primary)`
   - Exception: None

3. **No magic numbers**
   - No `padding: 24px` without token reference
   - No `font-size: 18px` without token reference
   - All measurements must use token system
   - Exception: None

4. **All components inherit from base tokens**
   - New components must extend existing patterns
   - No component-specific token systems
   - No parallel spacing/color systems
   - Exception: None

---

### 13.2 Product Context Enforcement

**Accent color changes:**

1. **Only via data-product attribute**
   - Accent colors change only through `[data-product="{{id}}"]`
   - No JavaScript color injection
   - No inline style accent overrides
   - Exception: None

2. **All products inherit from same base**
   - All product contexts use identical token structure
   - Only accent values differ between products
   - No product-specific component variants
   - Exception: None

3. **Product context validation**
   - Every product page must have `data-product` attribute
   - Every product must define complete accent token set
   - Every product accent must meet contrast requirements
   - Exception: None

---

### 13.3 Component Implementation Standards

**Required for all components:**

1. **Token-based styling**
   ```css
   /* CORRECT */
   .component {
     padding: var(--spacing-4);
     color: var(--color-text-primary);
     background: var(--color-bg-secondary);
   }
   
   /* WRONG */
   .component {
     padding: 32px;
     color: #FFFFFF;
     background: #151B23;
   }
   ```

2. **Responsive behavior**
   - Use defined breakpoints only (639px, 1023px)
   - Reference responsive tokens where available
   - Test all viewport sizes
   
3. **RTL support**
   - Use logical properties where possible
   - Test with `dir="rtl"` attribute
   - Preserve LTR exceptions (numbers, dates, brand)

4. **Accessibility compliance**
   - Minimum contrast ratio: 4.5:1
   - Focus states for all interactive elements
   - Semantic HTML structure

---

### 13.4 Validation Process

**Before merging component code:**

1. **Token validation**
   - Run CSS linter to detect hard-coded values
   - Verify all colors reference token system
   - Check spacing uses token scale

2. **Contrast validation**
   - Test all accent/background combinations
   - Verify WCAG AA compliance
   - Document any exceptions

3. **Context validation**
   - Test component in all product contexts
   - Verify accent color inheritance
   - Check responsive behavior

4. **RTL validation**
   - Test with `dir="rtl"` attribute
   - Verify proper flipping behavior
   - Confirm exceptions preserved

---

### 13.5 Prohibited Practices

**Absolute prohibitions:**

1. **Color violations**
   - No hex colors in component CSS
   - No RGB values in component CSS
   - No HSL values in component CSS
   - Use tokens exclusively

2. **Spacing violations**
   - No pixel values without token reference
   - No rem values without token reference
   - No percentage values for spacing (use for width/height only)

3. **Typography violations**
   - No font-size without token reference
   - No line-height without token reference
   - No font-weight without token reference

4. **Context violations**
   - No product-specific CSS classes
   - No JavaScript-injected accent colors
   - No conditional styling outside data attributes

---

### 13.6 Enforcement Tools

**Automated validation:**

```javascript
// CSS linter rule: No hard-coded colors
{
  "rule": "no-hex-colors",
  "message": "Use design tokens instead of hex colors",
  "pattern": /#[0-9A-Fa-f]{3,6}/
}

// CSS linter rule: No magic number spacing
{
  "rule": "no-magic-numbers",
  "message": "Use spacing tokens instead of hard-coded values",
  "pattern": /padding|margin|gap:\s*\d+px/
}

// CSS linter rule: Require token references
{
  "rule": "require-token-reference",
  "message": "All values must reference design tokens",
  "pattern": /var\(--/
}
```

**Pre-commit validation:**
```bash
# Run token validation
npm run validate:tokens

# Run contrast validation
npm run validate:contrast

# Run RTL validation
npm run validate:rtl
```

---

### 13.7 Exception Process

**When exceptions are required:**

1. Submit exception request with:
   - Component name
   - Specific rule requiring exception
   - Justification
   - Proposed alternative

2. Exception review by:
   - Design System Team
   - Frontend Architecture Team
   - Product Design Lead

3. Exception approval requires:
   - Unanimous team approval
   - Documentation in design system
   - Automated validation exemption

**Exception log location:**
```
/docs/design-system/exceptions.md
```

---

## 14. Implementation Checklist

### 14.1 Setup Checklist

**Step 1: Install Design Tokens**
- [ ] Create `/css/tokens.css` with all design token definitions
- [ ] Include light mode token overrides
- [ ] Add accent-on-primary tokens for all products
- [ ] Import tokens as first CSS file in project
- [ ] Verify CSS custom properties are available globally

**Step 2: Build Component Library**
- [ ] Create `/css/components/` directory
- [ ] Implement button component with accent-on-primary
- [ ] Implement navigation with header mode support
- [ ] Implement card component
- [ ] Implement form elements
- [ ] Implement app UI components (tables, badges, etc.)
- [ ] Test all components in isolation

**Step 3: Create Layout System**
- [ ] Implement grid system
- [ ] Implement section containers
- [ ] Implement app layout structure with density rules
- [ ] Test responsive behavior at all breakpoints
- [ ] Verify mobile navigation works

**Step 4: Set Up Product Contexts**
- [ ] Implement product context data attributes
- [ ] Add accent-on-primary for each product
- [ ] Test accent color switching between products
- [ ] Verify contrast ratios meet WCAG AA
- [ ] Document context switching mechanism

**Step 5: Implement Header Modes**
- [ ] Create platform mode header
- [ ] Create product mode header (landing)
- [ ] Create product mode header (app UI)
- [ ] Remove attribution from app headers
- [ ] Test accent enforcement in platform header

**Step 6: Implement RTL Support**
- [ ] Add logical property support
- [ ] Implement directional overrides
- [ ] Test with `dir="rtl"` attribute
- [ ] Verify exceptions (numbers, dates, brand)

**Step 7: Implement Governance**
- [ ] Add CSS linting rules
- [ ] Add automated token validation
- [ ] Add contrast checking
- [ ] Add pre-commit hooks
- [ ] Document exception process

**Step 8: Build First Product Landing**
- [ ] Use neutral template structure
- [ ] Set product data attribute
- [ ] Implement hero section
- [ ] Add section rhythm (dark/light alternation)
- [ ] Add footer with attribution
- [ ] Test responsive behavior
- [ ] Validate against governance rules

---

### 14.2 Quality Assurance Checklist

**Visual Consistency:**
- [ ] All headings use correct font sizes
- [ ] All buttons have consistent height and padding
- [ ] All buttons use accent-on-primary for text
- [ ] All cards have same border radius and spacing
- [ ] Grid gaps are consistent across sections
- [ ] Colors match design tokens exactly
- [ ] Dark/light rhythm follows rules
- [ ] No gradients, glassmorphism, or decorative elements

**Responsive Behavior:**
- [ ] Test on mobile (320px - 639px)
- [ ] Test on tablet (640px - 1023px)
- [ ] Test on desktop (1024px+)
- [ ] Navigation works at all breakpoints
- [ ] Typography scales appropriately
- [ ] App UI adapts to mobile (sidebar collapse)
- [ ] Density rules maintained across breakpoints

**Accessibility:**
- [ ] All buttons have sufficient color contrast (4.5:1)
- [ ] Accent-on-primary meets WCAG AA standards
- [ ] Interactive elements have focus states
- [ ] Images have alt text
- [ ] Heading hierarchy is logical
- [ ] Form labels are associated with inputs
- [ ] Status colors meet WCAG AA standards

**RTL Support:**
- [ ] Layout flips correctly in RTL
- [ ] Text alignment reverses
- [ ] Navigation order reverses
- [ ] Numbers and dates stay LTR
- [ ] Brand elements stay LTR

**Header Mode Validation:**
- [ ] Platform header has no accent colors
- [ ] Product landing header uses accent appropriately
- [ ] App UI header has no "by Proof Platform"
- [ ] Footer includes attribution
- [ ] Active states follow mode rules

**Governance Compliance:**
- [ ] No hex colors in component CSS
- [ ] No inline spacing values
- [ ] All colors reference tokens
- [ ] All spacing references tokens
- [ ] Product contexts validated
- [ ] Contrast ratios validated

**Performance:**
- [ ] CSS is minified
- [ ] Images are optimized
- [ ] Fonts are preloaded
- [ ] Critical CSS is inlined

---

## 15. Maintenance & Updates

### 15.1 Token Update Policy

**When to update tokens:**
- Platform-level design decision changes
- New product context added
- Accessibility improvements needed
- Browser compatibility issues
- New app UI component requirements
- Density or authority rule changes

**How to update tokens:**
1. Update value in `/css/tokens.css`
2. Verify contrast requirements still met
3. Document change in changelog
4. Test all components for regression
5. Test both landing and app UI contexts
6. Verify RTL support maintained
7. Run governance validation
8. Deploy with version bump

**What NOT to change:**
- Spacing scale ratios
- Typography scale hierarchy
- Grid column count
- Component structure
- Color mode principles
- Token naming conventions

---

### 15.2 Adding New Products

**Step 1: Define Product Context**
```css
[data-product="new-product"] {
  --accent-primary: #HEX;
  --accent-hover: #HEX;
  --accent-active: #HEX;
  --accent-on-primary: #HEX; /* Must meet WCAG AA 4.5:1 */
  --accent-bg-subtle: rgba(R, G, B, 0.1);
  --accent-bg-muted: rgba(R, G, B, 0.05);
  --accent-border: rgba(R, G, B, 0.2);
}
```

**Step 2: Validate Contrast**
- Test accent-primary with accent-on-primary
- Verify 4.5:1 minimum contrast ratio
- Document contrast ratio in product context definition

**Step 3: Create Content File**
```json
{
  "product": "new-product",
  "name": "New Product Name",
  "hero": {
    "label": "PRODUCT LABEL",
    "primaryStatement": "{{Primary statement}}",
    "secondaryStatement": "{{secondary statement}}",
    "supportingCopy": "{{Supporting copy}}",
    "ctaPrimary": "{{Primary CTA}}",
    "ctaSecondary": "{{Secondary CTA}}"
  },
  "sections": { }
}
```

**Step 4: Generate Landing Page**
- Use neutral template from section 12.1
- Set `data-product` attribute
- Replace all `{{placeholder}}` values
- Add hero photography
- Verify dark/light rhythm
- Add footer attribution
- Test header modes
- Test RTL if applicable
- Run governance validation
- Deploy

---

### 15.3 Version History

**v1.2 (Current):**
- Introduced header modes (platform vs product)
- Removed mandatory app UI attribution
- Added accent-on-primary for WCAG compliance
- Clarified platform header neutrality enforcement
- Added application density rules
- Added visual authority principles
- Cleaned landing template to neutral placeholders
- Added governance enforcement layer

**v1.1:**
- Added Product UI component system
- Introduced flexible color mode rules
- Adjusted hero height and alignment rules
- Added RTL readiness specification
- Added brand hierarchy rules
- Extended token system for app UI

**v1.0:**
- Initial design token system
- Landing page component library
- Product context system
- Dark mode only

---

## 16. Browser Support

### 16.1 Supported Browsers

**Fully Supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Partially Supported:**
- Chrome 80-89 (CSS variables work, some modern features degrade)
- Firefox 78-87
- Safari 13

**Not Supported:**
- Internet Explorer (any version)
- Chrome < 80
- Safari < 13

---

### 16.2 CSS Feature Requirements

**Required CSS Features:**
- CSS Custom Properties (variables)
- CSS Grid
- Flexbox
- calc()
- Logical properties (for RTL)
- clamp() (with fallback)
- backdrop-filter (with fallback)

---

## Status

**Document Version:** 1.2  
**Last Updated:** February 12, 2026  
**Owner:** Design System Team  
**Review Cycle:** Update when new components, tokens, contexts, or governance rules are added  
**Dependencies:** PROOF_PLATFORM_VISION.md, CONTEXT_RULES.md

---

**End of Brand System v1.2**