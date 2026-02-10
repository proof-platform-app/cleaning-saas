# Operational Context — Commercial Cleaning

## 1. Context Definition

Commercial Cleaning is an **operational context** of Proof Platform focused on verifying routine and recurring cleaning work at commercial facilities.

In Proof Platform terms, cleaning is **not a service workflow**, but a sequence of **verified physical visits** performed according to predefined standards and accepted only when objective proof exists.

This context applies Proof Platform’s verification engine to environments where:

* work is frequent and repetitive,
* quality is hard to assess remotely,
* disputes are common,
* trust is a contractual requirement.

---

## 2. Primary Users

### Primary

* Owners / Directors of cleaning companies
* Operations managers
* Quality control managers

### Secondary

* Facility managers (client side)
* Procurement / compliance teams

### End users

* Cleaners
* Supervisors

The platform assumes **low technical literacy** for end users and enforces correctness through constraints, not training.

---

## 3. Verified Visit Model

A valid cleaning visit is defined as:

* one physical presence of a cleaner or supervisor
* at a predefined location
* within an allowed time window
* with mandatory evidence captured
* completed according to checklist rules

A visit is **not accepted** unless all mandatory proof requirements are satisfied.

Cleaning jobs are always treated as **discrete visits**, even when they occur daily at the same location.

---

## 4. Mandatory Evidence

For a cleaning visit to be accepted, the following evidence is mandatory:

* GPS check-in within location boundary
* Timestamped check-in and check-out
* Before and after photos (per required zones)
* Completed mandatory checklist items

Evidence is:

* immutable after completion
* attached permanently to the visit
* used as the basis for reports and SLA evaluation

Missing or invalid evidence results in a **failed or flagged visit**, not a partial success.

---

## 5. Checklist Logic

Checklists represent **cleaning standards**, not task suggestions.

### Checklist characteristics:

* location-type specific (office, restroom, lobby, kitchen, etc.)
* contain mandatory and optional items
* enforce completeness before completion

### Rules:

* mandatory items cannot be skipped
* incomplete checklists block job completion
* checklist structure is predefined by management

Checklist completion is treated as **proof of performed actions**, not self-reported intent.

---

## 6. Reporting Semantics

Reports in the cleaning context serve as **proof artifacts**, not operational summaries.

A report must answer:

* who performed the cleaning
* where and when it was performed
* what was cleaned
* what evidence supports this

Reports are:

* generated automatically
* immutable
* branded per client
* suitable for audit and dispute resolution

Reports replace informal proof channels such as WhatsApp photos or emails.

---

## 7. SLA Interpretation

In the cleaning context, SLA evaluation focuses on:

* on-time arrival
* minimum time-on-site
* completeness of required evidence
* frequency adherence (where applicable)

Violations are detected **algorithmically**, not manually.

SLA results are derived from proof data and presented transparently to both operator and client.

---

## 8. What This Context Does NOT Change

Commercial Cleaning does **not** modify or override any Proof Platform core rules:

* lifecycle remains `scheduled → in_progress → completed`
* proof engine remains unchanged
* audit trail rules apply fully
* evidence immutability is enforced

This context is a **configuration of the platform**, not a specialization of its logic.

---

## 9. Core Value Delivered

Commercial Cleaning demonstrates the platform’s foundational value:

> **Turning invisible routine work into verifiable, auditable proof.**

This context establishes the baseline standard against which all other operational contexts are measured.

---

## Status

* Document type: Operational Context Profile
* Scope: Commercial Cleaning
* Dependency: PROOF_PLATFORM_VISION.md
* Change policy: Update only when business rules or proof semantics change
