# Governance and Validation

**Version:** 1.3
**Last Updated:** 2026-02-12

---

## Design System Governance

### Source of Truth

**This design system is the single source of truth** for all UI implementation across:

- Proof Platform corporate site (proof-platform.com)
- Product landing pages (cleanproof.com, maintainproof.com, propertyproof.com, fitoutproof.com)
- Application UI (logged-in dashboards, data management)
- Marketing materials
- Generated reports

---

## Token Governance

### Core Token Rules

**DO:**
- Use design tokens exclusively (never raw values)
- Reference tokens via CSS custom properties
- Use token namespaces correctly (`--color-*`, `--spacing-*`, `--app-*`, `--landing-*`, `--accent-*`)
- Follow semantic naming conventions

**DON'T:**
- Use raw hex values in component styles
- Use inline styles with hard-coded values
- Override token values with `!important`
- Create local variables that duplicate token values

### Token Namespace Enforcement

```css
/* CORRECT: Using token namespaces properly */
.dashboard-card {
  padding: var(--app-card-padding);
  background: var(--color-bg-secondary);
  border: var(--border-width-default) solid var(--color-border-default);
}

.landing-hero {
  padding: var(--landing-section-padding-y) var(--landing-section-padding-x);
  background: var(--color-bg-primary);
}

/* WRONG: Mixing namespaces */
.dashboard-card {
  padding: var(--landing-section-padding-y); /* FORBIDDEN */
}

/* WRONG: Raw values */
.dashboard-card {
  padding: 24px; /* FORBIDDEN - use var(--app-card-padding) */
  background: #1A202C; /* FORBIDDEN - use var(--color-bg-secondary) */
}
```

---

## Color Governance

### Reserved Semantic Colors

These colors are **reserved for functional semantics** and MUST NOT be used as product accents:

| Color | Hex | Reserved For | Product Accent? |
|-------|-----|--------------|-----------------|
| Success | `#10B981` | Completed status, positive outcomes | ❌ FORBIDDEN |
| Error | `#EF4444` | Failed status, destructive actions | ❌ FORBIDDEN |
| Warning | `#F59E0B` | Flagged status, caution states | ❌ FORBIDDEN |
| Info | `#3B82F6` | Informational states, neutral highlights | ❌ FORBIDDEN |

**Enforcement:**
- Product accents must have minimum 30° hue separation from reserved colors
- Automated validation runs in CI/CD pipeline
- Pull requests with color violations are blocked

### Product Accent Validation

**Current approved product accents:**

| Product | Accent | Hex | Status |
|---------|--------|-----|--------|
| CleanProof | Blue | `#2563EB` | ✅ Valid |
| MaintainProof | Teal | `#14B8A6` | ✅ Valid |
| PropertyProof | Amber | `#D97706` | ✅ Valid |
| FitOutProof | Orange | `#F97316` | ✅ Valid |

**Adding new product accents:**
1. Check hue separation from reserved semantic colors (min 30°)
2. Check visual distinction from existing product accents
3. Validate WCAG AA contrast ratios for all accent token pairs
4. Update [02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md)
5. Update [06_BRAND_HIERARCHY_AND_PRODUCTS.md](./06_BRAND_HIERARCHY_AND_PRODUCTS.md)

---

## Accent Containment Validation

### Where Product Accents Are Allowed

**✅ Allowed:**
- Primary CTA buttons (`.button-primary`)
- Input focus states (`.form-input:focus`)
- Active navigation links (product context only)
- Product name in product landing header
- Interactive highlights (hover, selection)
- Non-status informational tags
- Progress indicators (non-status based)

**❌ Forbidden:**
- Platform header background
- Platform navigation links
- Status badges (must use semantic colors)
- Error/success/warning messages
- Functional system colors
- Workflow state indicators
- Default border colors
- Background hierarchies

### Validation Script

```javascript
// validate-accent-containment.js
const forbiddenAccentUsage = [
  { selector: '.status-badge', property: 'background', forbids: 'var(--accent-bg-subtle)' },
  { selector: '.status-badge', property: 'color', forbids: 'var(--accent-primary)' },
  { selector: '[data-context="platform"] .nav-header', property: 'background', forbids: 'var(--accent-primary)' },
  { selector: '[data-context="platform"] .nav-link', property: 'color', forbids: 'var(--accent-primary)' },
];

// Run validation on build
forbiddenAccentUsage.forEach(rule => {
  const elements = document.querySelectorAll(rule.selector);
  elements.forEach(el => {
    const value = getComputedStyle(el).getPropertyValue(rule.property);
    if (value.includes(rule.forbids)) {
      throw new Error(`Accent containment violation: ${rule.selector} uses ${rule.forbids} on ${rule.property}`);
    }
  });
});
```

