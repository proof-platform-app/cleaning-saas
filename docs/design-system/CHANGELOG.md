# Design System Changelog

## v1.3 — 2026-02-12

**Documentation Refactor:**
- Split monolithic v1.3 document into 8 focused files for maintainability
- No design changes; content reorganization only

**Design Changes from v1.2:**
- **Reserved Semantic Colors**: Established forbidden color list to prevent product accent collisions with functional status colors
  - Success `#10B981`, Error `#EF4444`, Warning `#F59E0B`, Info `#3B82F6` are permanently reserved
- **Product Accent Corrections**: Fixed cleaning and property accents to avoid collision with info and warning colors
  - Cleaning: `#3B82F6` → `#2563EB` (distinct blue)
  - Property: `#F59E0B` → `#D97706` (distinct amber)
- **Removed Future Products**: Removed security, logistics, environmental, emergency from documentation
  - Only 4 real products remain: cleaning, maintenance, property, fitout
- **Landing Token Namespace**: Renamed all landing spacing tokens to `--landing-*` prefix to prevent leakage into app UI
  - `--section-padding-y` → `--landing-section-padding-y`
  - `--section-padding-x` → `--landing-section-padding-x`
  - `--section-gap` → `--landing-section-gap`
- **Governance Self-Violation Fix**: Added `--color-error-hover` token to replace raw hex in button-danger component
- **Accent Containment Clarity**: Added explicit table defining where accent is allowed vs forbidden
  - Accent forbidden for ALL status badges and semantic workflow states
  - Accent allowed for primary CTA, interactive focus/hover, informational tags
- **Multi-Product Context Management**: Added section for product switching and multi-product access patterns
  - Product switcher must be platform-neutral
  - Active product context set via `data-product` on body
- **Enforcement Rules**: Added validation for semantic color collisions and landing token usage in app UI

---

## v1.2 — 2026-02-12

**Major Changes:**
- **Header Modes**: Introduced platform mode vs product mode
  - Removed mandatory "by Proof Platform" attribution from application UI headers
- **Accent Contrast Fix**: Added `--accent-on-primary` token to ensure WCAG AA compliance for all accent colors
- **Platform Header Neutrality**: Clarified enforcement rules for accent-free platform navigation
- **Application Density Rules**: Added enterprise UI density specifications to prevent marketing-style spacing leaks
- **Visual Authority Principles**: Defined forbidden visual treatments for enterprise operational contexts
  - No gradients, glassmorphism, startup pastels, decorative illustrations
- **Template Cleanup**: Replaced product-specific examples with neutral structural placeholders
- **Governance Layer**: Added enforcement rules for token usage, component inheritance, and implementation standards

---

## v1.1

**Major Changes:**
- Added Product UI component system (app dashboard components)
- Introduced flexible color mode rules (dark-first with controlled light sections)
- Adjusted hero height and alignment rules (removed 100vh requirement)
- Added RTL readiness specification
- Added brand hierarchy rules
- Extended token system for app UI

---

## v1.0

**Initial Release:**
- Initial design token system
- Landing page component library
- Product context system
- Dark mode only
