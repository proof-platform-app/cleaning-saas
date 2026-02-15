# MAINTENANCE V1 RELEASE LOCK

**Version:** 1.0
**Status:** 🔒 LOCKED
**Lock Date:** 2026-02-15
**Lock Authority:** Platform Team

---

## Purpose

This document establishes the **baseline** for Maintenance Context V1.

V1 is now **frozen**. All further development is **additive only**.

---

## What Is In V1 (BASELINE)

### Backend Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/manager/assets/` | Asset list + create |
| `GET/PATCH/DELETE /api/manager/assets/:id/` | Asset detail |
| `GET /api/manager/assets/:id/visits/` | Asset service history |
| `GET /api/maintenance/assets/:id/history/report/` | Asset history PDF |
| `GET/POST /api/manager/asset-types/` | Asset type list + create |
| `GET/PATCH/DELETE /api/manager/asset-types/:id/` | Asset type detail |
| `GET/POST /api/manager/maintenance-categories/` | Category list + create |
| `GET/PATCH/DELETE /api/manager/maintenance-categories/:id/` | Category detail |
| `GET /api/manager/service-visits/` | Visit list (with `sla_status`) |
| `POST /api/manager/service-visits/` | Create visit |
| `GET /api/maintenance/visits/:id/report/` | Visit PDF report |

### Frontend Pages
| Route | Component |
|-------|-----------|
| `/maintenance/dashboard` | Dashboard with 4 KPI widgets |
| `/maintenance/visits` | Visit list with filters + SLA column |
| `/maintenance/visits/new` | Create visit form |
| `/maintenance/visits/:id` | Visit detail (checklist, photos, SLA, PDF) |
| `/maintenance/assets` | Assets list with CRUD |
| `/maintenance/assets/:id` | Asset detail with history + PDF export |
| `/maintenance/asset-types` | Asset types CRUD |

### Proof Parity Features
| Code | Feature | Implementation |
|------|---------|----------------|
| P1 | Checklist execution | Template selector + toggle items |
| P2 | Evidence photos | Before/after grid display |
| P3 | Completion enforcement | CompletionBlockersPanel + API errors |
| P4 | SLA UI | Visit List column + VisitDetail badges |
| P5 | Visit PDF | `generate_maintenance_visit_report_pdf()` |
| P6 | Asset History PDF | `generate_asset_history_report_pdf()` |

### RBAC Rules
| Role | Access Level |
|------|--------------|
| Owner | Full CRUD |
| Manager | Full CRUD |
| Staff | Read-only |
| Cleaner | 403 Forbidden (except checklist toggle for assigned visits) |

---

## What Is NOT In V1 (EXPLICIT EXCLUSIONS)

These are **NOT BUGS**. They are **intentionally excluded**:

- ❌ Technicians page (planned for Stage 2)
- ❌ Analytics / Reports page (planned for Stage 2)
- ❌ Reactive ticket workflows
- ❌ Recurring scheduling
- ❌ SLA tiers / custom SLA rules
- ❌ Warranty / contract tracking
- ❌ Parts / materials tracking
- ❌ Priority / severity system
- ❌ Asset health scoring
- ❌ Preventive maintenance schedules
- ❌ IoT integration

---

## What Cannot Be Changed (LOCKED)

### Platform Layer Invariants
- **Job lifecycle states** — `scheduled → in_progress → completed / completed_unverified`
- **Role definitions** — owner, manager, staff, cleaner
- **RBAC matrix** — no new permissions
- **SLA computation logic** — `compute_sla_status_and_reasons_for_job()`
- **Checklist model** — `JobChecklistItem` snapshots
- **Photo model** — `JobPhoto` with EXIF

### Maintenance-Specific Locks
- **Context field** — `Job.context` values: `cleaning`, `maintenance`
- **PDF color scheme** — `MAINTENANCE_COLORS` (neutral gray)
- **Terminology** — "Technician" (not "Cleaner") in maintenance UI/PDF
- **Asset History RBAC** — cleaners get 403 on PDF export

### API Contract Locks
- **Error format** — `{code: string, message: string, fields?: object}`
- **SLA response** — `{sla_status: "ok"|"violated", sla_reasons: string[]}`
- **Visit list** — must include `sla_status` field

---

## What Counts As Regression

A change is a **regression** if it:

1. **Breaks Cleaning context** — Any change to Jobs, History, Planning, Reports that affects existing cleaning workflows

2. **Breaks verify_roles.sh** — Currently 18/18 tests must pass

3. **Modifies locked components** — Any change to items listed in "What Cannot Be Changed"

4. **Removes V1 features** — Any removal of features listed in "What Is In V1"

5. **Changes API contracts** — Any breaking change to response shapes without versioning

6. **Adds new lifecycle states** — Platform Layer is locked

7. **Adds new roles** — RBAC matrix is locked

---

## Verification Checklist

Before any Maintenance-related PR:

```bash
# 1. RBAC smoke test
./verify_roles.sh  # Must pass 18/18

# 2. Context isolation
python manage.py test apps.jobs.tests.test_context_isolation

# 3. Cleaning context sanity
# - Create cleaning job
# - Complete via mobile app
# - Download PDF
# - Verify no regressions

# 4. Maintenance context sanity
# - Create maintenance visit with checklist
# - View in VisitDetail
# - Download Visit PDF
# - Download Asset History PDF
```

---

## Future Development Rules

All post-V1 development MUST:

1. **Be additive** — New features only, no modifications to V1 baseline
2. **Maintain isolation** — Maintenance changes never affect Cleaning
3. **Pass regression tests** — verify_roles.sh + context isolation tests
4. **Follow roadmap** — Stage 2 before Stage 3, etc.
5. **Document scope** — Every PR must reference which Stage it belongs to

---

## Change Control

To modify this document or V1 baseline:

1. Raise issue with justification
2. Get Platform Team approval
3. Update this document with change log
4. Update PROJECT_STATE.md

---

## References

- `docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md`
- `docs/execution/MAINTENANCE_PROOF_PARITY_PLAN.md`
- `docs/product/MAINTENANCE_PRODUCT_ROADMAP.md`
- `docs/execution/PROJECT_STATE.md`

---

**END OF DOCUMENT**