---

## Layout Token Validation

### Landing vs App Separation

**Validation Rules:**

```javascript
// validate-layout-tokens.js
const appUISelectors = [
  '.dashboard-*',
  '.data-table',
  '.kpi-card',
  '.app-*',
  '[data-context="app"]'
];

const forbiddenInAppUI = [
  '--landing-section-padding-y',
  '--landing-section-padding-x',
  '--landing-section-gap'
];

// Fail build if app UI uses landing tokens
appUISelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    const styles = getComputedStyle(el);
    forbiddenInAppUI.forEach(token => {
      if (styles.getPropertyValue('--padding').includes(token) ||
          styles.getPropertyValue('--gap').includes(token)) {
        throw new Error(`Token leakage: ${selector} uses ${token} (forbidden in app UI)`);
      }
    });
  });
});
```

**Manual Checklist:**

Before deploying app UI:
- [ ] No `--landing-*` tokens in component styles
- [ ] All padding uses `--app-*` tokens
- [ ] Section gaps do not exceed 32px
- [ ] Table cells use `--app-table-cell-padding-*`
- [ ] Cards use `--app-card-padding`

Before deploying landing pages:
- [ ] No `--app-*` tokens in landing styles
- [ ] Sections use `--landing-section-padding-*`
- [ ] Section gaps use `--landing-section-gap`
- [ ] Hero sections have proper spacing (120px+)

---

## Typography Validation

### Font Size Constraints

**App UI:**
- Title: 24px (`--font-size-app-title`)
- Heading: 18px (`--font-size-app-heading`)
- Body: 14px (`--font-size-app-body`)
- Caption: 12px (`--font-size-app-caption`)
- Label: 13px (`--font-size-app-label`)

**Landing:**
- H1: 56px (`--font-size-h1`)
- H2: 40px (`--font-size-h2`)
- H3: 32px (`--font-size-h3`)
- Body: 18px (`--font-size-body`)

**Validation:**
```css
/* CORRECT: App UI using app typography */
.dashboard-title {
  font-size: var(--font-size-app-title);
}

/* WRONG: App UI using landing typography */
.dashboard-title {
  font-size: var(--font-size-h1); /* FORBIDDEN - 56px is too large */
}
```

---

## Accessibility Validation

### WCAG AA Compliance

**Minimum Contrast Ratios:**
- Normal text (< 18px): 4.5:1
- Large text (≥ 18px): 3:1
- UI components: 3:1

**Critical Pairs to Validate:**

```javascript
const contrastPairs = [
  // Text on backgrounds
  { foreground: '--color-text-primary', background: '--color-bg-primary', min: 4.5 },
  { foreground: '--color-text-secondary', background: '--color-bg-primary', min: 4.5 },
  { foreground: '--color-text-primary', background: '--color-bg-secondary', min: 4.5 },

  // Accent combinations
  { foreground: '--accent-on-primary', background: '--accent-primary', min: 4.5 },

  // Status colors
  { foreground: '--color-status-completed', background: '--color-status-completed-bg', min: 4.5 },
  { foreground: '--color-status-failed', background: '--color-status-failed-bg', min: 4.5 },
  { foreground: '--color-status-flagged', background: '--color-status-flagged-bg', min: 4.5 },
];

// Run contrast validation
contrastPairs.forEach(pair => {
  const ratio = calculateContrastRatio(pair.foreground, pair.background);
  if (ratio < pair.min) {
    throw new Error(`Contrast violation: ${pair.foreground} on ${pair.background} = ${ratio}:1 (required: ${pair.min}:1)`);
  }
});
```

### Keyboard Navigation

**Requirements:**
- All interactive elements must be keyboard accessible
- Focus states must be visible and use `--accent-primary`
- Tab order must follow visual hierarchy
- Skip links for main content

**Focus State Validation:**
```css
/* CORRECT: Visible focus state */
.button:focus {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* WRONG: Removed focus state */
.button:focus {
  outline: none; /* FORBIDDEN without alternative visual indicator */
}
```

---

## RTL Validation

### Flipping Verification

