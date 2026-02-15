# MAINTENANCE PROOF PARITY PLAN

**Version:** 1.1
**Created:** 2026-02-15
**Last Updated:** 2026-02-15
**Status:** ACTIVE

This document defines the strict plan to bring Maintenance Context v1 to **proof parity** with Cleaning Context.

---

## 1. Purpose and Non-Goals

### Purpose

Bring Maintenance v1 to full **proof parity** with Cleaning — meaning maintenance visits use the **same proof primitives** (checklists, photos, completion enforcement, SLA, PDF reports) that already exist in the platform.

### Non-Goals (Explicit)

This plan does **NOT** include:

- Reactive ticket workflows (dispatch, incident intake) — **NOT IN SCOPE**
- Recurring scheduling — **NOT IN SCOPE**
- SLA tiers or custom SLA rules — **NOT IN SCOPE**
- Warranty/contract tracking — **NOT IN SCOPE**
- Parts/materials tracking — **NOT IN SCOPE**
- Priority/severity system — **NOT IN SCOPE**
- Any new proof engine or alternative lifecycle — **FORBIDDEN**

> **Maintenance v1 is an execution verification layer, not a ticketing or reactive service dispatch system.**

---

## 2. Definition of "Proof Parity"

Maintenance visits MUST support these capabilities using **existing platform primitives**:

- **Checklist execution** — Manager assigns template, technician completes items (same `JobChecklistItem` model)
- **Evidence layer** — Before/after photos attached to visit (same `JobPhoto` model)
- **Completion enforcement** — Cannot complete without required proof (same Job validation rules)
- **SLA interpretation** — Same `compute_sla_status_and_reasons_for_job()` helper, same display
- **Immutability** — Completed visits are read-only (same rules as completed Jobs)
- **Force-complete** — Same endpoint, same `completed_unverified` status
- **PDF reports** — Visit Detail PDF uses same report pipeline as Job PDF
- **Audit trail** — All events logged via `JobCheckEvent`

If Cleaning can do it, Maintenance can do it — **using the same code**.

---

## 3. Work Packages

### P1: Checklist Parity — DONE

**Goal:** Maintenance visits support checklists end-to-end.

**Status:** COMPLETE

**Backend (verified working):**
- `ChecklistTemplate` available via `/api/manager/meta/` endpoint
- `JobChecklistItem` snapshot created on visit creation (via Job.save())
- Technician toggle endpoint `/api/jobs/{id}/checklist/{item_id}/toggle/` works for maintenance jobs
- Bulk update endpoint `/api/jobs/{id}/checklist/bulk/` available

**Frontend (implemented):**
- `CreateVisit.tsx`: checklist_template selector with preview
- `VisitDetail.tsx`: checklist display with progress bar, toggle for technicians
- `api/maintenance.ts`: `listChecklistTemplates()`, `toggleChecklistItem()`, `bulkUpdateChecklist()`

**Seed Script:**
- `apps/locations/management/commands/seed_maintenance_checklists.py` — 5 maintenance templates

**Acceptance Criteria:**
- [x] Manager can select checklist template when creating maintenance visit
- [x] Visit Detail shows checklist items with completion status
- [x] Technician can toggle checklist items during visit (in_progress only)
- [x] Checklist state persists and appears in Visit Detail after completion

---

### P2: Evidence/Photos Parity

**Goal:** Before/after photos work for maintenance visits.

**Backend (already works):**
- `JobPhoto` model works for any Job regardless of context
- Photo upload endpoints accept job_id

**Frontend:**
- Visit Detail: display photos grid (before/after sections)
- Link to Job Detail for full photo viewer (or inline viewer)

**Acceptance Criteria:**
- [ ] Technician can upload before/after photos during maintenance visit
- [ ] Visit Detail page displays uploaded photos
- [ ] Photos appear in Visit PDF report (P5)

---

### P3: Completion Enforcement Parity — DONE

**Goal:** Maintenance visits enforce proof requirements.

**Status:** COMPLETE

**Backend (implemented):**
- Job completion validation checks:
  - Check-in required (status must be in_progress)
  - Required checklist items completed
  - Required photos uploaded (before + after)
- Error format: `{code: "JOB_COMPLETION_BLOCKED", message: "...", fields: {...}}`
- Standardized error format (platform invariant)

**Frontend (implemented):**
- `CompletionBlockersPanel` component for proactive display
- `buildCompletionBlockers()` helper with human-readable messages
- `ApiErrorPanel` for rendering standardized API errors
- All in `src/contexts/maintenance/` (no Cleaning changes)

**Acceptance Criteria:**
- [x] Technician cannot complete visit without check-in (returns 400)
- [x] Technician cannot complete if required checklist items incomplete (returns 400)
- [x] Error messages follow platform format `{code, message, fields}`
- [x] UI displays actionable error when completion blocked

---

### P4: SLA UI Parity — DONE

**Goal:** SLA status displayed correctly for maintenance visits.

**Status:** COMPLETE

**Backend (already works):**
- `compute_sla_status_and_reasons_for_job()` works for any Job
- Returns `sla_status` + `sla_reasons[]`

**Frontend (implemented):**
- Visit Detail: SLA & Proof section with status badge, reasons, timing summary
- Visit Detail: Human-readable SLA reason labels (same as Cleaning)
- Visit List: SLA column with indicator (✓/⚠️)
- Header: SLA badge already present

