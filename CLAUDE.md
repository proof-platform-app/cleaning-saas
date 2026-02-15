# Claude Code Project Instructions

## Project: Proof Platform (CleanProof + MaintainProof)

This is a multi-context SaaS platform with two operational products:
- **CleanProof** (Cleaning) — Production-stable, LOCKED
- **MaintainProof** (Maintenance) — Under development

---

## CRITICAL: Product Boundary Lock

**Before ANY code change, verify you are not touching Cleaning code.**

---

## LOCKED FILES — DO NOT MODIFY

### Frontend (Cleaning) — LOCKED

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
src/components/planning/**
src/components/analytics/**
src/api/planning.ts
src/api/analytics.ts
src/hooks/useUserRole.ts
```

### Global Styles — LOCKED

```
src/index.css
tailwind.config.ts
```

### Backend (Cleaning) — LOCKED

```
backend/apps/jobs/**
backend/apps/api/views_manager_jobs.py
backend/apps/api/analytics_views.py
backend/apps/api/views_reports.py
backend/apps/api/views_cleaner.py
```

### Shared Components — LOCKED

```
src/components/ui/**
src/lib/**
```

---

## ALLOWED FILES — Maintenance Development Zone

### Frontend (Maintenance) — OK to modify

```
src/pages/maintenance/**
src/contexts/maintenance/**
src/api/maintenance.ts
src/config/contexts/maintenance.ts
```

### Backend (Maintenance) — OK to modify

```
backend/apps/maintenance/**
backend/apps/api/views_maintenance.py
```

---

## MANDATORY RULES

### Rule 1: STOP Before Touching Locked Files

If a task requires editing any locked file:

1. **STOP** immediately
2. **Request explicit confirmation** from the user
3. **Explain** why the change is necessary
4. **Wait** for approval before proceeding

**Never assume approval. Always ask.**

### Rule 2: No Refactoring Shared Code

- Do NOT refactor shared components "for improvement"
- Do NOT rename variables in shared modules
- Do NOT add "helpful" type annotations to locked files
- Do NOT fix "code smells" in Cleaning code

**If it works, don't touch it.**

### Rule 3: No Improving Unrelated Modules

- Do NOT add comments to files you didn't need to change
- Do NOT fix imports in unrelated files
- Do NOT update dependencies unless explicitly asked
- Do NOT "clean up" code outside the task scope

**Stay focused on the task. Nothing else.**

### Rule 4: Clone, Don't Modify

If shared logic is needed for Maintenance:

| Wrong | Right |
|-------|-------|
| Modify `ChecklistSelector.tsx` | Create `MaintenanceChecklistSelector.tsx` |
| Add params to `planning.ts` | Create new function in `maintenance.ts` |
| Edit shared hook | Create `useMaintenanceX.ts` |

### Rule 5: No Global CSS

- Never add styles to `src/index.css`
- Never modify `tailwind.config.ts` for Maintenance
- Use component-level Tailwind classes only
- Scope Maintenance styles with wrapper classes

---

## VERIFICATION CHECKLIST

Before completing ANY Maintenance task:

- [ ] No files under `src/pages/` (except `maintenance/`) were edited
- [ ] No files under `src/components/planning/` were edited
- [ ] No files under `src/components/analytics/` were edited
- [ ] `src/index.css` was NOT modified
- [ ] `src/api/planning.ts` was NOT modified
- [ ] `npm run build` passes without errors
- [ ] Cleaning `/planning` page still renders correctly
- [ ] Cleaning checklist UI still works

**If ANY check fails — rollback and fix before proceeding.**

---

## WHEN IN DOUBT

1. **Ask the user** — don't guess
2. **Read the docs** — `docs/execution/PRODUCT_BOUNDARY_LOCK.md`
3. **Check git diff** — verify only allowed files changed
4. **Test Cleaning** — always verify it still works

---

## KEY DOCUMENTATION

| Document | Purpose |
|----------|---------|
| `docs/execution/PRODUCT_BOUNDARY_LOCK.md` | Full code isolation rules |
| `docs/execution/CONTEXT_ISOLATION_LOCK.md` | Navigation isolation |
| `docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md` | Maintenance feature scope |
| `docs/execution/MAINTENANCE_PROOF_PARITY_PLAN.md` | Current work plan |

---

## FINAL REMINDER

> **Maintenance evolves. Cleaning stays frozen.**

Every Cleaning regression is a critical bug.

**When in doubt — STOP and ASK.**