**Checklist:**
- [ ] Text alignment flips (left → right)
- [ ] Padding/margin flips (padding-left → padding-right)
- [ ] Float direction flips (float: left → float: right)
- [ ] Flex/grid direction reverses
- [ ] Navigation order reverses
- [ ] Breadcrumb arrows flip
- [ ] Directional icons flip (arrows, chevrons)

**Exceptions (Must Stay LTR):**
- [ ] Numbers remain LTR
- [ ] Dates remain LTR
- [ ] URLs remain LTR
- [ ] Email addresses remain LTR
- [ ] Brand logos remain LTR
- [ ] Code snippets remain LTR

### RTL Testing Script

```javascript
// test-rtl.js
describe('RTL Support', () => {
  beforeEach(() => {
    document.body.setAttribute('dir', 'rtl');
  });

  test('Text alignment flips', () => {
    const element = document.querySelector('.content');
    const textAlign = getComputedStyle(element).textAlign;
    expect(textAlign).toBe('right');
  });

  test('Navigation reverses', () => {
    const navLinks = document.querySelector('.nav-links');
    const flexDirection = getComputedStyle(navLinks).flexDirection;
    expect(flexDirection).toBe('row-reverse');
  });

  test('Numbers stay LTR', () => {
    const numeric = document.querySelector('.numeric');
    const direction = getComputedStyle(numeric).direction;
    expect(direction).toBe('ltr');
  });
});
```

---

## Component Validation

### Status Badge Validation

**Critical Rule:** Status badges must ONLY use semantic colors.

```javascript
// validate-status-badges.js
const statusBadges = document.querySelectorAll('.status-badge');

statusBadges.forEach(badge => {
  const bg = getComputedStyle(badge).backgroundColor;
  const color = getComputedStyle(badge).color;

  // Check if using accent colors (FORBIDDEN)
  if (bg.includes('var(--accent-') || color.includes('var(--accent-')) {
    throw new Error('Status badge using accent color (must use semantic colors only)');
  }

  // Verify using approved semantic colors
  const approvedBgTokens = [
    '--color-status-completed-bg',
    '--color-status-in-progress-bg',
    '--color-status-scheduled-bg',
    '--color-status-failed-bg',
    '--color-status-flagged-bg'
  ];

  const usesApprovedBg = approvedBgTokens.some(token =>
    getComputedStyle(badge).getPropertyValue('background-color').includes(token)
  );

  if (!usesApprovedBg) {
    throw new Error('Status badge not using approved semantic background color');
  }
});
```

### Button Validation

```javascript
// validate-buttons.js
const buttons = document.querySelectorAll('.button-primary');

buttons.forEach(button => {
  const bg = getComputedStyle(button).backgroundColor;
  const color = getComputedStyle(button).color;

  // Primary buttons must use accent
  if (!bg.includes('var(--accent-primary)')) {
    throw new Error('Primary button not using --accent-primary');
  }

  // Text must use --accent-on-primary for contrast
  if (!color.includes('var(--accent-on-primary)')) {
    throw new Error('Primary button not using --accent-on-primary for text');
  }
});
```

---

## CI/CD Integration

### Pre-commit Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running design system validation..."

# Token governance
node scripts/validate-tokens.js
if [ $? -ne 0 ]; then
  echo "❌ Token validation failed"
  exit 1
fi

# Accent containment
node scripts/validate-accent-containment.js
if [ $? -ne 0 ]; then
  echo "❌ Accent containment validation failed"
  exit 1
fi

# Layout token separation
node scripts/validate-layout-tokens.js
if [ $? -ne 0 ]; then
  echo "❌ Layout token validation failed"
  exit 1
fi

# Contrast ratios
node scripts/validate-contrast.js
if [ $? -ne 0 ]; then
  echo "❌ Contrast validation failed"
  exit 1
fi

echo "✅ All design system validations passed"
```

### GitHub Actions Workflow

```yaml
# .github/workflows/design-system-validation.yml
name: Design System Validation

on:
  pull_request:
    paths:
      - 'src/**/*.css'
      - 'src/**/*.tsx'
      - 'src/**/*.jsx'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Validate tokens
        run: npm run validate:tokens

      - name: Validate accent containment
        run: npm run validate:accent-containment

      - name: Validate layout tokens
        run: npm run validate:layout-tokens

      - name: Validate contrast ratios
        run: npm run validate:contrast

      - name: Validate RTL support
        run: npm run test:rtl
