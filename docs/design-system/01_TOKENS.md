# Design Tokens

**Version:** 1.3
**Last Updated:** 2026-02-12

---

## Token Philosophy

Design tokens are the single source of truth for all design values in Proof Platform. Every color, spacing value, font size, and animation timing must be defined as a token.

**Core Principles:**
1. **No magic numbers**: All values must reference tokens
2. **No inline hex colors**: All colors must use CSS custom properties
3. **Namespace separation**: Landing, app, and product tokens are clearly separated
4. **Inheritance hierarchy**: Product contexts inherit from base, override accent only

---

## Token Namespaces

Proof Platform uses **four token namespaces**:

| Namespace | Prefix | Purpose | Example |
|-----------|--------|---------|---------|
| **Core** | `--color-*`, `--spacing-*`, `--font-*` | Platform-wide foundational tokens | `--color-text-primary` |
| **App UI** | `--app-*` | Application dashboard specific | `--app-content-padding` |
| **Landing** | `--landing-*` | Marketing landing pages specific | `--landing-section-padding-y` |
| **Product** | `--accent-*` | Product-specific accent overrides | `--accent-primary` |

**Critical Rule:** Landing tokens (`--landing-*`) are **forbidden** in app UI. App tokens (`--app-*`) are **forbidden** in landing pages.

---

## 1. Color Tokens

### 1.1 Background System - Dark Mode (Default)

```css
:root {
  --color-bg-primary: #0A0E14;
  --color-bg-secondary: #151B23;
  --color-bg-tertiary: #1E262F;
  --color-bg-elevated: #242D38;
}
```

### 1.2 Background System - Light Mode

Used for controlled light sections only.

```css
:root {
  --color-bg-light-primary: #FFFFFF;
  --color-bg-light-secondary: #F9FAFB;
  --color-bg-light-tertiary: #F3F4F6;
  --color-bg-light-elevated: #FFFFFF;
}
```

### 1.3 Text System - Dark Mode (Default)

```css
:root {
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A0AEC0;
  --color-text-tertiary: #64748B;
  --color-text-disabled: #475569;
}
```

### 1.4 Text System - Light Mode

```css
:root {
  --color-text-light-primary: #0A0E14;
  --color-text-light-secondary: #475569;
  --color-text-light-tertiary: #64748B;
  --color-text-light-disabled: #94A3B8;
}
```

### 1.5 Border & Divider System - Dark Mode

```css
:root {
  --color-border-default: #2D3748;
  --color-border-subtle: #1E293B;
  --color-border-strong: #475569;
}
```

### 1.6 Border & Divider System - Light Mode

```css
:root {
  --color-border-light-default: #E2E8F0;
  --color-border-light-subtle: #F1F5F9;
  --color-border-light-strong: #CBD5E1;
}
```

### 1.7 Functional Colors (Mode-Independent)

**RESERVED:** These colors may NOT be used as product accents. See [02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md) for details.

```css
:root {
  /* Success */
  --color-success: #10B981;
  --color-success-bg: rgba(16, 185, 129, 0.1);
  --color-success-border: rgba(16, 185, 129, 0.2);

  /* Warning */
  --color-warning: #F59E0B;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-warning-border: rgba(245, 158, 11, 0.2);

  /* Error */
  --color-error: #EF4444;
  --color-error-bg: rgba(239, 68, 68, 0.1);
  --color-error-border: rgba(239, 68, 68, 0.2);
  --color-error-hover: #DC2626;

  /* Info */
  --color-info: #3B82F6;
  --color-info-bg: rgba(59, 130, 246, 0.1);
  --color-info-border: rgba(59, 130, 246, 0.2);
}
```

### 1.8 Status Colors (App UI)

```css
:root {
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
}
```

### 1.9 Accent Colors (Product-Specific)

Injected per product context. See [02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md) for product-specific values.

```css
:root {
  /* Default: Platform neutral */
  --accent-primary: #FFFFFF;
  --accent-hover: #F9FAFB;
  --accent-active: #E5E7EB;
  --accent-on-primary: #000000;
  --accent-bg-subtle: rgba(255, 255, 255, 0.1);
  --accent-bg-muted: rgba(255, 255, 255, 0.05);
  --accent-border: rgba(255, 255, 255, 0.2);
}
```

---

## 2. Typography Tokens

### 2.1 Font Family

```css
:root {
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont,
                         'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
                         sans-serif;
  --font-family-mono: 'SF Mono', 'Monaco', 'Inconsolata',
                      'Fira Code', monospace;
}
```

### 2.2 Font Sizes - Landing

```css
:root {
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
}
```

### 2.3 Font Sizes - App UI

```css
:root {
  --font-size-app-title: 1.5rem;   /* 24px - page titles */
  --font-size-app-heading: 1.125rem;/* 18px - section headings */
  --font-size-app-body: 0.875rem;  /* 14px - table/form text */
  --font-size-app-caption: 0.75rem;/* 12px - helpers/metadata */
  --font-size-app-label: 0.6875rem;/* 11px - badges/tags */
}
```

