# Layer 5 — Scale & Enterprise Readiness (Direction Only)

⚠️ **Direction-only document**

This document is **not** a roadmap, PRD, or implementation plan.

Layer 5 defines:
- strategic direction for scale,
- value boundaries for Pro / Enterprise tiers,
- and principles for enterprise readiness.

Nothing in this document represents:
- current product state,
- committed scope,
- delivery timelines,
- or guaranteed features.

---

## Purpose of Layer 5

Layer 5 describes **meaningful scale capabilities**, not feature expansion for its own sake.

Its goal is to reduce:
- operational friction,
- human overhead,
- risk and ambiguity,

as customer volume, team size, and contractual expectations grow.

Layer 5 is intentionally **not part of the MVP**.  
It exists to define a **clean, logical path** from an operational product
to higher-value customers and pricing tiers.

---

## When to use this document

Refer to this document when:

- evaluating whether a new idea fits the long-term product direction;
- deciding if a capability belongs to Standard, Pro, or Enterprise tiers;
- explaining CleanProof value to larger customers or partners;
- preventing scope creep disguised as “enterprise needs”;
- aligning product capabilities with pricing and positioning.

Do **not** use this document for:
- sprint planning,
- task definition,
- API or UX specifications,
- implementation decisions.

---

## 0. Trial, Usage & Pre-Billing Architecture  
### Foundation for Scale

Before introducing enterprise capabilities, CleanProof establishes a **strict separation between operational truth and commercial logic**.

### Source of truth

- Trial state, expiration, and usage metrics are calculated **only on the backend**.
- Frontend consumes a single aggregated endpoint:
  - `GET /api/cleanproof/usage-summary/`
- UI never infers trial or plan state locally.

### What exists today

- Trial lifecycle:
  - start → active → expired
- Usage visibility:
  - jobs created today
  - active cleaners
  - soft-limits exposed to UI
- UX enforcement:
  - informational banners
  - upgrade CTAs
  - limited hard-blocking (e.g. job creation after trial expiry)

### Why this matters for scale

This foundation allows CleanProof to:

- add billing (Stripe / Paddle) **without rewriting business logic**;
- introduce enforcement gradually;
- support multiple pricing tiers cleanly;
- avoid hidden coupling between UI and billing rules.

Layer 5 builds **on top of this foundation**, not around it.

---

## 1. Operational Analytics (Decision-Oriented)

Analytics must answer **concrete operational questions**, not provide vanity dashboards.

### Core metric categories

- Job completion without issues  
- Proof compliance (before / checklist / after)  
- Planned vs actual job duration  
- Cleaner reliability indicators (derived from behavior, not manual scoring)  
- Locations with repeated issues  

### Purpose

- Enable managerial decisions  
- Justify product value  
- Tie CleanProof to measurable business outcomes  

Analytics at scale exists to **support decisions**, not to impress.

---

## 2. SLA & Exception Management

Introduce structured exception detection to reduce manual investigations.

### Examples

- Late check-in / check-out  
- Missing or invalid proof  
- Incomplete checklist  

Jobs may be classified as:

- OK  
- At Risk  
- Violated  

### Purpose

- Prevent disputes  
- Reduce internal escalations  
- Make issues visible before clients complain  

---

### micro-SLA v2 — Time-Based Context & Repeated Violations  
*(Future extension, not MVP)*

micro-SLA v2 extends basic SLA flags with **temporal context and behavioral patterns**.

This layer:
- does **not** introduce contractual enforcement;
- exists to support coaching, quality management, and escalation logic.

micro-SLA v2 is intentionally **out of scope for MVP**.

---

#### Time-based context

SLA violations gain **time deltas**, not just binary states.

Examples:

- Check-in late by X minutes  
- Job completed after scheduled end time  
- After photo uploaded X minutes after check-out  

This enables distinction between:
- minor delays,
- systematic timing issues,
- critical breaches.