```

---

## Review Requirements

### Design System Changes

**Minor Changes** (e.g., adjusting spacing value by 4px):
- Requires 1 design system architect approval
- Update CHANGELOG.md with change
- Verify no breaking changes

**Major Changes** (e.g., adding new token namespace, changing color system):
- Requires 2 design system architect approvals
- Update CHANGELOG.md with migration guide
- Create migration script if needed
- Document breaking changes
- Notify all teams

**Breaking Changes:**
- Removing tokens
- Renaming tokens
- Changing token namespaces
- Changing semantic color mappings
- Changing product accent colors

### Implementation Reviews

**Frontend implementation reviews must verify:**
- [ ] Uses design tokens (no raw values)
- [ ] Correct token namespace (`--app-*` for app UI, `--landing-*` for landing)
- [ ] Semantic colors for status (not product accents)
- [ ] Accent only in approved locations
- [ ] WCAG AA contrast ratios
- [ ] RTL support where applicable
- [ ] Keyboard navigation support
- [ ] Responsive behavior

---

## Breaking Change Policy

### Deprecation Process

**Step 1: Deprecation Notice (v1.x)**
- Mark token as deprecated in documentation
- Add console warning in development
- Provide migration path

**Step 2: Migration Period (v1.x+1)**
- Token remains functional but deprecated
- Teams migrate to new token
- Track usage via telemetry

**Step 3: Removal (v2.0)**
- Remove deprecated token
- Update all references
- Release as major version

### Example Deprecation

```css
/* v1.3: Deprecation notice */
:root {
  --color-bg-old: #1A202C; /* DEPRECATED: Use --color-bg-primary instead */
  --color-bg-primary: #1A202C;
}

/* v1.4: Both work, console warning in dev */
/* v2.0: --color-bg-old removed */
```

---

## Validation Checklist

Before deploying any UI changes:

### Token Usage
- [ ] All styles use design tokens (no raw hex/px values)
- [ ] Correct namespace used (`--app-*`, `--landing-*`, `--accent-*`)
- [ ] No token value overrides with `!important`
- [ ] No duplicate local variables

### Color
- [ ] Status badges use semantic colors only (not accent)
- [ ] Product accent only in approved locations
- [ ] Platform header uses neutral colors
- [ ] Reserved semantic colors not used as product accents

### Layout
- [ ] App UI uses `--app-*` tokens (not `--landing-*`)
- [ ] Landing pages use `--landing-*` tokens (not `--app-*`)
- [ ] Spacing does not exceed density guidelines
- [ ] Responsive breakpoints handled correctly

### Accessibility
- [ ] WCAG AA contrast ratios met (4.5:1 minimum)
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Screen reader support

### RTL
- [ ] Text alignment flips correctly
- [ ] Directional elements reverse
- [ ] Numbers/dates/URLs stay LTR
- [ ] Icons flip where appropriate

### Testing
- [ ] Visual regression tests pass
- [ ] Automated token validation passes
- [ ] Manual QA in all product contexts
- [ ] Cross-browser testing complete

---

## Monitoring and Enforcement

### Runtime Validation

```javascript
// runtime-validation.js (development only)
if (process.env.NODE_ENV === 'development') {
  // Warn on raw values
  const styles = document.styleSheets;
  for (let sheet of styles) {
    for (let rule of sheet.cssRules) {
      const text = rule.cssText;
      if (text.match(/#[0-9A-Fa-f]{6}/) && !text.includes('url(')) {
        console.warn('Raw hex value detected:', text);
      }
      if (text.match(/\d+px/) && !text.includes('var(')) {
        console.warn('Raw px value detected:', text);
      }
    }
  }

  // Warn on accent in status badges
  const statusBadges = document.querySelectorAll('.status-badge');
  statusBadges.forEach(badge => {
    const bg = getComputedStyle(badge).backgroundColor;
    if (bg.includes('accent')) {
      console.error('Status badge using accent color (forbidden):', badge);
    }
  });
}
```

### Analytics

Track design system adoption:
- Token usage coverage (% of components using tokens)
- Validation failures per week
- Breaking change impact (components affected)
- Contrast ratio violations
- RTL compatibility score

---

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history and migration guides.

---

## Questions and Support

**Design System Issues:**
- File issue in GitHub with label `design-system`
- Tag `@design-system-architect` for review

**Implementation Questions:**
- Check [README.md](./README.md) for file navigation
- Review relevant section document (01-08)
- Consult with design system architect

**Reporting Violations:**
- Automated checks run in CI/CD
- Manual review required for edge cases
- Escalate to design system architect if unclear
