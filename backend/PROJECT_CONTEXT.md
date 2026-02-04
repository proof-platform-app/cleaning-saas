# PROJECT_CONTEXT.md

### Cleaning SaaS / CleanProof

**Architecture, Context & Implementation History**

> ⚠️ **Important**
> This document provides **architectural context, design rationale, and implementation history**.
>
> It is **NOT** the source of truth for the current project status.
>
> The authoritative snapshot of what is implemented *right now* lives in:
> **`PROJECT_STATE.md`**
>
> This document changes **rarely** and should only be updated when
> architectural principles, constraints, or core assumptions change.

---

## Project Overview

CleanProof is a **backend-first Cleaning SaaS** built for operational control
and proof of work in the UAE market.

The product solves:

* verification that work was actually performed,
* quality control,
* dispute resolution through hard evidence
  (GPS, photos, audit trail, PDF reports).

The system is designed around **proof**, not task management.

---

## Product Components

The project consists of three integrated but clearly separated parts:

* **Django Backend (API-first)** — execution, proof, and enforcement core
* **Manager Portal (Web)** — planning, control, verification
* **Mobile Cleaner App (Expo / React Native)** — on-site execution

Each component is independently testable and deployable,
but bound by strict API contracts.

---

## Roles

### Cleaner

* sees assigned jobs (Today Jobs),
* performs check-in / check-out,
* completes checklist,
* uploads before / after photos,
* generates PDF proof (via backend).

### Manager

* plans jobs via Job Planning,
* assigns cleaners,
* monitors execution,
* reviews photos, checklist, audit trail,
* downloads or emails PDF reports.

---

## Architecture (Fixed)

### Django Apps

**apps.accounts**

* User
* Company
* Roles: manager / cleaner

**apps.locations**

* Location
* ChecklistTemplate
* ChecklistTemplateItem

**apps.jobs**

* Job
* JobChecklistItem (snapshot)
* JobCheckEvent
* File
* JobPhoto

**apps.api**

* DRF API
* auth
* jobs
* checklist
* photos
* pdf
* manager endpoints (planning, meta, create job)

Architecture is intentionally **API-first**
and shared across web and mobile clients.

---

## Layered Architecture (Conceptual)

> These layers describe **structure and intent**, not progress.
> Actual implementation status is tracked in `PROJECT_STATE.md`.

### Layer 0 — Core Execution
Backend + Manager Portal

### Layer 1 — Execution
Mobile Cleaner App

### Layer 2 — Management
Admin / Manager extensions

### Layer 3 — Commerce
Plans, trial, billing

### Layer 4 — Marketing
Landing, pricing, demo, updates

### Layer 5 — Scale
Analytics, SLA, exports, enterprise features

---

## Execution Model (Key Concepts)

### Jobs

* lifecycle: `scheduled → in_progress → completed`
* immutable proof once completed
* all actions produce audit events

### Proof of Work

Every job execution step produces verifiable evidence:

* GPS validation,
* timestamps,
* checklist state,
* photos,
* audit trail.

If proof is missing — the step is invalid.

---

## Checklist Snapshot Logic

* `ChecklistTemplate` is copied into `JobChecklistItem` at job creation.
* Templates are immutable during execution.
* Snapshot guarantees historical integrity
  even if templates change later.

---

## GPS & Location Handling

* GPS validation enforced on check-in and check-out.
* Distance threshold enforced server-side.
* EXIF GPS used for photo validation.
* Missing EXIF allowed but flagged (`exif_missing`).

Location coordinates are treated as **source of truth**, not addresses.

---

## Photos

* Exactly one `before` and one `after` photo per job.
* `after` is forbidden without `before`.
* Images normalized to JPEG for consistency.
* Stored deterministically per company / job / type.

---

## PDF Reports

* Generated on demand via backend.
* Uses the same data as UI (single source of truth).
* Includes:
  * job summary,
  * timestamps,
  * checklist,
  * audit trail.
* Photo embedding planned for a future iteration.

---

## Mobile Cleaner App — Implementation Notes

### Execution Flow

Login → Today Jobs → Job Details →  
Check-in → Photos → Checklist → Check-out → PDF

### Guard Rails

* Only assigned cleaner can act.
* Only valid status transitions allowed.
* Required checklist enforced before check-out.
* Completed jobs become read-only.

### GPS (Production)

* Dedicated GPS wrapper (`utils/gps.ts`)
* DEV vs PROD behavior separated
* Permissions handled explicitly
* Backend distance validation is authoritative

---

## Known Constraints (Intentional)

The following limitations are **conscious scope decisions**, not omissions:

* No S3 / object storage (local `MEDIA_ROOT`)
* No background jobs (sync operations)
* No offline-first behavior (architecture prepared)
* No admin UI for:
  * locations,
  * checklist templates,
  * job history,
  * recurring jobs.

These constraints protect execution stability and clarity.

---

## Marketing Pages (Context Only)

Public pages implemented for CleanProof:

* Landing
* Pricing
* Product Updates
* Contact
* Demo Request

They are informational only:

* no public signup,
* no automated trial,
* demo and contact are manual entry points.

---

## Historical Notes

* Job Planning significantly extended the original MVP.
* Mobile execution flow reached a stable end-to-end state.
* Multiple stabilization phases were required for camera and navigation.
* Architecture is now considered stable enough for commercial iteration.

---

## Usage Guidance

Use this document to understand:

* *why* the system is built this way,
* architectural constraints and invariants,
* relationships between components,
* which limitations are intentional.

For current implementation status, always refer to:
**`PROJECT_STATE.md`**

---

## Final Note

CleanProof is no longer a prototype.

It is a **real operational system** with:

* strict execution rules,
* legal-grade proof artifacts,
* and a clear path to monetization.

The primary risk is no longer technical —
it is **scope creep**.

Keep execution tight.