All calculations are backend-only.  
Frontend displays read-only context.

---

#### Repeated violations (pattern detection)

Introduce rolling-window aggregation:

- Cleaner has N violations in last X days  
- Consecutive jobs missing proof  
- Repeated violations by location  

This transforms SLA from single-job auditing into **behavioral insight**.

No automatic actions are triggered.  
Decision-making remains human.

---

#### Explicit constraints

micro-SLA v2 **does not include**:

- automatic penalties;
- job blocking;
- scoring systems;
- AI-based judgment.

The goal is **visibility and clarity**, not automation.

---

#### Pricing alignment

- **Standard** — micro-SLA v1 (status + reasons)  
- **Pro** — time-based context + repeated violations  
- **Enterprise** — configurable rules and reporting windows  

SLA sophistication scales with customer maturity.

---

## 3. Performance Reports (Management-Level)

Reports serve stakeholders who may not use the product daily.

### Examples

- Weekly summaries  
- Monthly performance overviews  
- Cleaner and location snapshots  

### Delivery formats

- PDF  
- Email  

### Purpose

- Keep leadership informed  
- Increase perceived product value  
- Reduce manual reporting overhead  

---

## 4. Audit Exports & Legal Readiness

Support formal audit and compliance scenarios.

### Examples

- Full job proof export (PDF / ZIP)  
- Audit trail export (CSV / PDF)  
- Timestamped, immutable proof artifacts  

### Purpose

- Enterprise readiness  
- Legal defensibility  
- Higher ARPU justification  

---

## 5. Hierarchy & Role Expansion

Support organizational growth beyond a single manager.

### Examples

- Company → branches → locations  
- Roles:
  - Owner  
  - Regional manager  
  - Site manager  

### Purpose

- Access control at scale  
- Data isolation  
- Operational clarity  

---

## 6. Integrations (Reactive, Not Prescriptive)

Focus on outbound integrations only.

### Examples

- Webhooks (job completed, job failed, proof missing)  
- CSV exports  
- Basic REST access  

### Purpose

- Allow integration with existing systems  
- Avoid tight coupling with third-party platforms  

---

## Explicitly Out of Scope for Layer 5

The following are intentionally excluded due to low ROI:

- AI-based photo quality scoring  
- Automated quality judgments without ground truth  
- Real-time dashboards  
- “Smart recommendations” without validated data  

Layer 5 exists to **protect scalability**, not to increase complexity.

---

## Layer 5 × Pricing Alignment

Layer 5 capabilities are **not baseline features**.

They represent enterprise readiness and are intentionally tied to higher pricing tiers.

---

## Standard Plan — Operational Proof (Core)

### Target customer

- Small to mid-size teams  
- Owner-managed or single-manager operations  

### Focus

- Proof of work  
- Operational correctness  

Advanced optimization is intentionally excluded.

---

## Pro Plan — Operational Control & Visibility

### Target customer

- Growing teams  
- Multi-cleaner, multi-location operations  

### Value proposition

> “Not just proof — control and insight.”

Pro reduces:
- investigations,
- escalations,
- reporting overhead.

---

## Enterprise (Future Tier) — Scale & Compliance

### Target customer

- Large operators  
- Compliance-driven organizations  

### Directional capabilities

- Role hierarchy  
- Branch-level access control  
- Integrations  
- Custom audit formats  
- SLA configuration per location  

Enterprise pricing is:
- custom,
- contract-based,
- value-driven.

---

## Pricing Philosophy

- Proof of work is baseline  
- Insight, control, and risk reduction are premium  
- Price increases are justified by:
  - expanded visibility,
  - reduced operational cost,
  - enterprise readiness.

---

## Why This Matters

Layer 5 ensures:

- clean upgrade paths;
- clear value separation;
- no need to invent features to raise price;
- confidence when selling to larger customers.

It protects CleanProof from becoming
“feature-rich but direction-poor”
as the product scales.
