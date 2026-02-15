# MAINTENANCE CONTEXT — V2 STRATEGY

**Status:** PLANNED  
**Version:** 1.0  
**Created:** 2026-02-15  
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

# STAGE 2 — Operational Expansion

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

# STAGE 3 — Recurring Execution

**Goal:** Introduce predictable maintenance cycles.

Add:

- Recurring visit templates
- Frequency rules (monthly, quarterly, yearly)
- Auto-scheduling engine

Constraints:

- No SLA timers yet
- No escalation workflows
- No reactive ticket creation

Recurring engine must generate normal Visits (Jobs).

---

# STAGE 4 — SLA & Priority Layer

Add:

- SLA timers (visual only)
- Priority classification (Low / Medium / High)
- SLA badge system

Constraints:

- No escalation automation
- No background job engine
- No notification storm

SLA must remain verification-based.

---

# STAGE 5 — Contracts & Warranty (Future)

Add:

- Service contract model
- Warranty expiration tracking
- Contract-based recurring visits

Constraints:

- Billing integration required
- Payment provider integration must exist
- Separate release lock required

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

- Has technician management
- Has analytics layer
- Has recurring scheduling
- Has SLA visibility
- Has report suite
- Has release lock document

Only after Stage 4 is Maintenance considered independent product tier.

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
