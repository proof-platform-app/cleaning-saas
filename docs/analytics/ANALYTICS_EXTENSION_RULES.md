# Analytics Extension Rules — Proof Platform

## Purpose

This document defines **strict rules for extending the Analytics layer** in Proof Platform.

Its goal is to ensure that Analytics remains:
- operational,
- read-only,
- proof-derived,
- non-prescriptive.

This is a **guardrail document**, not a design guide.

If an Analytics proposal conflicts with this file, the proposal must be rejected.

---

## 1. What Analytics Is (Reminder)

Analytics in Proof Platform exists to:

- summarize executed, immutable proof data;
- reveal operational stability or instability;
- surface systemic signals.

Analytics does NOT exist to:
- manage people,
- optimize processes,
- recommend actions,
- forecast outcomes.

Analytics is a mirror, not a decision-maker.

---

## 2. Allowed Types of Analytics Extensions

An Analytics extension is allowed **only if** it fits into one of these categories:

### 2.1 New Aggregation
- same data sources,
- different grouping (by date, location, context, SLA reason).

### 2.2 New View of Existing Metrics
- alternative breakdowns,
- different time windows,
- comparative periods of equal length.

### 2.3 Cross-Dimension Correlation
- e.g. SLA violations by location AND context,
- without interpretation or conclusions.

No other extension types are permitted.

---

## 3. Explicitly Forbidden Analytics Extensions

The following are **hard rejections**:

### 3.1 Predictive or Forward-Looking Analytics
- forecasts,
- trends with extrapolation,
- “expected performance”.

### 3.2 Scoring and Ranking Systems
- composite scores,
- weighted ratings,
- gamification,
- “best / worst” labeling beyond raw counts.

### 3.3 Recommendations or Prescriptions
- “what to fix”,
- “who to retrain”,
- “where to optimize”.

### 3.4 Workflow or Automation Logic
- alerts that trigger actions,
- auto-flagging with consequences,
- changes to execution behavior.

### 3.5 Analytics as a Product
- BI dashboards,
- executive storytelling,
- revenue or business KPIs,
- operational advice.

If an extension resembles BI — it is invalid.

---

## 4. Data Source Constraints

Analytics extensions may use **only**:

- completed jobs (`status = completed`);
- immutable proof artifacts;
- SLA status and reasons;
- actual execution timestamps.

Analytics must NEVER:
- use scheduled times for metrics;
- include in-progress jobs;
- infer missing data.

---

## 5. Context-Agnostic Requirement

Every Analytics extension must:

- work across **all operational contexts**;
- remain valid if industry labels are removed;
- rely only on proof semantics, not domain logic.

If an extension only “makes sense” for one context,
it is not an Analytics extension — it is rejected.

---

## 6. Implementation Boundary

An Analytics extension must be implementable as:

- a read-only backend endpoint,
- without changes to:
  - execution logic,
  - SLA computation,
  - database schema,
  - lifecycle rules.

If code changes are required outside Analytics aggregation,
the proposal is invalid.

---

## 7. Validation Checklist (Mandatory)

Before approving any Analytics extension, all answers must be **YES**:

1. Is this purely derived from existing proof data?
2. Does it avoid predictions, recommendations, or scoring?
3. Can it be explained as “operational signal” only?
4. Does it work identically for all contexts?
5. Does it preserve Analytics as read-only?

If any answer is **NO**, stop immediately.

---

## 8. Relationship to Other Documents

This document:
- depends on `PROOF_PLATFORM_VISION.md`,
- enforces `MASTER_CONTEXT_ANALYTICS.md`,
- complements `CONTEXT_RULES.md`.

It does NOT:
- define API contracts,
- define UI layouts,
- define future roadmap.

---

## Final Rule

> **If Analytics starts telling people what to do,
> it has already gone too far.**

Proof Platform Analytics exists to **expose facts**, not to manage operations.

---

## Status

- Document type: Canonical Guardrail
- Scope: All Analytics extensions
- Authority: PROOF_PLATFORM_VISION.md
- Change policy: Extremely rare, architectural