**Acceptance Criteria:**
- [x] Visit Detail shows SLA status badge (green OK / red Violated)
- [x] Visit Detail shows SLA violation reasons (human-readable)
- [x] Visit List shows SLA indicator column

---

### P5: Visit PDF Report

**Goal:** Single-visit PDF report works for maintenance.

**Backend (reuse existing):**
- `/api/manager/jobs/{id}/report/pdf/` works for maintenance jobs
- Same template, same styling

**Frontend:**
- Visit Detail: "Download PDF" button
- Visit Detail: "Email PDF" button (optional)

**Acceptance Criteria:**
- [ ] PDF download works from Visit Detail page
- [ ] PDF includes: visit info, checklist, photos, SLA status, audit trail
- [ ] PDF uses existing Job PDF template (no new template)

---

### P6: Asset History + Export

**Goal:** Asset service history with PDF export.

**Backend:**
- `/api/manager/assets/{id}/visits/` already returns visit list
- Add PDF export endpoint: `/api/manager/assets/{id}/history/pdf/`

**Frontend:**
- Asset Detail: service history list (already done)
- Asset Detail: "Export PDF" button

**Acceptance Criteria:**
- [ ] Asset Detail shows service history (list of visits) — DONE
- [ ] Asset Detail has "Export PDF" button
- [ ] PDF includes: asset info, visit list with dates/status/technician

---

## 4. Acceptance Checklist (Overall)

Before Maintenance Proof Parity is considered complete:

### Proof Features
- [x] Checklist execution works end-to-end (P1) — DONE 2026-02-15
- [x] Photo upload/display works (P2) — DONE 2026-02-15
- [x] Completion enforcement verified (P3) — DONE 2026-02-15
- [x] SLA display works in Visit Detail (P4) — DONE 2026-02-15
- [ ] Visit PDF download works (P5)
- [ ] Asset history PDF export works (P6)

### Regression Safety
- [ ] `verify_roles.sh` passes (17/17)
- [ ] Cleaning context unaffected (Jobs, History, Planning work)
- [ ] Context isolation verified (maintenance ≠ cleaning views)
- [ ] No Platform Layer changes
- [ ] No new lifecycle states
- [ ] No new roles

### Documentation
- [ ] PROJECT_STATE.md updated with final status
- [ ] MAINTENANCE_CONTEXT_V1_SCOPE.md verification checklist complete

---

## 5. Regression Safety Rules

Every change MUST:

1. **Keep `verify_roles.sh` passing** — Run before/after each PR
2. **Keep Cleaning UI unchanged** — No modifications to `/jobs`, `/planning`, `/history`
3. **Keep Platform Layer locked** — No new roles, no lifecycle changes, no billing changes
4. **Use existing primitives** — No new photo model, no new checklist model, no new SLA engine

---

## 6. Files to Touch (Guide)

### Backend (likely no changes needed)

| File | Notes |
|------|-------|
| `apps/jobs/models.py` | Job model already has all fields |
| `apps/api/views.py` | Job endpoints work for maintenance context |
| `apps/api/views_maintenance.py` | May need PDF export for asset history |
| `apps/reports/job_report.py` | Reuse for Visit PDF (already works) |

### Frontend

| File | Package | Notes |
|------|---------|-------|
| `CreateVisit.tsx` | P1 | Add checklist_template selector |
| `VisitDetail.tsx` | P1, P2, P4, P5 | Checklist display, photos grid, SLA badges, PDF buttons |
| `AssetDetail.tsx` | P6 | Add PDF export button |
| `api/maintenance.ts` | P5, P6 | Add PDF endpoint calls |

### Tests

| File | Notes |
|------|-------|
| `test_context_isolation.py` | Already exists, keep passing |
| `verify_roles.sh` | Run after every change |

---

## 7. Priority Order

1. ~~**P1: Checklist Parity** — Core proof feature~~ DONE
2. **P4: SLA UI Parity** — Quick win, mostly display
3. **P5: Visit PDF Report** — Backend exists, need button
4. **P2: Evidence/Photos Parity** — Core proof feature
5. **P3: Completion Enforcement** — Verify existing behavior
6. **P6: Asset History PDF** — Nice-to-have

---

## 8. Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Proof parity features implemented | 6/6 (100%) | 4/6 (67%) |
| `verify_roles.sh` passing | 17/17 | TBD |
| Cleaning regression | 0 broken features | 0 |
| New Platform Layer changes | 0 | 0 |

---

## 9. Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.4 | 2026-02-15 | P4 SLA UI Parity marked DONE: SLA column in Visit List, SLA & Proof section in VisitDetail, human-readable reason labels |
| 1.3 | 2026-02-15 | P3 Completion Enforcement marked DONE: standardized error format, ApiErrorPanel, CompletionBlockersPanel, human-readable field mapping |
| 1.2 | 2026-02-15 | P2 Evidence/Photos marked DONE: photos grid in VisitDetail, before/after sections |
| 1.1 | 2026-02-15 | P1 Checklist Parity marked DONE: CreateVisit selector, VisitDetail display/toggle, API functions, seed script |
| 1.0 | 2026-02-15 | Initial plan document |

---

**END OF DOCUMENT**
