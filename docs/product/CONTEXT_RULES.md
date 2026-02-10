# Operational Context Rules — Proof Platform

## Purpose of This Document

This document defines **strict rules for creating, evolving, and validating operational contexts** within Proof Platform.

Its goal is to ensure that:

* the platform does not fragment into products,
* the core verification engine remains intact,
* new contexts remain configurations, not special cases.

This document acts as a **guardrail**, not a guideline.

---

## 1. Definition: What an Operational Context Is

An operational context is:

* a **semantic configuration** of the Proof Platform verification engine
* a way to interpret the same proof mechanics in a specific business domain
* a controlled vocabulary layered on top of immutable core behavior

An operational context is **not**:

* a product
* a module
* a backend feature set
* a separate lifecycle
* a fork of business logic

If a proposed context requires any of the above, it must be rejected.

---

## 2. Mandatory Structure of Every Context Profile

Every context **must** be documented using the following sections:

1. Context Definition
2. Primary Users
3. Verified Visit Model
4. Mandatory Evidence
5. Domain-Specific Structure (Checklist / Inspection / Progress)
6. Reporting Semantics
7. SLA Interpretation
8. What This Context Does NOT Change
9. Core Value Delivered
10. Status

Any context that cannot be expressed within this structure is invalid.

---

## 3. Core Invariants (Non-Negotiable)

Every operational context **must preserve** the following invariants:

* lifecycle: `scheduled → in_progress → completed`
* one visit = one proofable physical event
* immutable evidence after completion
* audit trail applies uniformly
* reports derived exclusively from proof data

Contexts may not:

* introduce alternative lifecycles
* allow partial completion
* modify evidence rules
* redefine what "completion" means

---

## 4. Allowed Dimensions of Variation

Contexts are allowed to differ **only** along these axes:

* terminology (job, visit, inspection, service)
* checklist or template structure
* required vs optional evidence fields
* report wording and emphasis
* SLA interpretation logic

Variation outside these dimensions is forbidden.

---

## 5. Forbidden Changes (Hard Stops)

A context must be rejected if it requires:

* context-specific backend conditionals
* context-specific database schemas
* separate execution engines
* duplicated analytics logic
* independent pricing logic

If a feature is requested by only one context, it must:

* either generalize to all contexts,
* or be implemented as optional configuration,
* or be rejected entirely.

---

## 6. Evaluation Checklist for New Contexts

Before approving a new context, all answers below must be **YES**:

1. Can it use the existing proof engine without modification?
2. Does it preserve evidence immutability?
3. Does it follow the standard lifecycle?
4. Can its value be explained without mentioning new features?
5. Does it strengthen the platform’s standard of proof?

If any answer is **NO**, the context is invalid.

---

## 7. Relationship to Other Documents

Context profiles:

* depend on `PROOF_PLATFORM_VISION.md`
* must not contradict Vision principles
* must remain consistent with `API_CONTRACTS.md`

Context profiles:

* do not define API contracts
* do not define implementation details
* do not describe UI layouts

---

## 8. Change Policy

Context profiles may change only when:

* proof semantics change
* SLA interpretation changes
* mandatory evidence rules change

They may **not** change due to:

* UI redesigns
* internal refactors
* sales positioning updates

All context changes must be reviewed against this document.

---

## Final Rule

> **If a proposed context feels like a new product, it is wrong.**

Proof Platform grows by deepening a single standard of proof — not by multiplying products.

---

## Status

* Document type: Canonical Guardrail
* Scope: All operational contexts
* Authority: PROOF_PLATFORM_VISION.md
* Change policy: Extremely rare, explicit, architectural
