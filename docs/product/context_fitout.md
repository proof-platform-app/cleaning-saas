# Operational Context — Construction & Fit-out

## 1. Context Definition

Construction & Fit-out is an **operational context** of Proof Platform focused on verifying **physical progress and on-site execution** during capital works, renovations, and interior fit-out projects.

In Proof Platform terms, fit-out is **not project management software** and not a replacement for tools like Procore or MS Project.
It is an **evidence and reporting layer** that produces objective, time-stamped proof of on-site progress.

This context applies the Proof Platform verification engine to environments where:

* work spans weeks or months,
* multiple contractors operate on the same site,
* progress claims must be verified,
* disputes arise over timelines, scope, and completion status.

---

## 2. Primary Users

### Primary

* Construction management companies
* Fit-out contractors
* Developers

### Secondary

* Property owners
* Investors
* Consultants and supervisors

### End users

* Site supervisors
* Engineers
* Project coordinators

The platform assumes site users need **fast, constrained capture of evidence**, not complex project tooling.

---

## 3. Verified Visit Model

A valid fit-out visit is defined as:

* one physical site visit
* tied to a specific project and phase
* performed by an authorized contractor or supervisor
* producing evidence of work progress or site condition

Each visit represents a **verifiable snapshot of progress** at a point in time.

Progress is proven through **accumulated evidence over time**, not through self-reported completion percentages.

---

## 4. Mandatory Evidence

For a fit-out visit to be accepted, the following evidence is mandatory:

* GPS-validated check-in at the project site
* Timestamped visit record
* Photos showing progress, completed elements, or site conditions
* Phase or milestone attribution

Evidence:

* cannot be altered after completion
* is permanently linked to the visit
* forms the basis for progress reporting and dispute resolution

Missing evidence invalidates the visit for reporting purposes.

---

## 5. Progress Structure & Punch Lists

Progress is structured around **milestones and phases**, not tasks.

### Progress characteristics:

* milestones represent contractual or operational checkpoints
* visits may contribute partial progress to a milestone
* completion is inferred from evidence accumulation

### Punch lists:

* outstanding issues captured as evidence-backed items
* status tracked across visits
* responsibility attribution optional

Proof Platform **does not**:

* manage project schedules,
* allocate resources,
* replace contractor coordination tools.

---

## 6. Reporting Semantics

Reports in the fit-out context serve as **progress verification artifacts**.

A report must answer:

* which project and phase was visited
* when progress was documented
* what was completed or observed
* what evidence supports the progress claim

Reports are:

* generated per milestone or reporting period
* suitable for investors, owners, and audits
* structured to support claims of completion or delay

Reports do not substitute formal certificates or payment approvals.

---

## 7. SLA Interpretation

In the fit-out context, SLA interpretation focuses on:

* adherence to inspection or reporting schedules
* completeness of required evidence per phase
* responsiveness to punch list items

SLA does **not** evaluate:

* construction quality in engineering terms,
* cost overruns,
* contractor performance beyond documented visits.

Violations indicate **lack of verifiable progress**, not project failure.

---

## 8. What This Context Does NOT Change

Construction & Fit-out does **not** modify Proof Platform core rules:

* lifecycle remains `scheduled → in_progress → completed`
* proof engine is unchanged
* audit trail and immutability rules fully apply
* no project-specific lifecycles are introduced

This context is a **capital-works configuration** of the same verification standard, not a standalone construction product.

---

## 9. Core Value Delivered

Construction & Fit-out extends Proof Platform into capital projects:

> **Replacing subjective progress claims with objective, time-indexed evidence.**

This context enables transparency, investor confidence, and defensible progress reporting without turning the platform into a PM tool.

---

## Status

* Document type: Operational Context Profile
* Scope: Construction & Fit-out
* Dependency: PROOF_PLATFORM_VISION.md
* Change policy: Update only when progress-proof semantics or reporting rules change
