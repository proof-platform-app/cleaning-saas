# MAINTENANCE CONTEXT — V2 STRATEGY

**Status:** IMPLEMENTED
**Version:** 2.0
**Created:** 2026-02-15
**Updated:** 2026-02-16
**Authority:** Platform Strategy

---

## 1. Purpose

This document defines the strategic evolution of Maintenance Context after V1 Release Lock.

Maintenance V1 is an execution verification layer.
V2 defines how Maintenance becomes a standalone operational product without breaking Platform invariants.

---

## 2. What Maintenance Is (Strategic Positioning)

Maintenance Context is:

- Asset-based service verification
- Technician-driven execution
- Proof-of-work enforcement
- Operational control tool for small-to-mid service companies

Maintenance is NOT:

- A reactive ticketing system
- A helpdesk platform
- A CMMS replacement
- A contract management suite
- An ERP system

---

## 3. Stage-Based Evolution

Maintenance evolves only through additive stages.

Each stage must:
- Preserve Platform Layer invariants
- Preserve Proof Engine integrity
- Pass full regression suite
- Update PROJECT_STATE and Release Lock documents

---

# STAGE 2 — Operational Expansion ✅ COMPLETED

**Goal:** Make Maintenance usable as daily operational tool.

### 2.1 Technician Layer

Add:

- Technician management page
- Technician performance metrics (basic counts only)
- Technician assignment view

Constraints:
- No new roles
- Technicians still use `role=cleaner`
- No workflow engine

---

### 2.2 Analytics Parity

Add:

- Maintenance-specific dashboard KPIs
- Visits completed
- Overdue visits
- SLA compliance rate
- Asset service frequency

Must reuse existing Analytics infrastructure.

No new analytics engine allowed.

---

### 2.3 Reports Expansion

Add:

- Visit summary report page
- Asset activity summary report
- Technician workload summary

PDF remains proof-based.

No financial analytics.

---

# STAGE 3 — Recurring Execution ✅ COMPLETED

**Commit:** `e39ca0c`

**Goal:** Introduce predictable maintenance cycles.

Add:

- RecurringVisitTemplate model
- Frequency rules (monthly, quarterly, yearly, custom interval)
- Batch generation via "Generate Visits" button
- GeneratedVisitLog for tracking

Constraints:

- No SLA timers yet
- No escalation workflows
- No reactive ticket creation
- No celery/cron (batch generation only)

Recurring engine generates normal Visits (Jobs with context=CONTEXT_MAINTENANCE).

---

# STAGE 4 — SLA & Priority Layer ✅ COMPLETED

**Commit:** `983649e`

Add:

- SLA deadline field on Job model
- Priority classification (Low / Medium / High)
- SLA badge system in UI
- SLA deadline countdown timer
- Priority indicator in visit list

Constraints:

- No escalation automation
- No background job engine
- No notification storm

SLA remains verification-based.

---

# STAGE 5 Lite — Contracts & Warranty ✅ COMPLETED

**Commit:** `e90ca3d`

**Note:** Implemented as "Lite" version without billing integration.

Add:

- ServiceContract model (service agreements tracking)
- Warranty fields on Asset (start_date, end_date, provider, notes, status)
- Contract-linked recurring templates
- Contracts management page
- Warranty display in Asset detail

Constraints:

- No billing integration (deferred)
- No payment provider integration
- Informational tracking only

---

# STAGE 6 — Notifications Layer ✅ COMPLETED

**Commit:** `006812e`

**Goal:** Enable proactive communication with technicians.

Add:

- MaintenanceNotificationLog model (audit trail)
- Email notification service (notifications.py)
- Manual notification via "Notify" dropdown button
- Notification types:
  - `visit_reminder` — Remind technician about upcoming visit
  - `sla_warning` — Alert about approaching SLA deadline
  - `assignment` — Notify about visit assignment
  - `completion` — Notify manager about completed visit

Constraints:

- No celery/cron (synchronous sending)
- No push notifications (email only)
- No notification preferences UI (all enabled by default)
- Uses existing Django email backend

---

## 4. Architectural Guardrails

Maintenance must never:

- Modify Platform Layer invariants
- Introduce new lifecycle states
- Replace Proof Engine
- Introduce alternative execution workflows
- Convert into ticket-driven dispatch system

---

## 5. Regression Protection

Every stage requires:

- verify_roles.sh PASS
- Context isolation validation
- Cleaning context unaffected
- Proof parity preserved
- Documentation updated

---

## 6. Definition of "Standalone Product"

Maintenance becomes standalone when:

- ✅ Has technician management
- ✅ Has analytics layer
- ✅ Has recurring scheduling
- ✅ Has SLA visibility
- ✅ Has report suite
- ✅ Has release lock document
- ✅ Has notifications layer

**MaintainProof is now a standalone product tier.**

---

## 7. Change Policy

Any Stage implementation requires:

1. Stage-specific plan document
2. Scope update
3. PROJECT_STATE update
4. Regression verification
5. Release Lock update

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-15 | Initial V2 Strategy |
| 2.0 | 2026-02-16 | Stages 3-6 implemented, status IMPLEMENTED |
