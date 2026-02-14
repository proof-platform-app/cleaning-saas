# MAINTENANCE CONTEXT — V1 SCOPE

**Status:** LOCKED
**Version:** 1.0.1
**Last Updated:** 2026-02-14

This document defines the strict scope for Maintenance Context v1 within Proof Platform. It establishes boundaries to protect Platform Layer and Proof Engine integrity.

---

## 1. Context Purpose

Maintenance Context v1 is an **operational context** of Proof Platform designed for:

- **Asset-based service visits** — tracking work performed on physical assets (HVAC, electrical, plumbing, elevators, IT infrastructure)
- **Small-to-mid service companies** — maintenance contractors, facilities management companies, technical service providers
- **Using existing Proof Engine lifecycle** — no new execution engine, no alternative workflows

### Core Principle

> **Maintenance v1 does NOT introduce a new execution engine.**

Maintenance Context applies the existing Proof Platform verification model to technical service work. It answers: *"Which service visits were actually performed, on which assets, and with what evidence?"*

This is a **proof-of-work layer**, not a CMMS, ticketing system, or asset management platform.

> **Maintenance v1 is an execution verification layer, not a ticketing or reactive service dispatch system.**
> It does not introduce incident intake, priority routing, escalation, or reactive ticket workflows.

---

## 2. Platform Invariants (Locked)

The following Platform Layer elements **remain unchanged** in Maintenance Context v1:

| Invariant | Status |
|-----------|--------|
| Roles: `owner` / `manager` / `staff` / `cleaner` | **LOCKED** |
| Lifecycle: `scheduled` → `in_progress` → `completed` | **LOCKED** |
| Trial / Paid logic | **LOCKED** |
| Billing semantics | **LOCKED** |
| Error format: `{code, message, fields?}` | **LOCKED** |
| Deterministic payload guarantees | **LOCKED** |
| RBAC matrix | **LOCKED** |
| Authentication (token-based) | **LOCKED** |

**Reference:** [PLATFORM_LAYER_V1_DEFINITION_OF_DONE.md](../architecture/PLATFORM_LAYER_V1_DEFINITION_OF_DONE.md)

### Explicit Prohibitions

Maintenance Context v1 **cannot**:

- Modify Platform Layer invariants
- Change RBAC matrix
- Introduce new roles
- Alter billing semantics
- Change authentication mechanisms
- Modify error response structure

---

## 3. Vocabulary Mapping

Maintenance Context uses domain-specific terminology while maintaining internal Platform consistency.

| Platform Term | Maintenance Term | Notes |
|---------------|------------------|-------|
| Job | Service Visit | Internally stored as `Job` model |
| Cleaner | Technician | Same `User` model with `role=cleaner` |
| Location | Location | Unchanged |
| — | Asset | New model (see Section 4) |
| Checklist | Maintenance Checklist | Same `ChecklistItem` model |
| Before/After Photos | Work Evidence | Same `JobPhoto` model |
| Check-in/Check-out | Site Arrival/Departure | Same `JobCheckEvent` model |

### Storage Note

> All Maintenance entities are stored using existing Platform models internally.
> The `Job` model represents a Service Visit.
> No separate "Visit" or "ServiceVisit" model is created.

---

## 4. Allowed Backend Additions (V1)

Maintenance Context v1 permits the following **additive** backend changes only:

### 4.1 New Models

| Model | Purpose | Fields |
|-------|---------|--------|
| `Asset` | Physical asset being serviced | `name`, `asset_type`, `location` (FK), `serial_number`, `description`, `company` (FK), `is_active` |
| `AssetType` | Asset classification | `name`, `company` (FK), `description` |
| `MaintenanceCategory` | Service category | `name`, `company` (FK), `description` |

### 4.2 Model Extensions

| Model | Addition | Notes |
|-------|----------|-------|
| `Job` | `asset` (nullable FK to Asset) | Optional link to serviced asset |
| `Job` | `maintenance_category` (nullable FK) | Optional service category |