### 2.4 Line Heights - Landing

```css
:root {
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
}
```

### 2.5 Line Heights - App UI

```css
:root {
  --line-height-app-title: 2rem;   /* 32px */
  --line-height-app-heading: 1.75rem;/* 28px */
  --line-height-app-body: 1.25rem; /* 20px */
  --line-height-app-caption: 1rem; /* 16px */
  --line-height-app-label: 1rem;   /* 16px */
}
```

### 2.6 Font Weights

```css
:root {
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-black: 900;
}
```

### 2.7 Letter Spacing

```css
:root {
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.025em;
  --letter-spacing-wider: 0.05em;
  --letter-spacing-widest: 0.1em;
}
```

### 2.8 Responsive Typography

```css
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

## 3. Spacing Tokens

### 3.1 Base Spacing Unit

```css
:root {
  --spacing-unit: 0.5rem;          /* 8px */
}
```

### 3.2 Spacing Scale (8px base)

```css
:root {
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
}
```

### 3.3 Landing Page Spacing

**Prefixed to prevent app UI leakage.**

```css
:root {
  --landing-section-padding-y: 7.5rem;     /* 120px desktop */
  --landing-section-padding-x: 2rem;       /* 32px */
  --landing-section-gap: 5rem;             /* 80px */
}
```

**Responsive:**
```css
@media (max-width: 1023px) {
  :root {
    --landing-section-padding-y: 5rem;     /* 80px */
    --landing-section-gap: 3rem;           /* 48px */
  }
}

@media (max-width: 639px) {
  :root {
    --landing-section-padding-y: 3rem;     /* 48px */
    --landing-section-padding-x: 1rem;     /* 16px */
    --landing-section-gap: 2rem;           /* 32px */
  }
}
```

### 3.4 Component Spacing - Landing

```css
:root {
  --card-padding: 2rem;            /* 32px */
  --card-gap: 1.5rem;              /* 24px */
  --button-padding-x: 2rem;        /* 32px */
  --button-padding-y: 0.875rem;    /* 14px */
  --input-padding-x: 1rem;         /* 16px */
  --input-padding-y: 0.75rem;      /* 12px */
}
```

**Responsive:**
```css
@media (max-width: 639px) {
  :root {
    --card-padding: 1.5rem;        /* 24px */
  }
}
```

### 3.5 App UI Spacing

**Separate namespace from landing.**

```css
:root {
  --app-header-height: 4rem;       /* 64px */
  --app-sidebar-width: 16rem;      /* 256px */
  --app-content-padding: 2rem;     /* 32px */
  --app-card-padding: 1.5rem;      /* 24px */
  --app-table-cell-padding-x: 1rem;/* 16px */
  --app-table-cell-padding-y: 0.75rem;/* 12px */
  --app-form-gap: 1.5rem;          /* 24px */
  --app-section-gap: 2rem;         /* 32px */
}
```

**Responsive:**
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

## 4. Border & Shadow Tokens

### 4.1 Border Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;            /* 4px */
  --radius-default: 0.5rem;        /* 8px */
  --radius-md: 0.75rem;            /* 12px */
  --radius-lg: 1rem;               /* 16px */
  --radius-xl: 1.5rem;             /* 24px */
  --radius-full: 9999px;
}
```

### 4.2 Border Width

```css
:root {
  --border-width-default: 1px;
  --border-width-thick: 2px;
  --border-width-thicker: 3px;
}
```

### 4.3 Shadows

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-default: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
                    0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
               0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
               0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
               0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

### 4.4 Backdrop Blur

```css
:root {
  --backdrop-blur-sm: blur(4px);
  --backdrop-blur-default: blur(8px);
  --backdrop-blur-md: blur(12px);
  --backdrop-blur-lg: blur(16px);
}
```

---

## 5. Animation Tokens

### 5.1 Duration

```css
:root {
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-default: 300ms;
  --duration-slow: 500ms;
}
```

### 5.2 Easing

```css
:root {
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-in-out: cubic-bezier(0.4, 0, 0.6, 1);
}
```

---

## Token Usage Rules

### DO

```css
/* CORRECT: Use tokens */
.component {
  padding: var(--spacing-4);
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  font-size: var(--font-size-app-body);
  border-radius: var(--radius-default);
}
```

### DON'T

```css
/* WRONG: Hard-coded values */
.component {
  padding: 32px;
  color: #FFFFFF;
  background: #151B23;
  font-size: 14px;
  border-radius: 8px;
}
```

### Namespace Violation

```css
/* WRONG: Landing tokens in app UI */
.app-dashboard {
  padding: var(--landing-section-padding-y); /* FORBIDDEN */
}

/* WRONG: App tokens in landing pages */
.hero-section {
  padding: var(--app-content-padding); /* FORBIDDEN */
}
```

---

## Token Validation

Before deploying:
1. Run CSS linter to detect hard-coded values
2. Verify no `--landing-*` tokens used in app UI
3. Verify no `--app-*` tokens used in landing pages
4. Check all colors reference token system
5. Confirm spacing uses token scale

See [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md) for automated validation rules.
