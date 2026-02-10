# Proof Platform — Extension Strategy (v1)

## Purpose
This document defines **which additional products can be built on top of the existing Proof-of-Work engine**, beyond Cleaning, **without modifying the core backend logic**.

The goal is to:
- protect the integrity of the core engine,
- prevent product sprawl,
- give a clear decision framework for future products.

This document is **additive** and does not change any existing Cleaning product scope.

---

## Platform Structure

The platform is a single proof-of-work engine with multiple product frontends.

**Planned structure (routing-level):**

- `proof.company/` → shared entry point (explains "we prove work was done")
- `proof.company/cleaning` → Cleaning product (existing)
- `proof.company/property` → Property / Apartment Management
- `proof.company/maintenance` → Maintenance / Handyman Services
- `proof.company/site-visits` → Site Visits / Fit-out / Subcontractors

Rules:
- One backend, one database, one engine
- Each path behaves like a separate product (own messaging, UI copy, and onboarding)
- No cross-visibility between products for end-users

---

## Core Engine (Immutable)

The platform is built around a single immutable proof-of-work engine.

**Fixed principles:**
- One work order = one physical visit
- GPS check-in / check-out (single capture)
- Exactly one BEFORE photo and one AFTER photo
- Checklist snapshot per work order
- Fixed lifecycle: scheduled → in_progress → completed
- PDF report as the final artifact
- Offline-first mobile execution

These rules apply to **all products** built on this engine.
No exceptions per vertical.

---

## What Defines a Valid Extension Product

A new product may be added **only if all conditions below are true**:

1. The problem is solved by **proof**, not automation
2. A single visit is sufficient to close a unit of work
3. GPS + photos + checklist + PDF are sufficient evidence
4. No real-time tracking is required
5. No custom workflows are required
6. The customer is B2B

If any condition fails → the product must not be added.

---

## Approved Extension Products

### 1. Property / Apartment Management

**Who:**
- Property managers
- Rental management companies
- Owners with multiple units

**Use case:**
- Send technician to fix an issue
- Verify that the issue was resolved
- Close the request with proof

**Why it fits:**
- One issue → one visit
- Strong need for documentation
- No need for automation or analytics

---

### 2. Maintenance / Handyman Services

**Who:**
- Handyman companies
- Electrical / plumbing SMBs
- Maintenance contractors

**Use case:**
- Perform a service visit
- Prove work was completed
- Send professional service report

**Why it fits:**
- Proof builds trust
- Replaces WhatsApp photo chaos
- Same lifecycle as Cleaning

---

### 3. Site Visits / Fit-out / Subcontractors

**Who:**
- Fit-out companies
- Construction subcontractors
- Site supervisors

**Use case:**
- Site inspection or minor work
- Confirm presence and progress
- Provide visit report to client

**Why it fits:**
- Focus on visit confirmation, not project management
- Does not compete with PM tools
- Same proof mechanics apply

---

## Explicitly Rejected Extensions

The following categories must NOT be added:

- Full construction project management
- Security patrols with routes or real-time tracking
- Logistics or delivery tracking
- Field sales / merchandising audits
- B2C use cases
- Any product requiring multiple photo rules per vertical

If a product requires:
- different photo counts,
- different lifecycle rules,
- conditional logic per industry,

→ it violates the platform principles.

---

## Photo Policy (Platform-Wide)

- The platform supports exactly:
  - 1 BEFORE photo
  - 1 AFTER photo
- This rule is immutable across all products

Future evolution (if ever) must:
- apply to all products equally
- preserve backward compatibility
- not introduce per-vertical conditions

---

## Product Rollout Order (Recommended)

1. Cleaning (existing product)
2. Property / Apartment Management
3. Maintenance / Handyman Services
4. Site Visits / Fit-out

Products are added **sequentially**, never in parallel.

---

## Platform Structure

The platform is organized as a **single backend engine** with multiple **product surfaces**.

### Logical Structure

```
Proof Platform
│
├── Core Engine (shared)
│   ├── Work Orders
│   ├── GPS Check-in / Check-out
│   ├── Photo Proof (Before / After)
│   ├── Checklist Snapshot
│   ├── PDF Generation
│   └── Offline Sync
│
├── Product Surfaces (separate UX & positioning)
│   ├── Cleaning
│   ├── Property Management
│   ├── Maintenance Services
│   └── Site Visits / Fit-out
│
└── Marketing & Entry Points
    ├── proof.company            (platform overview)
    ├── proof.company/cleaning   (CleanProof)
    ├── proof.company/property   (Property Managers)
    ├── proof.company/maintenance
    └── proof.company/site-visits
```

### Structural Rules

- Core Engine is **shared and immutable**
- Product Surfaces:
  - share the same backend and database
  - differ only in UI language, onboarding, examples, and positioning
- No product introduces custom backend logic
- No conditional logic based on product type exists in the backend

---

## Guiding Principle

> The platform exists to prove work was done — not to manage how work is done.

If a proposed feature or product blurs this line, it must be rejected.

---

**Status:** Active
**Audience:** Internal (Founder / Development)
**Changes:** Only with explicit architectural decision