### 4.3 Checklist Templates

- Maintenance-specific checklist templates
- Stored using existing `ChecklistTemplate` / `ChecklistItem` models
- No structural changes to checklist system

### 4.4 Explicit Restrictions

| Restriction | Rationale |
|-------------|-----------|
| No new lifecycle states | Proof Engine integrity |
| No new Job model | Platform Layer protection |
| No new roles | RBAC matrix locked |
| No separate maintenance engine | Single execution model |
| No alternative workflows | Lifecycle invariant |

---

## 5. Frontend Pages (V1)

### 5.1 Assets

| Page | Route | Purpose |
|------|-------|---------|
| Asset List | `/maintenance/assets` | View all company assets |
| Create Asset | `/maintenance/assets/new` | Add new asset |
| Edit Asset | `/maintenance/assets/:id/edit` | Modify asset details |
| Asset Detail | `/maintenance/assets/:id` | View asset + service history |

### 5.2 Service Visits

| Page | Route | Purpose |
|------|-------|---------|
| Visit List | `/maintenance/visits` | View service visits (filtered) |
| Create Visit | `/maintenance/visits/new` | Schedule new service visit |
| Visit Detail | `/maintenance/visits/:id` | View visit details + evidence |

**Note:** Visit pages reuse existing Job infrastructure with maintenance-specific UI.

### 5.3 Dashboard (Maintenance Mode)

| Section | Content |
|---------|---------|
| Visits Today | Count + list of today's scheduled visits |
| Upcoming Visits | Next 7 days scheduled visits |
| Overdue Visits | Visits past scheduled date, not completed |
| Asset Summary | Simple counts: total assets, assets serviced this month |

### Dashboard Restrictions

- No analytics expansion beyond existing analytics engine
- No new chart types
- No custom KPI definitions
- Uses existing `AnalyticsView` infrastructure

---

## 6. Forms (V1)

### 6.1 Asset Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | Asset display name |
| `type` | select (AssetType) | Yes | Asset classification |
| `location` | select (Location) | Yes | Physical location |
| `serial_number` | string | No | Manufacturer serial |
| `description` | text | No | Additional details |

### 6.2 Service Visit Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `asset` | select (Asset) | No | Optional asset link |
| `location` | select (Location) | Yes | Service location |
| `technician` | select (User) | Yes | Assigned technician |
| `scheduled_date` | date | Yes | Visit date |
| `scheduled_start_time` | time | No | Expected start |
| `scheduled_end_time` | time | No | Expected end |
| `checklist_template` | select | No | Pre-defined checklist |
| `notes` | text | No | Manager notes |
| `maintenance_category` | select | No | Service category |

### Form Restrictions

| Field | Status | Rationale |
|-------|--------|-----------|
| SLA fields | **NOT INCLUDED** | V2+ feature |
| Warranty fields | **NOT INCLUDED** | V2+ feature |
| Priority field | **NOT INCLUDED** | V2+ feature |
| Estimated duration | **NOT INCLUDED** | V2+ feature |
| Parts/materials | **NOT INCLUDED** | V2+ feature |

---

## 7. Reporting (V1)

### 7.1 Allowed Reports

| Report | Description | Format |
|--------|-------------|--------|
| Asset Service History | List of visits per asset | Table / PDF |
| Visit Completion Status | Completed vs pending vs overdue | Summary |
| Basic Counts | Open, completed, overdue visits | Dashboard widget |
| Visit Detail Report | Single visit evidence + checklist | PDF |

### 7.2 Not Allowed (V1)

