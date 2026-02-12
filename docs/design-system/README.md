# Proof Platform Design System v1.3

**Current Version:** 1.3.2
**Last Updated:** 2026-02-12
**Status:** Production-ready

---

## What This Is

This folder contains the **Proof Platform Brand System v1.3**, the complete design specification for all Proof Platform products:

- **CleanProof** (cleaning services)
- **MaintainProof** (maintenance services)
- **PropertyProof** (property management)
- **FitOutProof** (fit-out & construction)

The design system defines:
- Design tokens (colors, typography, spacing, shadows)
- Component specifications for app UI and landing pages
- Brand hierarchy and product accent rules
- Governance and validation policies

---

## How to Use These Docs

The v1.3 design system is organized into **10 focused documents** instead of a single monolithic file:

### Document Map

| File | Contents |
|------|----------|
| **[01_TOKENS.md](./01_TOKENS.md)** | All design tokens: colors, typography, spacing, borders, shadows, animation |
| **[02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md)** | Reserved semantic colors, product accents, dark-first rules, accent containment |
| **[03_LAYOUT_AND_DENSITY.md](./03_LAYOUT_AND_DENSITY.md)** | Grid system, app layout structure, density rules, landing vs app separation |
| **[04_COMPONENTS_APP_UI.md](./04_COMPONENTS_APP_UI.md)** | App UI components: tables, badges, KPI cards, charts, forms, empty states |
| **[05_COMPONENTS_LANDING.md](./05_COMPONENTS_LANDING.md)** | Landing page components: hero sections, buttons, navigation, cards, templates |
| **[06_BRAND_HIERARCHY_AND_PRODUCTS.md](./06_BRAND_HIERARCHY_AND_PRODUCTS.md)** | Platform vs product branding, header modes, multi-product context, product suite |
| **[07_RTL_RULES.md](./07_RTL_RULES.md)** | Right-to-left language support rules for Arabic/Hebrew |
| **[08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md)** | Governance policies, validation rules, implementation checklist, maintenance |
| **[09_APP_MARKETING_NAVIGATION.md](./09_APP_MARKETING_NAVIGATION.md)** | Navigation bridge between app UI and marketing website, account dropdown, trial banners |
| **[10_PLATFORM_SHELL_LAYOUT.md](./10_PLATFORM_SHELL_LAYOUT.md)** | Platform shell structure, header with product switcher, sidebar integration, accent rules |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and change log |

---

## Sources of Truth

**For implementation:**
1. Start with [01_TOKENS.md](./01_TOKENS.md) for design tokens
2. Check [02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md) for product accent rules
3. Refer to [04_COMPONENTS_APP_UI.md](./04_COMPONENTS_APP_UI.md) or [05_COMPONENTS_LANDING.md](./05_COMPONENTS_LANDING.md) for component specs
4. Validate against [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md)

**For product branding:**
- See [06_BRAND_HIERARCHY_AND_PRODUCTS.md](./06_BRAND_HIERARCHY_AND_PRODUCTS.md) for platform vs product rules
- See [02_COLOR_AND_THEMING.md](./02_COLOR_AND_THEMING.md) for accent color definitions

**For RTL support:**
- See [07_RTL_RULES.md](./07_RTL_RULES.md) for implementation guidance

**For app-to-marketing navigation:**
- See [09_APP_MARKETING_NAVIGATION.md](./09_APP_MARKETING_NAVIGATION.md) for navigation patterns between app UI and marketing website

**For platform shell:**
- See [10_PLATFORM_SHELL_LAYOUT.md](./10_PLATFORM_SHELL_LAYOUT.md) for header structure, product switcher, sidebar integration, and accent rules

---

## How to Propose Changes

**Design system changes follow this process:**

1. **Identify the issue**
   - What rule is missing or incorrect?
   - Which document needs updating?

2. **Check governance rules**
   - Review [08_GOVERNANCE_AND_VALIDATION.md](./08_GOVERNANCE_AND_VALIDATION.md)
   - Verify change doesn't violate core principles

3. **Submit proposal**
   - Document proposed change
   - Include justification and impact analysis
   - Specify which files need updates

4. **Review approval**
   - Design System Team
   - Frontend Architecture Team
   - Product Design Lead

5. **Update documentation**
   - Update relevant files
   - Add entry to [CHANGELOG.md](./CHANGELOG.md)
   - Increment version if needed

---

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for complete version history.

**Current version (v1.3.2):**
- Platform Shell Layout specification (10_PLATFORM_SHELL_LAYOUT.md)
- Product Switcher component with 4 products
- Fixed account dropdown navigation (no 404 errors)
- Improved dropdown structure (Account / Support sections)
- Settings placeholder pages (/settings/account, /settings/billing)

**Previous version (v1.3.1):**
- App-to-Marketing Navigation Pattern (09_APP_MARKETING_NAVIGATION.md)
- Architectural principle for layer separation
- Account dropdown specification
- Trial and billing banner patterns
- Governance rules for navigation stability

**Previous version (v1.3):**
- Reserved semantic colors to prevent product accent collisions
- Fixed cleaning and property accent colors
- Landing token namespace separation
- Multi-product context management
- Enhanced governance and validation rules

---

## Dependencies

- **PROOF_PLATFORM_VISION.md** - Platform vision and principles
- **CONTEXT_RULES.md** - Context governance rules

---

## Contact

**Owner:** Design System Team
**Review Cycle:** Update when new components, tokens, contexts, or governance rules are added
