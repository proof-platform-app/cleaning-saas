# Proof Platform — Structural Overview (v1)

## Purpose
This document provides a **compact structural view** of the Proof Platform.
It exists as a quick reference for architecture, product boundaries, and future expansion.

This file complements `PROOF_PLATFORM_EXTENSION.md` and contains **no product logic**.

---

## High-Level Concept

The Proof Platform is a **single proof-of-work backend engine** exposed through multiple **product-specific frontends**.

Each product:
- targets a different customer segment,
- uses its own terminology and messaging,
- shares the same immutable execution engine.

---

## Routing / Product Surfaces

```
proof.company/
│
├── /                → Platform overview ("We prove work was done")
│
├── /cleaning        → Cleaning (CleanProof)
├── /property        → Property / Apartment Management
├── /maintenance     → Maintenance / Handyman Services
├── /site-visits     → Site Visits / Fit-out / Subcontractors
```

Each route behaves as a **standalone product** from the user perspective.

---

## Logical Architecture

```
                   ┌──────────────────────────┐
                   │        Core Engine        │
                   │  (shared, immutable)     │
                   └───────────┬──────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌──────────────┐      ┌────────────────┐     ┌────────────────┐
│   Cleaning   │      │   Property     │     │  Maintenance   │
│   Product    │      │   Product      │     │   Product      │
└──────────────┘      └────────────────┘     └────────────────┘
                               │
                       ┌────────────────┐
                       │  Site Visits   │
                       │    Product     │
                       └────────────────┘
```

---

## Core Engine Responsibilities (Shared)

- Work Order lifecycle
- GPS check-in / check-out
- Photo proof (Before / After)
- Checklist snapshot
- PDF report generation
- Offline-first execution

The Core Engine has **no knowledge of product type or industry**.

---

## Product Surface Responsibilities

Each product surface controls:
- terminology (e.g. Job vs Work Order)
- UI labels and empty states
- onboarding text and examples
- marketing positioning

Each product surface **does NOT** control:
- business logic
- lifecycle rules
- validation rules
- database structure

---

## Structural Rules (Non-Negotiable)

1. One backend, one database
2. No conditional backend logic per product
3. No per-product lifecycle differences
4. No per-product photo rules
5. Products are added sequentially, never in parallel

---

## Mental Model

> One engine. Multiple lenses.

If a new idea requires changing the engine for only one lens — it is rejected.

---

**Status:** Reference
**Audience:** Internal
**Changes:** Only by explicit architectural decision

