# PRODUCT BOUNDARY LOCK

**Status:** ACTIVE
**Created:** 2026-02-15
**Owner:** Platform Team
**Applies to:** All AI agents (Claude, GPT, etc.)

---

## Purpose

This document defines strict product-level isolation rules between operational contexts inside the platform.

While `CONTEXT_ISOLATION_LOCK.md` protects navigation and routing, this document protects:

- Source code
- UI components
- Styles
- Backend modules
- Shared logic

**The goal is simple:**

> **Maintenance development must NEVER modify Cleaning product code.**

---

## Core Principle

Each operational context is treated as an **independent product**.

- **Cleaning** is production-stable and **LOCKED**.
- **Maintenance** is under active development.

**No cross-editing is allowed.**

---

## CLEANING PRODUCT — READ ONLY

The Cleaning product is **LOCKED**.

AI agents are **NOT allowed** to modify the following paths:

### Frontend (Cleaning — Locked)

```
src/pages/Dashboard.tsx
src/pages/Jobs.tsx
src/pages/JobPlanning.tsx
src/pages/JobDetails.tsx
src/pages/History.tsx
src/pages/Performance.tsx
src/pages/Analytics.tsx
src/pages/Reports.tsx
src/pages/Locations.tsx
src/pages/company/**
src/pages/settings/**
```

### Planning & Execution Layer

```
src/components/planning/**
src/components/analytics/**
src/api/planning.ts
src/api/analytics.ts
src/hooks/useUserRole.ts
```

### Global Styles (Locked)

```
src/index.css
tailwind.config.ts
```

> **No global CSS edits are allowed for Maintenance work.**

### Backend (Cleaning — Locked)

```
backend/apps/jobs/**
backend/apps/api/views_manager_jobs.py
backend/apps/api/analytics_views.py
backend/apps/api/views_reports.py
backend/apps/api/views_cleaner.py
```

> **Job lifecycle logic must not be altered.**
> - No new states.
> - No renaming.
> - No workflow changes.

---

## MAINTENANCE — ALLOWED DEVELOPMENT ZONE

Maintenance work is restricted to:

### Frontend (Maintenance — Allowed)

```
src/pages/maintenance/**
src/contexts/maintenance/**
src/api/maintenance.ts
src/config/contexts/maintenance.ts
```

New components must live inside:

```
src/contexts/maintenance/components/**
src/contexts/maintenance/ui/**
```

> **Do NOT modify shared components.**
> If shared logic is needed → **duplicate and namespace it**.

**Example:**

| Bad | Good |
|-----|------|
| Modify `ChecklistSelector.tsx` | Create `MaintenanceChecklistSelector.tsx` |

### Backend (Maintenance — Allowed)

```
backend/apps/maintenance/**
backend/apps/api/views_maintenance.py
```

Maintenance may extend Job model only via **existing fields**:

- `context`
- `asset` FK
- `maintenance_category` FK

> **No structural changes to core Job model allowed.**

---

## SHARED COMPONENT RULE

Shared components are **NOT to be modified**.

If a shared component must behave differently in Maintenance:

1. Clone it
2. Rename it with `Maintenance` prefix
3. Keep original untouched

**Example:**

```
MaintenanceChecklistSelector.tsx
MaintenanceVisitCard.tsx
MaintenanceAssetTable.tsx
```

---

## GLOBAL CSS PROTECTION

Global styling is **LOCKED**.

Maintenance styling must be:

- Scoped
- Context-wrapped
- Component-level only

**Example:**

| Allowed | Not allowed |
|---------|-------------|
| `<div className="maintenance-container">` | `body { ... }` |
| Component-level Tailwind | `.table { ... }` in global CSS |

---

## ABSOLUTE PROHIBITIONS

AI agents must **NEVER**:

- Modify Cleaning checklists
- Modify Planning drawer UI
- Modify Cleaning job creation flow
- Rename existing Cleaning menu labels
- Change existing API contracts
- Touch analytics behavior
- Modify existing CSS utility classes
- Refactor shared code "for improvement"

> **If a change affects Cleaning — STOP and request explicit approval.**

---

## Controlled Exceptions

**Platform invariants** (error format, deterministic payload structure) may modify LOCKED files only with:

1. **Explicit task definition** — documented scope and allowed files
2. **User approval** — explicit "I authorize this exception"
3. **No business logic changes** — only format/structure changes
4. **Full verification** — `python manage.py check` + `verify_roles.sh`

### Exception Log

| Date | Task | Files Modified | Scope |
|------|------|----------------|-------|
| 2026-02-15 | Standardize Job completion errors | `models.py`, `views_cleaner.py` | Error format only |

> **Exceptions do not establish precedent.** Each requires fresh approval.

---

## Verification Checklist (Mandatory Before Commit)

Before finishing any Maintenance task, the agent must verify:

- [ ] Cleaning planning page renders unchanged
- [ ] Cleaning checklist UI renders unchanged
- [ ] Cleaning job creation behaves unchanged
- [ ] No files under locked paths were edited
- [ ] No global CSS was modified
- [ ] No shared components were overwritten

> **If any of the above is violated — task is invalid.**

---

## Enforcement Rule

All AI agents must treat this file as a **SYSTEM-LEVEL instruction**.

**Violation of this document invalidates the task and requires rollback.**

---

## Relation to Other Locks

This document works together with:

| Document | Protection Level |
|----------|-----------------|
| `CONTEXT_ISOLATION_LOCK.md` | Navigation-level isolation |
| `MAINTENANCE_CONTEXT_V1_SCOPE.md` | Feature scope definition |
| `PRODUCT_BOUNDARY_LOCK.md` | Code-level isolation |

Together they form:

1. **Navigation isolation** — separate menus/routes
2. **Code isolation** — separate source files
3. **Scope isolation** — separate feature sets

---

## Change Policy

Any modification to this document requires:

1. Update version header
2. Explicit approval
3. Full regression verification

---

## Final Rule

> **Maintenance evolves.**
> **Cleaning remains stable.**

**Isolation is mandatory.**
**No exceptions.**

---

**END OF DOCUMENT**
