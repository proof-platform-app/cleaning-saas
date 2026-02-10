# Operational Context — Maintenance Services

## 1. Context Definition

Maintenance Services is an **operational context** of Proof Platform focused on verifying **technical service work** performed on building systems and assets (HVAC, electrical, plumbing, elevators, IT infrastructure, etc.).

In Proof Platform terms, maintenance is **not a ticketing system** and not full CMMS.
It is a **proof-of-work layer** that answers: *"Which service visits were actually performed, on which assets, and with what evidence?"*

This context applies the Proof Platform verification engine to environments where:

* work is event-driven (service requests, scheduled maintenance),
* technical quality is hard to assess remotely,
* SLA penalties and disputes are common,
* multiple contractors may work under one SLA framework.

---

## 2. Primary Users

### Primary

* Maintenance contractors and service companies
* Facilities management companies
* FM / Operations managers responsible for SLA

### Secondary

* Enterprise clients (owners / tenants / corporate FM)
* Procurement and contract management teams

### End users

* Field technicians
* Supervisors / team leads

The platform assumes technicians may be:

* time-pressured,
* not deeply technical in software,
* but required to produce **credible, consistent service evidence**.

---

## 3. Verified Visit Model

A valid maintenance visit is defined as:

* one physical service visit to a site or asset
* triggered by a request or scheduled plan
* performed by a technician with clear responsibility
* with evidence linking actions to specific assets or systems

Each visit represents **work performed on one or more assets**, but is still treated as a **single proofable event**.

Visits do not model the entire lifecycle of a ticket. They model **the fact and content of physical intervention**.

---

## 4. Mandatory Evidence

For a maintenance visit to be accepted, the following evidence is mandatory:

* GPS-validated check-in at the correct site
* Timestamped visit record (check-in and completion)
* Photos of relevant assets / components **before and after** intervention
* Minimal structured description of work performed

Optionally (when configured):

* parts / materials used
* asset identifiers

Evidence:

* remains immutable after completion,
* is permanently attached to the visit,
* is the primary source for SLA metrics and service reports.

Missing core evidence results in a **non-compliant** or **failed** visit.

---

## 5. Service Structure & Technical Details

Maintenance visits may reference:

* one or more assets,
* one or more issues or failure types,
* one or more service actions.

However, Proof Platform **does not**:

* orchestrate full ticket lifecycle,
* manage spare parts inventory,
* calculate technician pay.

### Structured fields may include:

* asset identifiers or locations
* issue type or fault category
* resolution type (temporary fix / permanent repair / not resolved)
* severity or impact classification

These fields exist to **enrich the proof**, not to turn the system into CMMS.

---

## 6. Reporting Semantics

Reports in the maintenance context serve as **service verification artifacts**.

A report must answer:

* what site and assets were serviced
* when the visit occurred
* what was observed
* what actions were taken
* what evidence supports these claims

Reports are:

* generated per visit or per period (e.g. monthly service summary),
* suitable for client review and dispute resolution,
* structured to align with contractual obligations (SLA wording, asset lists).

Reports **do not** replace engineering documentation or OEM service logs.

---

## 7. SLA Interpretation

In the maintenance context, SLA evaluation focuses on:

* response time (from request / scheduled window to visit)
* completion timeliness (where defined)
* proof of intervention (not just ticket closure)
* adherence to required evidence per SLA

SLA does **not** judge:

* long-term asset reliability,
* vendor selection,
* internal budgeting.

Violations highlight **service process failures** (late or non-compliant visits), not engineering design issues.

---

## 8. What This Context Does NOT Change

Maintenance Services does **not** modify Proof Platform core principles:

* lifecycle remains `scheduled → in_progress → completed`
* proof engine is unchanged
* audit trail and immutability rules fully apply
* no alternative lifecycles per asset or ticket

This context is a **technical-services configuration** of the same verification standard, not a separate maintenance product.

---

## 9. Core Value Delivered

Maintenance Services extends Proof Platform into technical operations:

> **Turning "we did the job" into verifiable service evidence tied to assets and SLAs.**

This context strengthens trust between service providers and enterprise clients while keeping the platform focused on proof, not operations management.

---

## Status

* Document type: Operational Context Profile
* Scope: Maintenance Services
* Dependency: PROOF_PLATFORM_VISION.md
* Change policy: Update only when service-proof semantics or SLA interpretation changes
