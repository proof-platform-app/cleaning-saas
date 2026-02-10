# Operational Context — Property Management

## 1. Context Definition

Property Management is an **operational context** of Proof Platform focused on creating a **verifiable, time-indexed history of property condition** through structured inspections and site visits.

In Proof Platform terms, property management is **not asset management software** and not a CRM.
It is a **documentation and verification layer** that records factual state of properties at specific moments in time.

This context applies the Proof Platform verification engine to environments where:

* property condition must be provable,
* disputes arise over "what condition it was in",
* inspections are legally or contractually relevant,
* historical accuracy matters more than operational speed.

---

## 2. Primary Users

### Primary

* Property management companies
* Asset managers
* Real estate operators

### Secondary

* Property owners
* Investors
* Legal and compliance teams

### End users

* Inspectors
* Property managers

The platform assumes inspections may be performed infrequently but must be **defensible months or years later**.

---

## 3. Verified Visit Model

A valid property visit is defined as:

* one physical inspection at a defined property or unit
* performed by an authorized inspector
* at a specific point in time
* with structured evidence per inspection scope
* recorded as an immutable historical snapshot

Each visit represents a **point-in-time state**, not an ongoing workflow.

Repeated inspections create a **timeline of condition**, not updates to a mutable record.

---

## 4. Mandatory Evidence

For an inspection to be accepted, the following evidence is mandatory:

* GPS-validated check-in at property or unit
* Timestamped visit record
* Photos covering all required inspection zones
* Condition ratings or classifications where applicable

Evidence:

* cannot be modified after completion
* remains permanently linked to the inspection
* forms the basis for audits, disputes, and handovers

Incomplete evidence invalidates the inspection.

---

## 5. Inspection Structure & Scoring

Inspections use **structured templates**, not free-form notes.

### Template characteristics:

* property-type specific (residential, commercial, mixed-use)
* predefined inspection zones
* required photo evidence per zone

### Condition scoring:

* numeric or categorical ratings
* optional severity flags
* consistent semantics across inspections

Scoring reflects **observed condition**, not remediation or responsibility.

---

## 6. Reporting Semantics

Reports in the property context serve as **legal and operational records**.

A report must answer:

* what property or unit was inspected
* when the inspection occurred
* what the observed condition was
* what evidence supports these observations

Reports are:

* immutable
* chronologically ordered
* suitable for handover, audits, and due diligence

Reports are treated as **records of fact**, not recommendations.

---

## 7. SLA Interpretation

In the property context, SLA interpretation focuses on:

* inspection timeliness
* completeness of inspection scope
* adherence to inspection schedules
* evidence coverage requirements

SLA does **not** evaluate repair quality or remediation outcomes.

Violations indicate **process failure**, not asset failure.

---

## 8. What This Context Does NOT Change

Property Management does **not** alter Proof Platform core rules:

* lifecycle remains `scheduled → in_progress → completed`
* proof engine remains unchanged
* evidence immutability is enforced
* audit trail applies fully

This context is a **configuration of verification semantics**, not a new product.

---

## 9. Core Value Delivered

Property Management extends Proof Platform into long-term asset accountability:

> **Creating a defensible digital memory of property condition over time.**

This context emphasizes historical accuracy, legal defensibility, and audit readiness.

---

## Status

* Document type: Operational Context Profile
* Scope: Property Management
* Dependency: PROOF_PLATFORM_VISION.md
* Change policy: Update only when inspection semantics or proof requirements change