| Report Type | Status | Belongs To |
|-------------|--------|------------|
| Contract tracking | **FORBIDDEN** | V2+ |
| Warranty tracking | **FORBIDDEN** | V2+ |
| SLA enforcement reports | **FORBIDDEN** | V2+ |
| Multi-asset dependency graphs | **FORBIDDEN** | V2+ |
| Predictive maintenance | **FORBIDDEN** | V2+ |
| Cost analysis | **FORBIDDEN** | V2+ |
| Technician performance | **FORBIDDEN** | V2+ (uses existing analytics) |

---

## 8. Explicitly NOT Included in V1

The following features are **explicitly excluded** from Maintenance Context V1:

| Feature | Rationale |
|---------|-----------|
| Reactive ticket workflows (dispatch, incident intake, escalation) | Requires workflow engine — belongs to V2+ |
| Recurring scheduling engine | Requires new scheduling infrastructure |
| SLA tiers | Requires SLA engine modification |
| Warranty tracking | Requires contract management system |
| Service contracts | Requires billing integration |
| Inventory tracking | Out of scope (asset management) |
| Spare parts management | Out of scope (inventory) |
| Asset depreciation | Out of scope (finance) |
| Compliance logs | Requires compliance framework |
| Enterprise analytics | Beyond current analytics engine |
| Priority/severity system | Requires workflow engine |
| Escalation workflows | Requires notification engine |
| Multi-technician visits | Requires assignment engine |
| Approval workflows | Requires workflow engine |

> **These features belong to Maintenance V2+.**

> **Maintenance v1 does not introduce reactive ticket workflows.**

---

## 9. Context Boundary Rules

### 9.1 Maintenance Context CANNOT

| Action | Status |
|--------|--------|
| Modify Platform Layer | **FORBIDDEN** |
| Modify Billing semantics | **FORBIDDEN** |
| Change RBAC matrix | **FORBIDDEN** |
| Introduce new auth types | **FORBIDDEN** |
| Duplicate Job model | **FORBIDDEN** |
| Create alternative lifecycles | **FORBIDDEN** |
| Modify Proof Engine | **FORBIDDEN** |
| Change error response format | **FORBIDDEN** |

### 9.2 Maintenance Context CAN

| Action | Status |
|--------|--------|
| Add Asset-related models | **ALLOWED** |
| Add nullable FK to Job | **ALLOWED** |
| Add maintenance-specific UI pages | **ALLOWED** |
| Add checklist templates | **ALLOWED** |
| Filter existing views by context | **ALLOWED** |
| Add vocabulary/labels layer | **ALLOWED** |

---

## 10. Roadmap (Future, Not Implemented)

The following features are planned for future versions:

### V2 Candidates

- Periodic/recurring scheduling
- SLA timers and enforcement
- Warranty expiration tracking
- Service contract management
- Priority/severity classification

### V3+ Candidates

- Asset lifecycle management
- Predictive maintenance
- Inventory integration
- Compliance framework
- Multi-company asset sharing

> **These are NOT part of V1 implementation.**
> No code or infrastructure should be added to support these features in V1.

---

## 11. Verification Checklist

Before Maintenance Context V1 is considered complete:

- [ ] Asset CRUD endpoints implemented
- [ ] Asset list/detail pages functional
- [ ] Service Visit form includes asset field
- [ ] Visit list filters by maintenance context
- [ ] Dashboard shows maintenance widgets
- [ ] No Platform Layer modifications
- [ ] No new lifecycle states
- [ ] No new roles
- [ ] `verify_roles.sh` still passes
- [ ] Existing Cleaning context unaffected

---

## 12. Change Policy

Any modification to this scope document requires:

1. Version bump (v1.0 → v1.1)
2. Changelog entry
3. Review against Platform Layer invariants
4. Update to DOCS_INDEX.md

**Breaking scope changes** require:

- Version bump to V2
- New scope document
- Architecture review

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.1 | 2026-02-14 | Add anti-ticketing guardrails (reactive dispatch, incident intake explicitly forbidden) |
| 1.0 | 2026-02-14 | Initial V1 scope definition |

---

**END OF DOCUMENT**
